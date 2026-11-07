/*
 * Pruebas del sitio ya construido: `npm test` construye dist/ y lo prueba con el Chrome instalado.
 * Las capturas quedan en test-results/capturas/.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import jsQRmod from "jsqr";
import { chromium } from "playwright";
import { PNG } from "pngjs";

const jsQR = jsQRmod.default || jsQRmod;
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUERTO = 3210;
const BASE = `http://localhost:${PUERTO}`;
const CAPTURAS = join(RAIZ, "test-results", "capturas");
const TOURS = ["/", "/baja-california-sur/", "/chiapas/"];
const PAGINAS = [...TOURS, "/english/"];
const ANCHOS = [[360, 640], [390, 844], [768, 1024], [1024, 768], [1440, 900]];
const LIMITE_IMAGEN_KB = 400;
const LIMITE_PORTADA_KB = 120; // AVIF de 768 px, la que descarga un celular

const entorno = {};
vm.runInNewContext(readFileSync(join(RAIZ, "public/assets/js/tours-config.js"), "utf8"), { window: entorno });
const config = entorno.TOURS_CONFIG;
assert.ok(config, "no se pudo leer tours-config.js");

// Textos exactos acordados: se comparan aquí a propósito, para detectar cambios accidentales en la configuración.
const WA = {
  general: { es: "Hola, vi la página de SpectaCulTours y me gustaría recibir informes de los tours.", en: "Hi! I saw the SpectaCulTours website and I'd like more information about the tours." },
  loreto: { es: "Hola, me interesa el tour de ballena azul en Loreto, BCS. ¿Me pueden dar informes?", en: "Hi! I'm interested in the Blue Whale tour in Loreto, BCS. Could you send me more information?" },
  lagos: { es: "Hola, me interesa el tour a Lagos de Colón, Chiapas. ¿Me pueden dar informes?", en: "Hi! I'm interested in the Lagos de Colón, Chiapas tour. Could you send me more information?" },
  fast: { es: "Hola, vi la página de FAST English y me gustaría recibir informes de las clases.", en: "Hi! I saw the FAST English website and I'd like information about the classes." },
};
const urlWa = (m) => `https://wa.me/525530071808?text=${encodeURIComponent(m)}`;

let servidor, navegador;

before(async () => {
  mkdirSync(CAPTURAS, { recursive: true });
  servidor = spawn(process.execPath, [join(RAIZ, "scripts/servir.mjs"), join(RAIZ, "dist"), String(PUERTO)], { stdio: "ignore" });
  for (let i = 0; ; i++) {
    try {
      await fetch(BASE);
      break;
    } catch (e) {
      if (i > 40) throw e;
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  navegador = await chromium.launch({ channel: "chrome" });
});

after(async () => {
  await navegador?.close();
  servidor?.kill();
});

async function conPagina(opciones, fn) {
  const { width = 390, height = 844, locale = "en-US", dpr } = opciones;
  const movil = width < 500;
  const c = await navegador.newContext({ viewport: { width, height }, deviceScaleFactor: dpr || (movil ? 2 : 1), isMobile: movil, hasTouch: movil, locale });
  const p = await c.newPage();
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  try {
    await fn(p);
    assert.deepEqual(errores, [], "errores de JavaScript en la página");
  } finally {
    await c.close();
  }
}

async function ir(p, ruta) {
  await p.goto(BASE + ruta);
  await p.waitForLoadState("networkidle");
}

const centrar = (p, sel) =>
  p.evaluate(async (s) => {
    const r = document.querySelector(s).getBoundingClientRect();
    scrollTo({ top: r.top + scrollY + Math.min(r.height / 2, 200) - innerHeight / 2, behavior: "instant" });
    await new Promise((ok) => setTimeout(ok, 120));
  }, sel);

const decodificar = (png) => {
  const i = PNG.sync.read(png);
  return jsQR(new Uint8ClampedArray(i.data), i.width, i.height)?.data;
};

test("capturas y sin scroll horizontal en cada ancho", async () => {
  for (const [width, height] of ANCHOS) {
    await conPagina({ width, height }, async (p) => {
      for (const ruta of PAGINAS) {
        await ir(p, ruta);
        // Recorre la página para que carguen las imágenes diferidas y aparezcan las animaciones.
        await p.evaluate(async () => {
          for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.7) {
            scrollTo({ top: y, behavior: "instant" });
            await new Promise((ok) => setTimeout(ok, 90));
          }
          scrollTo({ top: 0, behavior: "instant" });
        });
        await p.waitForLoadState("networkidle");
        await p.waitForTimeout(250);
        assert.equal(await p.evaluate(() => document.documentElement.scrollWidth), width, `${ruta} a ${width} px`);
        const nombre = ruta === "/" ? "inicio" : ruta.replaceAll("/", "");
        await p.screenshot({ path: join(CAPTURAS, `${width}-${nombre}.png`), fullPage: true });
      }
    });
  }
});

test("QR y WhatsApp no se enciman ni tapan botones, en todo el recorrido", async () => {
  for (const [width, height] of ANCHOS) {
    await conPagina({ width, height }, async (p) => {
      for (const ruta of PAGINAS) {
        await ir(p, ruta);
        await p.waitForTimeout(150);
        const r = await p.evaluate(async () => {
          const qr = document.querySelector("#qrAbrir");
          const wa = document.querySelector(".wa-fab__btn, .wa__fab");
          let choques = 0;
          const tapados = new Set();
          for (let y = 0; y < document.documentElement.scrollHeight; y += Math.round(innerHeight * 0.37)) {
            scrollTo({ top: y, behavior: "instant" });
            await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
            const a = qr.getBoundingClientRect();
            const v = wa.getBoundingClientRect();
            const qrVisible = !qr.hidden && !qr.classList.contains("qr--oculto");
            if (qrVisible && a.left < v.right && a.right > v.left && a.top < v.bottom && a.bottom > v.top) choques++;
            for (const b of document.querySelectorAll(".btn, .linkbtn")) {
              const t = b.getBoundingClientRect();
              if (!t.width || t.bottom < 72 || t.top > innerHeight || getComputedStyle(b).visibility === "hidden") continue;
              const cx = (t.left + t.right) / 2;
              const cy = (t.top + t.bottom) / 2;
              // El QR no toca ningún botón; el botón flotante de WhatsApp no llega a su centro.
              if (qrVisible && a.left < t.right && a.right > t.left && a.top < t.bottom && a.bottom > t.top) tapados.add(b.textContent.trim().slice(0, 30));
              if (b.closest(".wa-fab, .wa")) continue;
              if (cx > v.left && cx < v.right && cy > v.top && cy < v.bottom) tapados.add("WA: " + b.textContent.trim().slice(0, 30));
            }
          }
          return { choques, tapados: [...tapados] };
        });
        assert.equal(r.choques, 0, `${ruta} a ${width}: QR sobre WhatsApp`);
        assert.deepEqual(r.tapados, [], `${ruta} a ${width}: botones tapados`);
      }
    });
  }
});

test("el QR decodifica exactamente a qrUrl, compacto y ampliado", async () => {
  assert.equal(config.qrUrl, "https://spectacultours.mx");
  for (const [width, height, dpr] of [[390, 844, 2], [1440, 900, 1]]) {
    await conPagina({ width, height, dpr }, async (p) => {
      for (const ruta of ["/", "/english/"]) {
        await ir(p, ruta);
        // Sobre un botón el QR se reduce a propósito: la tarjeta se prueba donde se muestra completa.
        const hayTarjeta = await p.evaluate(async () => {
          const qr = document.querySelector("#qrAbrir");
          for (let y = 0; y < document.documentElement.scrollHeight; y += 120) {
            scrollTo({ top: y, behavior: "instant" });
            await new Promise((ok) => setTimeout(ok, 60));
            if (!qr.hidden && !qr.classList.contains("qr--mini") && !qr.classList.contains("qr--oculto")) return true;
          }
          return false;
        });
        assert.ok(hayTarjeta, `${ruta} a ${width}: el QR nunca se muestra completo`);
        await p.waitForTimeout(250);
        assert.equal(decodificar(await p.locator("#qrAbrir img").screenshot()), config.qrUrl, `compacto ${ruta} a ${width}`);
        await p.locator("#qrAbrir").click();
        await p.waitForTimeout(200);
        assert.equal(decodificar(await p.locator(".qr-modal__codigo").screenshot()), config.qrUrl, `ampliado ${ruta} a ${width}`);
        await p.keyboard.press("Escape");
        await p.waitForTimeout(100);
        assert.ok(await p.evaluate(() => document.querySelector("#qrModal").hidden), "Esc cierra el modal");
      }
    });
  }
});

// [idioma del navegador, parámetro, idioma esperado del mensaje]. Regla: español si eligió español o si su navegador es español.
const CASOS_WA = [["en-US", "", "en"], ["es-MX", "", "es"], ["en-US", "?lang=es", "es"], ["es-MX", "?lang=en", "es"], ["fr-FR", "", "en"]];

test("WhatsApp lleva el mensaje correcto en cada contexto e idioma", async () => {
  for (const [locale, qs, idioma] of CASOS_WA) {
    await conPagina({ locale }, async (p) => {
      const caso = `${locale} ${qs}`;
      await ir(p, "/" + qs);
      assert.equal(await p.getAttribute(".wa-fab__btn", "href"), urlWa(WA.general[idioma]), `${caso} flotante del inicio`);
      assert.equal(await p.getAttribute(".t-nav__cta", "href"), urlWa(WA.general[idioma]), `${caso} encabezado`);
      for (const [ruta, clave] of [["/baja-california-sur/", "loreto"], ["/chiapas/", "lagos"]]) {
        await ir(p, ruta + qs);
        const hrefs = await p.evaluate(() => [...new Set([...document.querySelectorAll("[data-wa]")].map((a) => decodeURIComponent(a.href.split("text=")[1])))]);
        assert.deepEqual(hrefs, [WA[clave][idioma]], `${caso} ${ruta}`);
        assert.equal(await p.getAttribute(".wa-fab__btn", "href"), urlWa(WA[clave][idioma]), `${caso} ${ruta} flotante`);
        await centrar(p, "#ballena, #how");
        assert.equal(await p.getAttribute(".wa-fab__btn", "href"), urlWa(WA[clave][idioma]), `${caso} ${ruta} flotante a media página`);
      }
      await ir(p, "/english/" + qs);
      const hola = await p.evaluate(() => [...document.querySelectorAll("[data-wa='wa.hello']")].map((a) => decodeURIComponent(a.href.split("text=")[1])));
      assert.ok(hola.length > 0 && hola.every((m) => m === WA.fast[idioma]), `${caso} inglés`);
    });
  }
});

test("el botón de fecha manda el tour y el rango de esa fecha", async () => {
  await conPagina({ locale: "en-US" }, async (p) => {
    await p.clock.setFixedTime(new Date("2026-11-06T12:00:00"));
    await ir(p, "/baja-california-sur/");
    const mensaje = () => p.evaluate(() => decodeURIComponent(document.querySelector(".fecha a").href.split("text=")[1]));
    assert.equal(await mensaje(), "Hi! I'm interested in the Blue Whales / Constitución tour, Thu, Jan 28 – Tue, Feb 2, 2027. Are there spots available?");
    await ir(p, "/baja-california-sur/?lang=es");
    assert.equal(await mensaje(), "Hola, me interesa el tour Ballena azul / Constitución del jue 28 ene – mar 2 feb 2027. ¿Hay lugares disponibles?");
  });
});

test("el botón de traducción se ve en móvil sin abrir el menú, y traduce", async () => {
  for (const [width, height] of ANCHOS.slice(0, 2)) {
    await conPagina({ width, height }, async (p) => {
      for (const ruta of PAGINAS) {
        await ir(p, ruta);
        const b = await p.evaluate(() => {
          const r = document.querySelector("#langToggle").getBoundingClientRect();
          const encima = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
          return { top: r.top, right: r.right, width: r.width, libre: !!encima?.closest("#langToggle"), lang: document.documentElement.lang };
        });
        assert.ok(b.width > 0 && b.top < 80 && b.right <= width && b.libre, `${ruta} a ${width}`);
        assert.equal(b.lang, "en", "abre en inglés sin elección guardada");
        await p.locator("#langToggle").tap();
        await p.waitForTimeout(80);
        assert.equal(await p.evaluate(() => document.documentElement.lang), "es");
        assert.equal(await p.locator("#qrAbrir span").textContent(), "Escanéame");
        // Se recuerda al volver: dejamos el estado limpio para la siguiente página.
        await p.reload();
        await p.waitForLoadState("networkidle");
        assert.equal(await p.evaluate(() => document.documentElement.lang), "es", "recuerda la elección");
        await p.evaluate(() => localStorage.removeItem("fast-lang"));
      }
    });
  }
});

test("los iframes de YouTube no existen hasta el clic", async () => {
  await conPagina({ width: 1280, height: 800 }, async (p) => {
    const pedidos = [];
    p.on("request", (r) => pedidos.push(r.url()));
    for (const ruta of PAGINAS) {
      await ir(p, ruta);
      assert.equal(await p.locator("iframe").count(), 0, ruta);
    }
    assert.ok(!pedidos.some((u) => /youtube(-nocookie)?\.com/.test(u)), "ninguna petición a YouTube antes del clic");
    await ir(p, "/baja-california-sur/");
    await p.locator("#ballena [data-video]").first().click();
    await p.waitForSelector("iframe");
    const src = await p.getAttribute("iframe", "src");
    assert.match(src, /^https:\/\/www\.youtube-nocookie\.com\/embed\/LyiDEUgSIAs\?/);
    await p.keyboard.press("Escape");
    await p.waitForTimeout(200);
    assert.equal(await p.locator("iframe").count(), 0, "al cerrar se quita el reproductor");
  });
});

test("el título de la portada se ve completo en móvil", async () => {
  for (const [width, height] of ANCHOS.slice(0, 2)) {
    await conPagina({ width, height }, async (p) => {
      for (const ruta of TOURS.slice(1)) {
        await ir(p, ruta);
        const portadas = await p.evaluate(async () => {
          const salida = [];
          for (const i of document.querySelectorAll(".portada img")) {
            scrollTo({ top: i.getBoundingClientRect().top + scrollY - 80, behavior: "instant" });
            await new Promise((ok) => setTimeout(ok, 60));
            const r = i.getBoundingClientRect();
            const [x1, y1, x2, y2] = i.dataset.titulo.split(",").map(Number);
            const puntos = [[x1, y1], [x2, y1], [x1, y2], [x2, y2], [(x1 + x2) / 2, (y1 + y2) / 2]];
            const estorban = puntos
              .map(([x, y]) => document.elementFromPoint(Math.min(r.left + x * r.width, innerWidth - 1), r.top + y * r.height))
              .filter((e) => e !== i && !e?.closest("#qrAbrir.qr--mini"))
              .map((e) => e?.className || e?.tagName);
            salida.push({ razon: r.width / r.height / (i.naturalWidth / i.naturalHeight), ajuste: getComputedStyle(i).objectFit, izq: r.left, der: r.right, estorban });
          }
          return salida;
        });
        assert.ok(portadas.length > 0, ruta);
        for (const f of portadas) {
          assert.ok(Math.abs(f.razon - 1) < 0.01, `${ruta} a ${width}: imagen deformada o recortada (${f.razon})`);
          assert.notEqual(f.ajuste, "cover", `${ruta} a ${width}: object-fit cover`);
          assert.ok(f.izq >= 0 && f.der <= width + 0.5, `${ruta} a ${width}: se sale de la pantalla`);
          assert.deepEqual(f.estorban, [], `${ruta} a ${width}: algo tapa el título`);
        }
      }
    });
  }
});

test("el inicio es solo un menú de tres opciones del mismo nivel", async () => {
  const destinos = ["/baja-california-sur/", "/chiapas/", "/english/"];
  for (const [width, height] of ANCHOS) {
    await conPagina({ width, height }, async (p) => {
      await ir(p, "/");
      await p.waitForTimeout(150);
      const m = await p.evaluate(() => {
        const tarjetas = [...document.querySelectorAll(".menu-card")];
        return {
          hijos: [...document.querySelector("main").children].filter((e) => !e.classList.contains("sr-only")).map((e) => e.className),
          hrefs: tarjetas.map((a) => new URL(a.href).pathname),
          anchos: tarjetas.map((a) => Math.round(a.getBoundingClientRect().width)),
          altos: tarjetas.map((a) => Math.round(a.getBoundingClientRect().height)),
          arriba: tarjetas.map((a) => Math.round(a.getBoundingClientRect().top)),
          imagenes: tarjetas.map((a) => { const i = a.querySelector("picture img"); return i.currentSrc && i.complete && i.naturalWidth > 0; }),
          videos: document.querySelectorAll("main [data-video]").length,
        };
      });
      assert.deepEqual(m.hijos, ["menu__lista"], `a ${width}`);
      assert.deepEqual(m.hrefs, destinos, `a ${width}`);
      assert.equal(new Set(m.anchos).size, 1, `mismo ancho a ${width}: ${m.anchos}`);
      assert.equal(new Set(m.altos).size, 1, `mismo alto a ${width}: ${m.altos}`);
      assert.equal(m.videos, 0);
      assert.ok(m.imagenes.every(Boolean), `imágenes cargadas a ${width}`);
      if (width >= 700) assert.equal(new Set(m.arriba).size, 1, `en una fila a ${width}: ${m.arriba}`);
    });
  }
  // Cada opción abre su página, y el mismo orden de tarjetas se mantiene al traducir.
  await conPagina({ width: 1280, height: 800 }, async (p) => {
    for (const [i, destino] of destinos.entries()) {
      await ir(p, "/");
      await p.locator(".menu-card").nth(i).click();
      await p.waitForLoadState("networkidle");
      assert.equal(new URL(p.url()).pathname, destino);
    }
  });
});

test("en el menú los títulos de portada quedan completos y el QR no tapa el texto", async () => {
  for (const [width, height] of [...ANCHOS.slice(0, 2), ANCHOS[2]]) {
    await conPagina({ width, height }, async (p) => {
      for (const qs of ["", "?lang=es"]) {
        await ir(p, "/" + qs);
        const r = await p.evaluate(async () => {
          const salida = { recortes: [], tapados: new Set() };
          for (const i of document.querySelectorAll(".menu-card img[data-titulo]")) {
            const c = i.getBoundingClientRect();
            const escala = Math.max(c.width / i.naturalWidth, c.height / i.naturalHeight);
            const ancho = i.naturalWidth * escala, alto = i.naturalHeight * escala;
            const [x1, y1, x2] = i.dataset.titulo.split(",").map(Number);
            // Recorte centrado a lo ancho y desde arriba a lo alto: fracción de la imagen que queda fuera.
            const fueraArriba = (alto - c.height) / alto, fueraLado = (ancho - c.width) / 2 / ancho;
            if (y1 < fueraArriba || x1 < fueraLado - 0.05 || x2 > 1 - fueraLado + 0.05) salida.recortes.push(i.alt.slice(0, 20));
          }
          const qr = document.querySelector("#qrAbrir"), wa = document.querySelector(".wa-fab__btn");
          const cruza = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
          for (let y = 0; y < document.documentElement.scrollHeight; y += 40) {
            scrollTo({ top: y, behavior: "instant" });
            await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
            for (const t of document.querySelectorAll(".menu-card__ir span")) {
              const c = t.getBoundingClientRect();
              if (!qr.classList.contains("qr--oculto") && cruza(qr.getBoundingClientRect(), c)) salida.tapados.add("QR: " + t.textContent);
              if (cruza(wa.getBoundingClientRect(), c)) salida.tapados.add("WA: " + t.textContent);
            }
          }
          salida.tapados = [...salida.tapados];
          return salida;
        });
        assert.deepEqual(r.recortes, [], `título recortado a ${width}`);
        assert.deepEqual(r.tapados, [], `texto tapado a ${width} ${qs}`);
      }
    });
  }
});

test("las secciones generales y los videos quedaron en las páginas de destino", async () => {
  const VIDEOS = {
    "/baja-california-sur/": ["yHEhVtaQTCU", "u6-13JBzBnw", "Jfmey-9Bryg", "YUBHNW9maCE", "LyiDEUgSIAs"],
    "/chiapas/": ["eMT7oFmcI5Y", "Jn5JNxnwb3E", "fA2r2_qjHhE"],
  };
  await conPagina({ width: 1280, height: 800 }, async (p) => {
    for (const [ruta, ids] of Object.entries(VIDEOS)) {
      await ir(p, ruta);
      const r = await p.evaluate(() => ({
        ids: [...document.querySelectorAll("[data-video]")].map((b) => b.dataset.video),
        secciones: ["#why", "#how", "#compare", "#fechas", "#packages"].map((s) => document.querySelectorAll(s).length),
        aSiMisma: [...document.querySelectorAll("#compare a")].filter((a) => a.pathname === location.pathname).length,
        ballena: document.querySelectorAll("#ballena").length,
      }));
      for (const id of ids) assert.ok(r.ids.includes(id), `${ruta}: falta el video ${id}`);
      assert.deepEqual(r.secciones, [1, 1, 1, 1, 1], ruta);
      assert.equal(r.aSiMisma, 0, `${ruta}: la comparativa no enlaza a la misma página`);
      assert.equal(r.ballena, ruta === "/baja-california-sur/" ? 1 : 0, `${ruta}: ballena`);
    }
  });
});

test("presupuesto de peso por imagen", () => {
  const manifiesto = JSON.parse(readFileSync(join(RAIZ, "imagenes.manifest.json"), "utf8"));
  const excedidas = [];
  for (const [clave, d] of Object.entries(manifiesto)) {
    for (const v of [...Object.values(d.variantes).flat(), ...(d.visor ? [d.visor] : [])]) {
      if (v.bytes > LIMITE_IMAGEN_KB * 1024) excedidas.push(`${v.ruta}: ${Math.round(v.bytes / 1024)} KB`);
    }
    if (clave.includes("/portadas/")) {
      const v = d.variantes.avif.find((x) => x.w === 768);
      if (v.bytes > LIMITE_PORTADA_KB * 1024) excedidas.push(`portada ${v.ruta}: ${Math.round(v.bytes / 1024)} KB`);
    }
  }
  assert.deepEqual(excedidas, []);
});

test("[DESTINO] nunca se ve ni se manda por WhatsApp", async () => {
  await conPagina({}, async (p) => {
    await p.clock.setFixedTime(new Date("2026-11-06T12:00:00"));
    for (const ruta of PAGINAS) {
      for (const qs of ["", "?lang=es"]) {
        await ir(p, ruta + qs);
        const r = await p.evaluate(() => ({
          texto: document.body.innerText,
          enlaces: [...document.querySelectorAll("a[href*='wa.me']")].map((a) => decodeURIComponent(a.href)),
        }));
        assert.ok(!/\[\s*DESTINO\s*\]/i.test(r.texto), `${ruta}${qs} texto`);
        assert.ok(!r.enlaces.some((u) => u.includes("DESTINO")), `${ruta}${qs} enlaces`);
      }
    }
  });
});

test("las fechas vencidas desaparecen y la sección se oculta sin fechas", async () => {
  await conPagina({ width: 1280, height: 800 }, async (p) => {
    const total = config.fechas.length;
    await p.clock.setFixedTime(new Date("2027-02-02T23:30:00"));
    await ir(p, "/baja-california-sur/");
    assert.equal(await p.locator(".fecha").count(), total, "la fecha sigue visible su último día");
    await p.clock.setFixedTime(new Date("2027-02-03T00:30:00"));
    await ir(p, "/baja-california-sur/");
    assert.equal(await p.locator(".fecha").count(), total - 1);
    await p.clock.setFixedTime(new Date("2030-01-01T12:00:00"));
    await ir(p, "/baja-california-sur/");
    assert.equal(await p.locator("#fechas").isVisible(), false);
  });
});

test("el CV: franja azul en móvil, solo botones traducidos, visor y PDF", async () => {
  await conPagina({}, async (p) => {
    const pedidos = [];
    p.on("request", (r) => pedidos.push(r.url()));
    await ir(p, "/english/");
    assert.ok(!pedidos.some((u) => /fast-english-cv|photoswipe/.test(u)), "el PNG y el visor se cargan al abrir");
    const f = await p.evaluate(() => {
      const fr = document.querySelector(".cv__franja");
      return { color: getComputedStyle(fr).backgroundColor, debajo: fr.getBoundingClientRect().top >= document.querySelector(".cv__principal").getBoundingClientRect().bottom - 1, sigue: document.querySelector("#cv").nextElementSibling.id };
    });
    assert.deepEqual(f, { color: "rgb(27, 30, 107)", debajo: true, sigue: "about" });
    const antes = await p.locator(".cv").textContent();
    await p.locator("#langToggle").tap();
    await p.waitForTimeout(80);
    assert.equal(await p.locator(".cv").textContent(), antes, "el CV queda en inglés");
    assert.equal(await p.locator("#cvVer").innerText(), "Ver CV completo");
    await p.locator("#cvVer").tap();
    await p.waitForSelector(".pswp__img");
    await p.waitForTimeout(500);
    const v = await p.evaluate(() => ({ ancho: [...document.querySelectorAll(".pswp__img")].find((i) => i.naturalWidth)?.naturalWidth, pdf: document.querySelector(".pswp__button--descarga")?.getAttribute("href"), texto: document.querySelector(".pswp__button--descarga")?.getAttribute("aria-label") }));
    assert.equal(v.ancho, 1700);
    assert.match(v.pdf, /fast-english-cv\.[0-9a-f]+\.pdf$/);
    assert.equal(v.texto, "Descargar PDF");
    const pdf = await fetch(new URL(v.pdf, BASE));
    assert.equal(pdf.headers.get("content-type"), "application/pdf");
  });
});

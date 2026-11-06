#!/usr/bin/env node
/*
 * Optimiza los logos de assets-originales/logos con SVGO y compara píxel a píxel
 * contra el original, renderizando ambos en Chrome. Falla si alguno cambia a la vista.
 *   npm run logos
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pixelmatch from "pixelmatch";
import { chromium } from "playwright";
import { PNG } from "pngjs";
import { optimize } from "svgo";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGEN = join(RAIZ, "assets-originales", "logos");
const DESTINO = join(RAIZ, "public", "assets", "img", "logos");
mkdirSync(DESTINO, { recursive: true });

const CONFIG = {
  multipass: true,
  floatPrecision: 6,
  plugins: [{ name: "preset-default" }],
};

const navegador = await chromium.launch({ channel: "chrome" });
const pagina = await navegador.newPage({ viewport: { width: 1600, height: 900 } });

async function foto(svg, fondo) {
  const datos = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  await pagina.setContent(`<body style="margin:0;background:${fondo}"><img id="l" src="${datos}" style="width:1600px;height:auto;display:block"></body>`);
  await pagina.waitForFunction(() => document.getElementById("l").complete);
  return PNG.sync.read(await pagina.locator("#l").screenshot());
}

let fallas = 0;
for (const nombre of readdirSync(ORIGEN).filter((f) => f.endsWith(".svg")).sort()) {
  const original = readFileSync(join(ORIGEN, nombre), "utf8");
  const salida = optimize(original, { ...CONFIG, path: nombre }).data;
  const fondo = nombre.includes("negativo") ? "#0c1b3a" : "#ffffff";
  const [a, b] = [await foto(original, fondo), await foto(salida, fondo)];
  const distintos = a.width === b.width && a.height === b.height
    ? pixelmatch(a.data, b.data, null, a.width, a.height, { threshold: 0.1 })
    : Infinity;
  const pct = (distintos / (a.width * a.height)) * 100;
  console.log(`${nombre}: ${original.length} -> ${salida.length} B, píxeles distintos ${distintos} (${pct.toFixed(4)} %)`);
  if (pct > 0.001) fallas++;
  writeFileSync(join(DESTINO, nombre), salida);
}
await navegador.close();
if (fallas) { console.error(`${fallas} logo(s) cambiaron a la vista`); process.exit(1); }

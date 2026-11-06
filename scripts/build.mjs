#!/usr/bin/env node
/*
 * Construye dist/ a partir de public/.
 *   - Expande cada <img> del manifiesto a <picture> con AVIF, WebP y JPG.
 *   - Pone hash a CSS, JS, fuentes y sprite para la caché inmutable de /static/.
 * No usa sharp: las imágenes ya vienen optimizadas en public/static/img.
 */
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLICO = join(RAIZ, "public");
const DIST = join(RAIZ, "dist");
const manifiesto = JSON.parse(readFileSync(join(RAIZ, "imagenes.manifest.json"), "utf8"));

// Ancho aproximado que ocupa cada imagen, para que el navegador elija la variante correcta.
const COL = "calc(100vw - 48px)";
const TAMANOS = {
  split: "(max-width: 900px) 100vw, 50vw",
  tile: `(max-width: 560px) ${COL}, (max-width: 1000px) calc(50vw - 32px), 290px`,
  "tile-big": `(max-width: 1000px) ${COL}, 590px`,
  mosaic: "(max-width: 980px) 58vw, 340px",
  gallery: `(max-width: 500px) ${COL}, (max-width: 1000px) 46vw, 290px`,
  dest: `(max-width: 900px) ${COL}, 540px`,
  "stay-full": `(max-width: 980px) ${COL}, 572px`,
  "stay-half": "(max-width: 980px) 48vw, 280px",
  avatar: "48px",
  thumb: "44px",
  cross: `(max-width: 760px) ${COL}, 590px`,
  extra: `(max-width: 980px) ${COL}, 560px`,
  "collage-main": "(max-width: 980px) 56vw, 340px",
  "collage-side": "(max-width: 980px) 42vw, 250px",
  about: `(max-width: 980px) min(560px, calc(100vw - 72px)), 568px`,
  cefr: `(max-width: 980px) ${COL}, 500px`,
  cert: "120px",
  portal: "(max-width: 860px) 42vw, 250px",
};
const MINIATURAS_YT = { "hqdefault.jpg": [480, 360], "mqdefault.jpg": [320, 180], "maxresdefault.jpg": [1280, 720] };

function listar(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? listar(p) : [p];
  });
}
const aUrl = (archivo) => "/" + relative(DIST, archivo).split(sep).join("/");
const conHash = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 10);

/* ---------- 1. Copia y assets con hash ---------- */
rmSync(DIST, { recursive: true, force: true });
cpSync(PUBLICO, DIST, { recursive: true, filter: (p) => basename(p) !== ".DS_Store" });
mkdirSync(join(DIST, "static", "a"), { recursive: true });

const mapa = new Map(); // /assets/css/tours.css -> /static/a/tours.abc123.css
function publicarConHash(archivo, contenido) {
  const buf = contenido ?? readFileSync(archivo);
  const ext = extname(archivo);
  const salida = `/static/a/${basename(archivo, ext)}.${conHash(buf)}${ext}`;
  writeFileSync(join(DIST, salida), buf);
  mapa.set(aUrl(archivo), salida);
  rmSync(archivo);
}

const todos = listar(DIST);
todos.filter((f) => f.endsWith(".woff2")).forEach((f) => publicarConHash(f));
todos.filter((f) => /[\\/]assets[\\/]img[\\/]icons\.svg$/.test(f)).forEach((f) => publicarConHash(f));
todos.filter((f) => /[\\/]assets[\\/]js[\\/].+\.js$/.test(f)).forEach((f) => publicarConHash(f));
todos.filter((f) => /[\\/]assets[\\/]css[\\/].+\.css$/.test(f)).forEach((f) => {
  const url = aUrl(f);
  const css = readFileSync(f, "utf8").replace(/url\((["']?)(?!data:|https?:)([^"')]+)\1\)/g, (m, q, ruta) => {
    const destino = mapa.get(posix.resolve(posix.dirname(url), ruta));
    if (!destino) throw new Error(`${url}: no encuentro ${ruta}`);
    return `url("${destino}")`;
  });
  publicarConHash(f, css);
});

/* ---------- 2. Imágenes ---------- */
const escapar = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const srcset = (lista) => lista.map((v) => `${v.ruta} ${v.w}w`).join(", ");
const mayor = (lista) => lista[lista.length - 1];
const claveDe = (ruta) => ruta.replace(/^\//, "").replace(/\?.*$/, "").replace(/\.[a-z0-9]+$/i, "");

function atributos(etiqueta) {
  const attrs = new Map();
  for (const m of etiqueta.matchAll(/([a-zA-Z_:][\w:.-]*)(?:="([^"]*)")?/g)) {
    if (m[1] !== "img") attrs.set(m[1], m[2] ?? "");
  }
  return attrs;
}
const serializar = (attrs) => [...attrs].map(([k, v]) => (v === "" && k !== "alt" ? k : `${k}="${v}"`)).join(" ");

function expandirImg(etiqueta, pagina, avisos, cargas) {
  const attrs = atributos(etiqueta);
  const src = attrs.get("src");
  if (!src || attrs.has("data-sin-picture")) { attrs.delete("data-sin-picture"); return `<img ${serializar(attrs)}>`; }

  if (/^https?:/.test(src)) {
    const yt = MINIATURAS_YT[src.split("/").pop()];
    if (yt && !attrs.has("width")) { attrs.set("width", String(yt[0])); attrs.set("height", String(yt[1])); }
    attrs.set("decoding", "async");
    if (!attrs.has("loading")) attrs.set("loading", "lazy");
    return `<img ${serializar(attrs)}>`;
  }

  const ruta = posix.resolve(posix.dirname(pagina), src.split("?")[0]);
  const datos = manifiesto[claveDe(ruta)];
  if (!datos) {
    if (!existsSync(join(DIST, ruta))) avisos.push(`${pagina}: imagen inexistente ${src}`);
    attrs.set("decoding", "async");
    return `<img ${serializar(attrs)}>`;
  }

  const preset = attrs.get("data-sizes");
  const sizes = TAMANOS[preset];
  if (!sizes) avisos.push(`${pagina}: ${src} sin data-sizes válido (${preset})`);
  attrs.delete("data-sizes");
  const prioritaria = attrs.has("data-lcp");
  attrs.delete("data-lcp");

  const { avif, webp, jpg } = datos.variantes;
  attrs.set("src", (jpg.find((v) => v.w === 768) || mayor(jpg)).ruta);
  attrs.set("srcset", srcset(jpg));
  attrs.set("sizes", sizes || "100vw");
  attrs.set("width", String(datos.width));
  attrs.set("height", String(datos.height));
  attrs.set("data-full", mayor(webp).ruta);
  if (!attrs.has("alt")) attrs.set("alt", "");
  if (prioritaria) {
    attrs.delete("loading");
    attrs.set("fetchpriority", "high");
    attrs.set("decoding", "async");
    cargas.push(`<link rel="preload" as="image" type="image/avif" imagesrcset="${srcset(avif)}" imagesizes="${escapar(sizes || "100vw")}" fetchpriority="high">`);
  } else {
    attrs.set("loading", "lazy");
    attrs.set("decoding", "async");
  }
  return `<picture><source type="image/avif" srcset="${srcset(avif)}" sizes="${escapar(sizes || "100vw")}"><source type="image/webp" srcset="${srcset(webp)}" sizes="${escapar(sizes || "100vw")}"><img ${serializar(attrs)}></picture>`;
}

/* ---------- 3. Páginas ---------- */
const avisos = [];
for (const archivo of listar(DIST).filter((f) => f.endsWith(".html"))) {
  const url = aUrl(archivo);
  const pagina = url.endsWith("/") ? url : url.replace(/[^/]*$/, "");
  let html = readFileSync(archivo, "utf8");
  const cargas = [];

  html = html.replace(/<img\b[^>]*>/g, (m) => expandirImg(m, pagina + "index.html", avisos, cargas));

  // Versión grande que abren los visores de fotos.
  html = html.replace(/\b(data-photo|data-full-src)="([^"]+)"/g, (m, attr, src) => {
    const datos = manifiesto[claveDe(posix.resolve(pagina, src))];
    if (!datos) { avisos.push(`${url}: ${attr} sin manifiesto: ${src}`); return m; }
    return `${attr === "data-photo" ? "data-photo" : "data-full"}="${mayor(datos.variantes.webp).ruta}"`;
  });

  // CSS, JS y sprite con hash.
  html = html.replace(/\b(href|src|data-icons)="([^"#?]+)(#[^"]*)?"/g, (m, attr, ruta, frag = "") => {
    if (/^[a-z]+:/i.test(ruta)) return m;
    const destino = mapa.get(posix.resolve(pagina, ruta));
    return destino ? `${attr}="${destino}${frag}"` : m;
  });

  if (cargas.length) html = html.replace(/(\s*)<link rel="stylesheet"/, `$1${cargas.join("$1")}$1<link rel="stylesheet"`);
  writeFileSync(archivo, html);
}

if (avisos.length) {
  console.error(avisos.join("\n"));
  process.exit(1);
}
console.log(`dist/ listo: ${mapa.size} assets con hash, ${Object.keys(manifiesto).length} imágenes en el manifiesto.`);

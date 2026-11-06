#!/usr/bin/env node
/*
 * Servidor local que imita a producción: Brotli en texto y los mismos encabezados de caché
 * que render.yaml. Uso: node scripts/servir.mjs [carpeta] [puerto]
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { brotliCompressSync, constants } from "node:zlib";

const raiz = resolve(process.argv[2] || "dist");
const puerto = Number(process.argv[3] || 3000);
const TIPOS = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml", ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif",
  ".woff2": "font/woff2", ".ico": "image/x-icon", ".pdf": "application/pdf",
};
const COMPRIMIBLE = new Set([".html", ".css", ".js", ".svg", ".json", ".xml", ".txt"]);
const cache = new Map();

createServer((req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let archivo = normalize(join(raiz, ruta));
  if (archivo !== raiz && !archivo.startsWith(raiz + sep)) { res.writeHead(403).end(); return; }
  if (existsSync(archivo) && statSync(archivo).isDirectory()) archivo = join(archivo, "index.html");
  if (!existsSync(archivo)) { res.writeHead(404, { "Content-Type": "text/plain" }).end("404"); return; }

  const ext = extname(archivo).toLowerCase();
  const cabeceras = {
    "Content-Type": TIPOS[ext] || "application/octet-stream",
    "Cache-Control": ruta.startsWith("/static/") ? "public, max-age=31536000, immutable" : "public, max-age=0, s-maxage=300",
  };
  let cuerpo = readFileSync(archivo);
  if (COMPRIMIBLE.has(ext) && /\bbr\b/.test(req.headers["accept-encoding"] || "")) {
    // La clave incluye la fecha del archivo para no servir HTML viejo tras reconstruir.
    const clave = `${archivo}:${statSync(archivo).mtimeMs}`;
    if (!cache.has(clave)) cache.set(clave, brotliCompressSync(cuerpo, { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } }));
    cuerpo = cache.get(clave);
    cabeceras["Content-Encoding"] = "br";
    cabeceras.Vary = "Accept-Encoding";
  }
  res.writeHead(200, cabeceras).end(cuerpo);
}).listen(puerto, () => console.log(`http://localhost:${puerto} -> ${raiz}`));

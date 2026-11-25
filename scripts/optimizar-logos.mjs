#!/usr/bin/env node
/*
 * Logos 3D del cliente: assets-originales/logos/*.webp (fondo blanco) → public/assets/img/logos/*.webp
 * con fondo transparente, recortados al contenido y al tamaño que usa el sitio (3x el más grande).
 *   npm run logos
 *
 * El blanco se convierte en transparencia ("color a alfa"): el metal conserva su color y la
 * sombra suave queda semitransparente, así el logo se ve igual sobre cualquier fondo claro.
 */
import { readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGEN = join(RAIZ, "assets-originales", "logos");
const DESTINO = join(RAIZ, "public", "assets", "img", "logos");

// Ancho publicado: el sitio muestra SpectaCulTours a ~180 px y FAST a ~200 px como máximo.
const ANCHO = { spectacultours_3d: 600, fast_3d: 640 };

async function aTransparente(archivo) {
  const { data, info } = await sharp(archivo).flatten({ background: "#fff" }).raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const salida = Buffer.alloc(w * h * 4);
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let i = 0, p = 0; i < w * h; i++, p += 3) {
    const [r, g, b] = [data[p], data[p + 1], data[p + 2]];
    // Lo casi blanco del fondo (ruido de compresión) cuenta como blanco.
    let a = Math.max(255 - r, 255 - g, 255 - b) / 255;
    a = a < 0.025 ? 0 : a;
    const o = i * 4;
    if (a > 0) {
      for (let c = 0; c < 3; c++) salida[o + c] = Math.round(Math.min(255, Math.max(0, (data[p + c] - 255 * (1 - a)) / a)));
      salida[o + 3] = Math.round(a * 255);
      if (a > 0.06) {
        const x = i % w, y = (i / w) | 0;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  const m = 4; // margen para no cortar la sombra
  const left = Math.max(0, x0 - m), top = Math.max(0, y0 - m);
  return sharp(salida, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left, top, width: Math.min(w, x1 + m + 1) - left, height: Math.min(h, y1 + m + 1) - top });
}

for (const archivo of readdirSync(ORIGEN).filter((f) => f.endsWith(".webp")).sort()) {
  const nombre = basename(archivo, ".webp");
  const img = await aTransparente(join(ORIGEN, archivo));
  const buf = await img.png().toBuffer();
  const salida = await sharp(buf).resize({ width: ANCHO[nombre] ?? 600 }).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(join(DESTINO, `${nombre}.webp`));
  console.log(`${nombre}.webp ${salida.width}x${salida.height} ${(salida.size / 1024).toFixed(1)} KB (proporción ${(salida.width / salida.height).toFixed(3)})`);
}

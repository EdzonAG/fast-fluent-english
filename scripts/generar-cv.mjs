#!/usr/bin/env node
/*
 * Genera el CV de FAST como PNG (1700 px de ancho) y PDF carta, a partir de la sección #cv del sitio.
 * Se corre en tu computadora, no en Render. Si cambias el texto del CV:
 *   npm run build && npm run cv && npm run build
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const SALIDA = join(RAIZ, "public", "english", "assets", "cv");
const PUERTO = 3987;
const ANCHO_HOJA = 816; // 8.5 in a 96 ppp
const ALTO_HOJA = 1056; // 11 in a 96 ppp
const ANCHO_PNG = 1700;

mkdirSync(SALIDA, { recursive: true });
const servidor = spawn(process.execPath, [join(RAIZ, "scripts", "servir.mjs"), join(RAIZ, "dist"), String(PUERTO)], { stdio: "ignore" });

try {
  const navegador = await chromium.launch({ channel: "chrome" });
  const contexto = await navegador.newContext({
    viewport: { width: ANCHO_HOJA, height: ALTO_HOJA },
    deviceScaleFactor: ANCHO_PNG / ANCHO_HOJA,
  });
  const pagina = await contexto.newPage();
  for (let i = 0; ; i++) {
    try {
      await pagina.goto(`http://localhost:${PUERTO}/english/`);
      break;
    } catch (e) {
      if (i > 20) throw e;
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  await pagina.emulateMedia({ media: "screen" });
  await pagina.evaluate(async () => {
    const cv = document.querySelector(".cv");
    cv.classList.add("cv--hoja");
    document.body.replaceChildren(cv);
    document.body.style.margin = "0";
    document.body.style.background = "#fff";
    await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
    await document.fonts.ready;
  });

  const alto = await pagina.evaluate(() => document.querySelector(".cv").getBoundingClientRect().height);
  if (alto > ALTO_HOJA + 0.5) throw new Error(`El CV mide ${alto} px y no cabe en una hoja carta (${ALTO_HOJA} px).`);

  const png = await pagina.locator(".cv").screenshot({ type: "png" });
  const salidaPng = await sharp(png).png({ compressionLevel: 9, palette: true, quality: 90 }).toBuffer();
  writeFileSync(join(SALIDA, "fast-english-cv.png"), salidaPng);

  const pdf = await pagina.pdf({ width: "8.5in", height: "11in", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  const hojas = (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) || []).length;
  if (hojas !== 1) throw new Error(`El PDF salió con ${hojas} hojas.`);
  writeFileSync(join(SALIDA, "fast-english-cv.pdf"), pdf);

  const m = await sharp(salidaPng).metadata();
  console.log(`PNG ${m.width}x${m.height}, ${Math.round(salidaPng.length / 1024)} KB · PDF 1 hoja, ${Math.round(pdf.length / 1024)} KB`);
  await navegador.close();
} finally {
  servidor.kill();
}

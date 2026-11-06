#!/usr/bin/env node
/*
 * Genera las imágenes publicadas a partir de assets-originales/.
 *
 *   npm run imagenes            procesa solo lo nuevo o modificado
 *   npm run imagenes -- --todo  vuelve a procesar todo (por ejemplo, al cambiar calidades)
 *
 * Para fotos nuevas: copia el archivo a assets-originales/ (la carpeta "pendientes" se
 * ignora a propósito) y corre el comando. Salida: public/static/img/ + imagenes.manifest.json.
 * sharp elimina EXIF y GPS porque nunca se usa .withMetadata().
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGINALES = join(RAIZ, "assets-originales");
const SALIDA = join(RAIZ, "public", "static", "img");
const MANIFIESTO = join(RAIZ, "imagenes.manifest.json");

const ANCHOS = [480, 768, 1280, 1920];
const LIMITE_KB = 400;
const IGNORAR = new Set(["pendientes", "logos"]);
const CALIDAD_BASE = { avif: 50, webp: 75, jpg: 78, chroma: "4:2:0" };

// Ajustes por imagen, revisados a ojo. El primero que coincide gana.
const AJUSTES = [
  // Portadas: el rótulo rojo y los bordes de la letra se degradan con 4:2:0.
  { patron: /\/portadas\/lagos/, avif: 46, webp: 70, jpg: 70, chroma: "4:4:4" },
  { patron: /\/portadas\//, avif: 58, webp: 80, jpg: 76, chroma: "4:4:4" },
  // Follaje con mucho detalle: eran las más pesadas de Chiapas y no se nota la diferencia.
  { patron: /\/chiapas\/(img09|img13|img14)/, avif: 42, webp: 68 },
  // El agua turquesa y el cielo son los primeros en mostrar bandas en AVIF.
  { patron: /\/(bcs\/(img03|img04|img08|img09)|chiapas\/img15|ballena\/)/, avif: 56, webp: 78 },
];

const calidadDe = (clave) => ({ ...CALIDAD_BASE, ...(AJUSTES.find((a) => a.patron.test(`/${clave}`)) || {}) });
const sha = (b) => createHash("sha256").update(b).digest("hex");

function listar(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (IGNORAR.has(e.name)) return [];
    const p = join(dir, e.name);
    if (e.isDirectory()) return listar(p);
    return /\.(jpe?g|png|webp|tiff?)$/i.test(e.name) ? [p] : [];
  });
}

// assets/img/bcs/img03 -> bcs/img03; english/assets/img/hero/notes -> english/hero/notes
const rutaSalida = (clave) => clave.replace(/(^|\/)assets\/img\//, "$1");

async function codificar(base, formato, c) {
  if (formato === "avif") return base.avif({ quality: c.avif, effort: 6, chromaSubsampling: c.chroma }).toBuffer();
  if (formato === "webp") return base.webp({ quality: c.webp, effort: 5, smartSubsample: true }).toBuffer();
  return base
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: c.jpg, mozjpeg: true })
    .toBuffer();
}

async function procesar(archivo, clave, c, huella) {
  const entrada = readFileSync(archivo);
  const meta = await sharp(entrada).rotate().metadata();
  const giraEjes = (meta.orientation || 1) >= 5;
  const ancho = giraEjes ? meta.height : meta.width;
  const alto = giraEjes ? meta.width : meta.height;
  // Nunca amplía: si la imagen es menor que el ancho más chico, se publica a su tamaño real.
  const anchos = ANCHOS.filter((w) => w <= ancho);
  if (!anchos.length) anchos.push(ancho);

  const variantes = { avif: [], webp: [], jpg: [] };
  const destino = join(SALIDA, rutaSalida(clave));
  mkdirSync(dirname(destino), { recursive: true });
  for (const w of anchos) {
    const h = Math.round((alto * w) / ancho);
    await Promise.all(
      Object.keys(variantes).map(async (formato) => {
        const base = sharp(entrada).rotate().resize({ width: w, withoutEnlargement: true });
        const buf = await codificar(base, formato, c);
        const nombre = `${destino}-${w}.${sha(buf).slice(0, 10)}.${formato}`;
        writeFileSync(nombre, buf);
        variantes[formato].push({ w, h, bytes: buf.length, ruta: `/${relative(join(RAIZ, "public"), nombre).split(sep).join("/")}` });
      })
    );
  }
  Object.values(variantes).forEach((l) => l.sort((a, b) => a.w - b.w));

  // Foto entre dos anchos (por ejemplo 1159 px): el visor abre su tamaño real.
  // No entra en srcset para no subirle el peso a los celulares de alta densidad.
  let visor;
  if (anchos[anchos.length - 1] < Math.min(ancho, 1280)) {
    let buf = await codificar(sharp(entrada).rotate(), "webp", c);
    for (let q = c.webp - 6; buf.length > LIMITE_KB * 1024 && q >= 50; q -= 6) buf = await codificar(sharp(entrada).rotate(), "webp", { ...c, webp: q });
    const nombre = `${destino}-${ancho}.${sha(buf).slice(0, 10)}.webp`;
    writeFileSync(nombre, buf);
    visor = { w: ancho, h: alto, bytes: buf.length, ruta: `/${relative(join(RAIZ, "public"), nombre).split(sep).join("/")}` };
  }
  return { huella, width: ancho, height: alto, variantes, ...(visor && { visor }) };
}

const publicados = (d) => [...Object.values(d.variantes).flat(), ...(d.visor ? [d.visor] : [])];
const anterior = existsSync(MANIFIESTO) ? JSON.parse(readFileSync(MANIFIESTO, "utf8")) : {};
const todo = process.argv.includes("--todo");
const nuevo = {};
let procesadas = 0;

for (const archivo of listar(ORIGINALES).sort()) {
  const rel = relative(ORIGINALES, archivo).split(sep).join("/");
  const clave = rel.slice(0, -extname(rel).length);
  const c = calidadDe(clave);
  const huella = sha(sha(readFileSync(archivo)) + JSON.stringify({ c, ANCHOS })).slice(0, 16);
  const previa = anterior[clave];
  const vigente =
    !todo && previa && previa.huella === huella &&
    publicados(previa).every((v) => existsSync(join(RAIZ, "public", v.ruta)));
  if (vigente) { nuevo[clave] = previa; continue; }
  if (previa) publicados(previa).forEach((v) => rmSync(join(RAIZ, "public", v.ruta), { force: true }));
  process.stdout.write(`procesando ${clave}\n`);
  nuevo[clave] = await procesar(archivo, clave, c, huella);
  procesadas++;
}

// Quita lo publicado de originales que ya no existen.
for (const [clave, datos] of Object.entries(anterior)) {
  if (!nuevo[clave]) publicados(datos).forEach((v) => rmSync(join(RAIZ, "public", v.ruta), { force: true }));
}
writeFileSync(MANIFIESTO, JSON.stringify(nuevo, null, 1) + "\n");

// Vista previa al compartir (1200x630, ruta fija): recorte inferior que conserva el título de la portada.
const OG = join(RAIZ, "public", "assets", "img", "og");
mkdirSync(OG, { recursive: true });
for (const nombre of ["loreto-mulege", "lagos-de-colon"]) {
  await sharp(join(ORIGINALES, "assets", "img", "portadas", `${nombre}.png`))
    .resize({ width: 1200, height: 630, fit: "cover", position: "bottom" })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(join(OG, `${nombre}.jpg`));
}

const kb = (b) => (b / 1024).toFixed(0).padStart(4);
const filas = Object.entries(nuevo).map(([clave, d]) => {
  const de = (f, w) => d.variantes[f].find((v) => v.w === w) || d.variantes[f][d.variantes[f].length - 1];
  return `${kb(de("avif", 480).bytes)} ${kb(de("avif", 768).bytes)} ${kb(de("avif", 1280).bytes)} | ${kb(de("webp", 768).bytes)} ${kb(de("webp", 1280).bytes)} | ${kb(de("jpg", 768).bytes)} ${kb(de("jpg", 1280).bytes)}  ${String(d.width).padStart(4)}x${String(d.height).padEnd(4)} ${clave}`;
});
console.log(`\nKB: avif480 avif768 avif1280 | webp768 webp1280 | jpg768 jpg1280\n${filas.join("\n")}`);

const excedidas = Object.entries(nuevo).flatMap(([clave, d]) =>
  Object.entries(d.variantes).flatMap(([f, l]) =>
    l.filter((v) => v.bytes > LIMITE_KB * 1024).map((v) => `${clave} ${f} ${v.w}px: ${kb(v.bytes).trim()} KB`)
  )
);
console.log(`\n${procesadas} procesadas, ${Object.keys(nuevo).length} en total.`);
if (excedidas.length) {
  console.error(`\nExceden ${LIMITE_KB} KB:\n${excedidas.join("\n")}`);
  process.exit(1);
}

# SpectaCulTours (spectacultours.mx) + FAST fluent English

Sitio estático (HTML + CSS + JS puro) con un build pequeño, desplegado en Render como **Static Site**.
El dominio principal es **spectacultours.mx**: primero se presentan las expediciones y las clases de inglés quedan como un extra.

| Ruta | Página |
|---|---|
| `/` | Menú: tres opciones del mismo nivel que llevan a Baja California Sur, Chiapas y clases de inglés |
| `/chiapas/` | Expedición Chiapas (selva, cascadas, ruinas mayas) |
| `/baja-california-sur/` | Expedición Baja California Sur (islas, delfines, misiones) |
| `/english/` | FAST fluent English — clases de inglés (sección secundaria) |

### Flujo de navegación

```
spectacultours.mx  ──►  /chiapas/  ·  /baja-california-sur/   (← "All expeditions" para volver)
        │
        └── "English classes" (menú, sección "Extra" y pie)  ──►  /english/   (← "SpectaCulTours" para volver)
```

Las rutas antiguas `/tours/...` redirigen a las nuevas mediante páginas de redirección en `public/tours/`
(funcionan aunque Render no aplique `render.yaml`; las reglas de `render.yaml` hacen lo mismo con un 301 si el servicio usa el Blueprint).

## Estructura

```
assets-originales/              ← originales, no se publican. "pendientes/" y "logos/" no pasan por el script de fotos
imagenes.manifest.json          ← generado: variantes de cada imagen
scripts/
  optimizar-imagenes.mjs        ← originales → public/static/img (AVIF, WebP, JPG)
  optimizar-logos.mjs           ← SVGO + comparación píxel a píxel
  build.mjs                     ← public/ → dist/ (<picture>, hashes, QR, orden del menú)
  generar-cv.mjs                ← sección del CV → PNG y PDF (public/english/assets/cv/)
  parciales/comun.css           ← estilos del QR y del visor, van en línea en cada página
  servir.mjs                    ← servidor local con Brotli y la misma caché que producción
tests/sitio.test.mjs            ← pruebas automáticas (npm test)
public/
  index.html                    ← menú de inicio
  chiapas/, baja-california-sur/ ← páginas de cada expedición
  assets/css/tours.css          ← estilos de tours
  assets/fonts/                 ← Inter, Sora e Instrument Serif hospedadas aquí (SIL OFL)
  assets/js/tours-config.js     ← ⚙️ archivo único de configuración (ver "Editar contenido")
  assets/js/comun.js            ← idioma, WhatsApp, fechas, QR y visor, compartidos por tours e inglés
  assets/js/tours-i18n.js       ← traducciones al español de los tours
  assets/js/tours.js            ← interacciones de tours
  assets/img/                   ← logos, iconos y tarjetas para redes
  static/img/                   ← generado: fotos optimizadas, con hash en el nombre
  english/                      ← sitio FAST fluent English
  sitemap.xml, robots.txt
render.yaml                     ← Blueprint de Render
```

## Ver en local

```bash
npm install
npm run dev
```

Abre http://localhost:3000. Para ver el español directamente: `http://localhost:3000/?lang=es`.

## Pruebas

```bash
npm test
```

Construye `dist/` y lo prueba con el Chrome instalado: sin scroll horizontal a 360, 390, 768, 1024 y 1440 px; QR y WhatsApp sin encimarse ni tapar botones; QR que decodifica a `qrUrl`; mensaje de WhatsApp por contexto e idioma; botón de traducción visible en móvil; YouTube sin cargar hasta el clic; título de portada completo; peso por imagen; `[DESTINO]` nunca visible; fechas vencidas; CV. Las capturas quedan en `test-results/capturas/`.

## Fotos nuevas

1. Copia el original a `assets-originales/`, en la ruta equivalente (por ejemplo `assets-originales/assets/img/bcs/nueva.jpg`).
2. Genera las versiones publicadas:

   ```bash
   npm run imagenes
   ```

   Genera AVIF, WebP y JPG en 480, 768, 1280 y 1920 px sin ampliar, elimina EXIF y GPS, y falla si alguna variante pasa de 400 KB. Si la foto queda entre dos anchos, agrega su tamaño real solo para el visor. `npm run imagenes -- --todo` reprocesa todo, por ejemplo al cambiar calidades. Las calidades por imagen están en `AJUSTES`, al inicio del script.
3. En el HTML escribe un `<img>` normal con la ruta original y un `data-sizes` de los definidos en `TAMANOS` (`scripts/build.mjs`). El build lo convierte en `<picture>`. La imagen principal de la página lleva además `data-lcp`.

Las imágenes generadas se suben al repositorio, así que Render no necesita sharp.

## Desplegar en Render

El servicio actual (`fast-fluent-english`) se creó a mano y no aplica `render.yaml`. **El orden importa:** sin el build, `dist/` no existe y las páginas no encuentran sus fotos.

1. En **Settings → Build & Deploy** del Static Site:

   | Campo | Valor |
   |---|---|
   | Build Command | `npm ci --omit=dev && npm run build` |
   | Publish Directory | `dist` |

2. En **Settings → Headers**, agrega:

   | Path | Header | Valor |
   |---|---|---|
   | `/static/*` | `Cache-Control` | `public, max-age=31536000, immutable` |
   | `/*` | `X-Frame-Options` | `SAMEORIGIN` |
   | `/*` | `Referrer-Policy` | `strict-origin-when-cross-origin` |
   | `/*` | `X-Content-Type-Options` | `nosniff` |

3. En **Settings → Redirects/Rewrites**, agrega con acción Redirect:

   | Origen | Destino |
   |---|---|
   | `/tours/chiapas/*` | `/chiapas/` |
   | `/tours/baja-california-sur/*` | `/baja-california-sur/` |
   | `/tours/*` | `/` |
   | `/tours` | `/` |

4. Sube los cambios a `main`. Cada `git push` a `main` despliega solo.
5. Comprueba en producción:

   ```bash
   curl -sI https://www.spectacultours.mx/ | grep -i cache-control
   ```

   Abre cualquier archivo de `/static/` y confirma que su `Cache-Control` diga `immutable`. Después corre Lighthouse móvil sobre `/`.

**Alternativa a los pasos 1 a 3:** ligar el repositorio como Blueprint en el panel de Render, para que aplique `render.yaml`.

**Para revertir:** en **Deploys**, usa Rollback en el despliegue anterior y regresa Build Command a vacío y Publish Directory a `public`.

La compresión Brotli la aplica Render sin configuración. Render no instala sharp ni Playwright, por eso las imágenes y el CV generados se suben al repositorio.

## Editar contenido

- **Archivo único de configuración:** `public/assets/js/tours-config.js`. Tras editarlo, vuelve a construir (Render lo hace al desplegar).
  - `destinoDestacado`: `"bcs"` o `"chiapas"` cambia el destino que va primero en el menú, su `preload` y la tarjeta para redes. **Cambiar a `"chiapas"` en marzo.**
  - `fechas`: una fecha desaparece sola al pasar su día final. Con `destino: "[DESTINO]"` no se muestra destino; escribe el lugar cuando esté definido.
  - `ballena`: frase, fotos y videos (ID de YouTube y título) en inglés y español.
  - `mensajesWhatsApp`: mensajes por contexto. Se envían en español si el visitante eligió español o si su navegador está en español.
  - `qrUrl` y `qrTextos`: adónde lleva el QR y sus textos. El QR es el diseño del cliente (`public/assets/img/qr/`, original en `assets-originales/qr/`) y el enlace va dentro de la imagen: para cambiarlo hay que reemplazar el archivo. `npm test` falla si no coincide con `qrUrl`.
  - También: precios por etapa, tarifas VIP, número de WhatsApp y redes. El total del paquete se calcula solo (reserva + 1er pago + 2º pago).
- **CV de FAST:** el texto está en la sección `#cv` de `public/english/index.html`. Si lo cambias, regenera el PNG y el PDF con `npm run build && npm run cv && npm run build` y sube el resultado.
- **Clases de inglés** (WhatsApp, Calendly, precios, redes, email): `public/english/assets/js/config.js`.
  Las redes con URL vacía (`""`) se ocultan automáticamente.
- **Textos en inglés**: directamente en cada `index.html`.
- **Textos en español**: `public/assets/js/tours-i18n.js` (tours) y `public/english/assets/js/i18n.js` (inglés),
  con la misma clave `data-i18n` que en el HTML.

## Funcionalidades

- Bilingüe EN/ES: abre en inglés si no hay una elección guardada. El botón está en el encabezado de todas las páginas
  y la elección se recuerda entre visitas (`localStorage`); también funciona `?lang=es`.
- QR flotante, con el diseño del cliente, que se reduce o se quita al pasar sobre títulos y botones, con vista ampliada para escanear.
- Sección de ballena azul, fechas de tours, mensajes de WhatsApp por contexto y CV de FAST con visor y descarga en PDF.
- Hero con collage de fotos de aprendizaje en línea (licencia Unsplash) y tarjetas flotantes.
- 6 videos del canal (incluye el testimonio de un médico, enlazado desde "Who it's for").
- Test de nivel MCER (A1–C2) de 6 preguntas que envía el resultado por WhatsApp.
- Agenda de Calendly en ventana emergente (sin salir del sitio).
- Widget de WhatsApp con mensajes rápidos prellenados; botones de planes con mensaje por plan.
- Precios por mes / por clase, sección para empresas (facturas, cobro directo, constancias).
- Videos de YouTube con carga diferida (privacy-enhanced, no cargan hasta dar clic).
- Inicio: solo el menú, con las portadas de BCS y Chiapas y una foto de FAST. Cada página tiene lo suyo: la ballena azul y sus videos en BCS, los videos de cada destino en su página; por qué viajar, cómo funciona y la comparativa en ambos destinos.
- Páginas de expedición: mosaico de experiencias con los videos reales, destinos,
  calendario de pagos, calculadora de días VIP que arma el mensaje de WhatsApp, galería con visor,
  comparativa lado a lado y el idioma compartido con el sitio de FAST.
- Responsive y accesible (teclado, `prefers-reduced-motion`), sin dependencias externas en el navegador salvo YouTube y Calendly.

## Créditos de imágenes

Fotos del hero de inglés (`public/english/assets/img/hero/`; `learn-headphones.jpg` también se usa en el menú de inicio), bajo la [Licencia Unsplash](https://unsplash.com/license)
(uso comercial gratuito, sin atribución obligatoria):

- `learn-headphones.jpg` — Soundtrap · https://unsplash.com/photos/C-2Wky-LT7k
- `video-call.jpg` — LinkedIn Sales Solutions · https://unsplash.com/photos/Be5aVKFv9ho
- `hello-class.jpg` — Windows · https://unsplash.com/photos/6G6akT8biLg
- `notes.jpg` — veera Batlu · https://unsplash.com/photos/rqJfN6F-j8s

El resto de imágenes y videos provienen de los sitios de Carrd y el canal de YouTube del cliente.

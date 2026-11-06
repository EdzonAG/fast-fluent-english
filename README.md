# SpectaCulTours (spectacultours.mx) + FAST fluent English

Sitio estático (HTML + CSS + JS puro) con un build pequeño, desplegado en Render como **Static Site**.
El dominio principal es **spectacultours.mx**: primero se presentan las expediciones y las clases de inglés quedan como un extra.

| Ruta | Página |
|---|---|
| `/` | SpectaCulTours — portada: elegir expedición, momentos reales, cómo funciona, comparativa y el extra de inglés |
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
  build.mjs                     ← public/ → dist/ (<picture>, hashes)
  servir.mjs                    ← servidor local con Brotli y la misma caché que producción
public/
  index.html                    ← portada SpectaCulTours
  chiapas/, baja-california-sur/ ← páginas de cada expedición
  assets/css/tours.css          ← estilos de tours
  assets/fonts/                 ← Inter, Sora e Instrument Serif hospedadas aquí (SIL OFL)
  assets/js/tours-config.js     ← ⚙️ precios de tours, WhatsApp, redes, enlace a /english/
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

## Fotos nuevas

1. Copia el original a `assets-originales/`, en la ruta equivalente (por ejemplo `assets-originales/assets/img/bcs/nueva.jpg`).
2. Genera las versiones publicadas:

   ```bash
   npm run imagenes
   ```

   Genera AVIF, WebP y JPG en 480, 768, 1280 y 1920 px sin ampliar, elimina EXIF y GPS, y falla si alguna variante pasa de 400 KB. `npm run imagenes -- --todo` reprocesa todo, por ejemplo al cambiar calidades. Las calidades por imagen están en `AJUSTES`, al inicio del script.
3. En el HTML escribe un `<img>` normal con la ruta original y un `data-sizes` de los definidos en `TAMANOS` (`scripts/build.mjs`). El build lo convierte en `<picture>`. La imagen principal de la página lleva además `data-lcp`.

Las imágenes generadas se suben al repositorio, así que Render no necesita sharp.

## Desplegar en Render

El servicio actual se creó a mano y no aplica `render.yaml`. En **Settings** del Static Site `fast-fluent-english` deben quedar estos valores, o bien hay que ligarlo como Blueprint:

| Campo | Valor |
|---|---|
| Build Command | `npm ci --omit=dev && npm run build` |
| Publish Directory | `dist` |
| Header | `/static/*` · `Cache-Control` · `public, max-age=31536000, immutable` |

Más los otros encabezados y las redirecciones que aparecen en `render.yaml`. Cada `git push` a `main` vuelve a desplegar. La compresión Brotli la aplica Render sin configuración.

## Editar contenido

- **Tours** (precios por etapa, tarifas VIP, WhatsApp, redes): `public/assets/js/tours-config.js`.
  El total del paquete se calcula solo (reserva + 1er pago + 2º pago).
- **Clases de inglés** (WhatsApp, Calendly, precios, redes, email): `public/english/assets/js/config.js`.
  Las redes con URL vacía (`""`) se ocultan automáticamente.
- **Textos en inglés**: directamente en cada `index.html`.
- **Textos en español**: `public/assets/js/tours-i18n.js` (tours) y `public/english/assets/js/i18n.js` (inglés),
  con la misma clave `data-i18n` que en el HTML.

## Funcionalidades

- Bilingüe EN/ES: **siempre abre en inglés**. El cambio a español está discreto al pie de página
  ("Ver en español") y se recuerda solo durante la visita en esa pestaña; también funciona `?lang=es`.
- Hero con collage de fotos de aprendizaje en línea (licencia Unsplash) y tarjetas flotantes.
- 6 videos del canal (incluye el testimonio de un médico, enlazado desde "Who it's for").
- Test de nivel MCER (A1–C2) de 6 preguntas que envía el resultado por WhatsApp.
- Agenda de Calendly en ventana emergente (sin salir del sitio).
- Widget de WhatsApp con mensajes rápidos prellenados; botones de planes con mensaje por plan.
- Precios por mes / por clase, sección para empresas (facturas, cobro directo, constancias).
- Videos de YouTube con carga diferida (privacy-enhanced, no cargan hasta dar clic).
- Portada: selector Chiapas/BCS, "momentos reales" con 7 videos de ambos destinos, cómo funciona, comparativa y sección extra de inglés.
- Páginas de expedición: mosaico de experiencias con los videos reales, destinos,
  calendario de pagos, calculadora de días VIP que arma el mensaje de WhatsApp, galería con visor,
  comparativa lado a lado y el idioma compartido con el sitio de FAST.
- Responsive y accesible (teclado, `prefers-reduced-motion`), sin dependencias externas en el navegador salvo YouTube y Calendly.

## Créditos de imágenes

Fotos del hero de inglés (`public/english/assets/img/hero/`; `learn-headphones.jpg` también se usa en la sección de inglés de la portada), bajo la [Licencia Unsplash](https://unsplash.com/license)
(uso comercial gratuito, sin atribución obligatoria):

- `learn-headphones.jpg` — Soundtrap · https://unsplash.com/photos/C-2Wky-LT7k
- `video-call.jpg` — LinkedIn Sales Solutions · https://unsplash.com/photos/Be5aVKFv9ho
- `hello-class.jpg` — Windows · https://unsplash.com/photos/6G6akT8biLg
- `notes.jpg` — veera Batlu · https://unsplash.com/photos/rqJfN6F-j8s

El resto de imágenes y videos provienen de los sitios de Carrd y el canal de YouTube del cliente.

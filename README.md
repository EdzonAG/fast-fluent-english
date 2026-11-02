# SpectaCulTours (spectacultours.mx) + FAST fluent English

Sitio estático (HTML + CSS + JS puro, sin build ni dependencias) listo para desplegar en Render como **Static Site gratuito**.
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

Las rutas antiguas `/tours/...` redirigen a las nuevas (reglas en `render.yaml`).

## Estructura

```
public/
  index.html                    ← portada SpectaCulTours
  chiapas/, baja-california-sur/ ← páginas de cada expedición
  assets/css/tours.css          ← estilos de tours
  assets/js/tours-config.js     ← ⚙️ precios de tours, WhatsApp, redes, enlace a /english/
  assets/js/tours-i18n.js       ← traducciones al español de los tours
  assets/js/tours.js            ← interacciones de tours
  assets/img/                   ← fotos de los tours (de los sitios de Carrd)
  english/                      ← sitio FAST fluent English (autocontenido)
    index.html
    assets/js/config.js         ← ⚙️ WhatsApp, Calendly, precios de clases, redes, enlace a la portada
    assets/js/i18n.js, main.js, assets/css/styles.css, assets/img/
  sitemap.xml, robots.txt
render.yaml                     ← Blueprint de Render (encabezados y redirecciones)
```

## Ver en local

```bash
npm run dev
```

(o `python3 -m http.server 3000 -d public`) y abrir http://localhost:3000.
Para ver la versión en español directamente: `http://localhost:3000/?lang=es`.

## Desplegar en Render

1. En Render: **New → Blueprint** con este repositorio (lee `render.yaml`, con encabezados y redirecciones).
   - Alternativa manual: **New → Static Site**, *Build command* vacío, *Publish directory* `public`.
     En ese caso, agrega las redirecciones de `/tours/...` a mano en *Redirects/Rewrites*.
2. Cada `git push` a `main` vuelve a desplegar automáticamente.
3. **Dominio:** en *Settings → Custom Domains* agrega `spectacultours.mx` y `www.spectacultours.mx`
   y crea en tu proveedor de DNS los registros que Render indique. Render emite el certificado HTTPS solo.

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
- Responsive, accesible (teclado, `prefers-reduced-motion`) y sin dependencias externas salvo Google Fonts.

## Créditos de imágenes

Fotos del hero de inglés (`public/english/assets/img/hero/`; `learn-headphones.jpg` también se usa en la sección de inglés de la portada), bajo la [Licencia Unsplash](https://unsplash.com/license)
(uso comercial gratuito, sin atribución obligatoria):

- `learn-headphones.jpg` — Soundtrap · https://unsplash.com/photos/C-2Wky-LT7k
- `video-call.jpg` — LinkedIn Sales Solutions · https://unsplash.com/photos/Be5aVKFv9ho
- `hello-class.jpg` — Windows · https://unsplash.com/photos/6G6akT8biLg
- `notes.jpg` — veera Batlu · https://unsplash.com/photos/rqJfN6F-j8s

El resto de imágenes y videos provienen de los sitios de Carrd y el canal de YouTube del cliente.

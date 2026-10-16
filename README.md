# FAST fluent English + SpectaCulTours — Portal web

Sitio estático (HTML + CSS + JS puro, sin build ni dependencias) listo para desplegar en Render como **Static Site gratuito**.

| Ruta | Sitio |
|---|---|
| `/` | FAST fluent English (clases de inglés) |
| `/tours/` | SpectaCulTours — portada para elegir expedición |
| `/tours/chiapas/` | Expedición Chiapas (selva, cascadas, ruinas mayas) |
| `/tours/baja-california-sur/` | Expedición Baja California Sur (islas, delfines, misiones) |

## Estructura

```
public/
  index.html            ← página completa
  assets/css/styles.css ← estilos
  assets/js/config.js   ← ⚙️ datos editables (WhatsApp, Calendly, precios, redes)
  assets/js/i18n.js     ← traducciones al español + textos del test y del chat
  assets/js/main.js     ← interacciones
  assets/img/           ← imágenes del sitio original
  tours/                ← mini-portal SpectaCulTours (autocontenido)
    index.html, chiapas/, baja-california-sur/
    assets/js/tours-config.js ← ⚙️ precios de tours, WhatsApp, redes, enlace a FAST
    assets/js/tours-i18n.js   ← traducciones al español de los tours
render.yaml             ← Blueprint de Render
```

## Ver en local

```bash
npm run dev
```

(o `python3 -m http.server 3000 -d public`) y abrir http://localhost:3000.
Para ver la versión en español directamente: `http://localhost:3000/?lang=es`.

## Desplegar en Render

1. Sube esta carpeta a un repositorio de GitHub/GitLab.
2. En Render: **New → Blueprint**, elige el repositorio. Render lee `render.yaml` y crea el sitio estático.
   - Alternativa manual: **New → Static Site**, *Build command* vacío, *Publish directory* `public`.
3. Cada `git push` vuelve a desplegar automáticamente.
4. (Opcional) En *Settings → Custom Domains* agrega el dominio propio.

### Tours en un subdominio (opcional)

La carpeta `public/tours/` usa solo rutas relativas, así que puede servirse sola. Para tener, por ejemplo, `tours.tudominio.com`:

1. Descomenta el segundo servicio en `render.yaml` (publica `./public/tours`).
2. En `public/tours/assets/js/tours-config.js` cambia `fastUrl` a la URL de FAST English.
3. En `public/assets/js/config.js` cambia `toursUrl` a la URL del subdominio.
4. Agrega el dominio personalizado en el panel de Render.

## Editar contenido

- **Teléfono, WhatsApp, Calendly, precios, redes sociales, email**: `public/assets/js/config.js`.
  Las redes con URL vacía (`""`) se ocultan automáticamente.
- **Textos en inglés**: directamente en `index.html`.
- **Textos en español**: `public/assets/js/i18n.js` (misma clave `data-i18n` que en el HTML).
- **Tours** (precios por etapa, tarifas VIP, WhatsApp, redes): `public/tours/assets/js/tours-config.js`.
  El total del paquete se calcula solo (reserva + 1er pago + 2º pago).

## Funcionalidades

- Bilingüe EN/ES (detecta el idioma del navegador, recuerda la elección, `?lang=es` en la URL).
- Simulación animada de una clase en vivo con correcciones y medidor de tiempo de habla 80/20.
- Test de nivel MCER (A1–C2) de 6 preguntas que envía el resultado por WhatsApp.
- Agenda de Calendly en ventana emergente (sin salir del sitio).
- Widget de WhatsApp con mensajes rápidos prellenados; botones de planes con mensaje por plan.
- Precios por mes / por clase, sección para empresas (facturas, cobro directo, constancias).
- Videos de YouTube con carga diferida (privacy-enhanced, no cargan hasta dar clic).
- Tours: portada dividida Chiapas/BCS, mosaico de experiencias con los 13 videos reales, destinos,
  calendario de pagos, calculadora de días VIP que arma el mensaje de WhatsApp, galería con visor,
  comparativa lado a lado y el idioma compartido con el sitio de FAST.
- Responsive, accesible (teclado, `prefers-reduced-motion`) y sin dependencias externas salvo Google Fonts.

/*
 * SpectaCulTours — configuration.
 * Edit contact data, prices and links here. Leave a social URL empty ("") to hide it.
 *
 * fastUrl: where the "English classes" (FAST fluent English) links point.
 *   - "/english/" — the English site lives inside spectacultours.mx (default)
 *   - a full URL if it ever moves to its own domain.
 */
window.TOURS_CONFIG = {
  // Destino que va primero en el menú del inicio: "bcs" (Loreto y Mulegé) o "chiapas" (Lagos de Colón).
  // A partir de marzo, cambiar a "chiapas" y volver a desplegar.
  destinoDestacado: "bcs",

  // Sección de ballena azul (página de BCS). Va justo debajo de la portada de Loreto y Mulegé.
  // fotos: rutas de assets-originales ya procesadas con "npm run imagenes". videos: id de YouTube.
  ballena: {
    frase: {
      en: "Loreto, BCS, is the only place in the world where Blue Whale watching is guaranteed",
      es: "Loreto, BCS, es el único lugar del mundo donde el avistamiento de ballena azul está garantizado"
    },
    fotos: [
      {
        src: "assets/img/ballena/bcs-ballena-foto-01.jpg",
        alt: {
          en: "Blue-gray whale tail rising from the water in a cascade, with mountains in the background",
          es: "Cola de ballena azul-grisácea saliendo del agua con cascada de agua, montañas al fondo"
        }
      },
      {
        src: "assets/img/ballena/bcs-ballena-foto-03.jpg",
        alt: {
          en: "Whale tail lifting with water streaming off it, clear horizon",
          es: "Cola de ballena levantándose con agua escurriendo, horizonte despejado"
        }
      },
      {
        src: "assets/img/ballena/bcs-ballena-foto-04.jpg",
        alt: {
          en: "Whale tail, gray in color, with water falling from it; distant coast and a boat in the background",
          es: "Cola de ballena de color gris con agua cayendo, costa lejana y una lancha al fondo"
        }
      }
    ],
    videos: [
      { id: "LyiDEUgSIAs", titulo: { en: "Whale in the distance raising its tail in front of the sierra", es: "Ballena a lo lejos levantando la cola frente a la sierra" } },
      { id: "Rbb6OL761Nk", titulo: { en: "Whale's back and dorsal fin in a very calm sea", es: "Lomo y aleta dorsal de ballena en mar muy calmo" } },
      { id: "t6dm55ArCcw", titulo: { en: "Whale's gray back off a rocky coast", es: "Lomo gris de ballena frente a costa rocosa" } },
      { id: "8xeYU-N8cb8", titulo: { en: "Whale raising its tail and splashing, reddish coast in the background", es: "Ballena levantando la cola y salpicando, costa rojiza al fondo" } },
      { id: "ESV94NizlOY", titulo: { en: "Whale leaping in front of mountains", es: "Salto de ballena frente a montañas" } },
      { id: "GRCz-HWflbc", titulo: { en: "Blue whale tail raised, misty sierra in the background", es: "Cola de ballena azul levantada, sierra brumosa al fondo" } },
      { id: "aSKArkkvZJ8", titulo: { en: "Long blue-gray whale surfacing in open sea", es: "Ballena gris-azulada larga emergiendo en mar abierto" } }
    ]
  },

  // Adónde lleva el QR flotante. El diseño es del cliente y el enlace va dentro de la imagen
  // (public/assets/img/qr/): para cambiarlo hay que reemplazar el archivo. "npm test" comprueba que coincidan.
  qrUrl: "https://spectacultours.mx",
  qrTextos: {
    en: { escanea: "Scan me", ampliar: "Show the QR code larger", modal: "Scan to save SpectaCulTours", cerrar: "Close", alt: "QR code for the SpectaCulTours website" },
    es: { escanea: "Escanéame", ampliar: "Mostrar el código QR más grande", modal: "Escanea para guardar SpectaCulTours", cerrar: "Cerrar", alt: "Código QR del sitio de SpectaCulTours" }
  },

  // Fechas de tours. Una fecha se oculta sola al día siguiente de "fin".
  // destino: se muestra solo si está lleno; "[DESTINO]" significa que falta el dato.
  // paquete: "bcs" o "chiapas" para que salga en la página de ese destino. Sin definir (null), sale en ambas.
  fechas: [
    { tour: { en: "Blue Whales / Constitución", es: "Ballena azul / Constitución" }, inicio: "2027-01-28", fin: "2027-02-02", destino: "Loreto, BCS", paquete: "bcs" },
    { tour: { en: "B. Juárez", es: "B. Juárez" }, inicio: "2027-03-11", fin: "2027-03-16", destino: "[DESTINO]", paquete: null },
    { tour: { en: "Easter", es: "Semana Santa" }, inicio: "2027-03-24", fin: "2027-03-29", destino: "[DESTINO]", paquete: null },
    { tour: { en: "Labor", es: "Día del Trabajo" }, inicio: "2027-04-29", fin: "2027-05-03", destino: "[DESTINO]", paquete: null }
  ],

  // Mensajes precargados de WhatsApp. Salen en español si el visitante eligió español
  // o si su navegador está en español; en inglés en cualquier otro caso.
  mensajesWhatsApp: {
    general: {
      en: "Hi! I saw the SpectaCulTours website and I'd like more information about the tours.",
      es: "Hola, vi la página de SpectaCulTours y me gustaría recibir informes de los tours."
    },
    loreto: {
      en: "Hi! I'm interested in the Blue Whale tour in Loreto, BCS. Could you send me more information?",
      es: "Hola, me interesa el tour de ballena azul en Loreto, BCS. ¿Me pueden dar informes?"
    },
    lagos: {
      en: "Hi! I'm interested in the Lagos de Colón, Chiapas tour. Could you send me more information?",
      es: "Hola, me interesa el tour a Lagos de Colón, Chiapas. ¿Me pueden dar informes?"
    },
    fast: {
      en: "Hi! I saw the FAST English website and I'd like information about the classes.",
      es: "Hola, vi la página de FAST English y me gustaría recibir informes de las clases."
    },
    fecha: {
      en: "Hi! I'm interested in the {tour} tour, {dates}. Are there spots available?",
      es: "Hola, me interesa el tour {tour} del {fechas}. ¿Hay lugares disponibles?"
    }
  },

  whatsapp: "525530071808",
  phone: "+525530071808",
  phoneDisplay: "+52 55 3007 1808",
  host: "Prof. Alaiyo Moreno",
  fastUrl: "/english/",
  currency: "€",

  tours: {
    chiapas: {
      reservation: 50,
      firstZoom: 200,
      secondZoom: 300,
      vipSolo: 250,
      vipCouple: 350
    },
    bcs: {
      reservation: 50,
      firstZoom: 200,
      secondZoom: 350,
      vipSolo: 300,
      vipCouple: 400
    }
  },

  social: {
    youtube: "https://www.youtube.com/@alaiyom3967",
    instagram: "",
    x: "",
    email: ""
  }
};

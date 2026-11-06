/*
 * SpectaCulTours — configuration.
 * Edit contact data, prices and links here. Leave a social URL empty ("") to hide it.
 *
 * fastUrl: where the "English classes" (FAST fluent English) links point.
 *   - "/english/" — the English site lives inside spectacultours.mx (default)
 *   - a full URL if it ever moves to its own domain.
 */
window.TOURS_CONFIG = {
  // Destino que va primero en la portada: "bcs" (Loreto y Mulegé) o "chiapas" (Lagos de Colón).
  // A partir de marzo, cambiar a "chiapas" y volver a desplegar.
  destinoDestacado: "bcs",

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

/*
 * SpectaCulTours — configuration.
 * Edit contact data, prices and links here. Leave a social URL empty ("") to hide it.
 *
 * fastUrl: where the "FAST fluent English" links point.
 *   - "/"  when the tours live inside the main site (e.g. example.com/tours/)
 *   - a full URL when the tours are served on their own subdomain
 *     (e.g. "https://fastfluentenglish.com").
 */
window.TOURS_CONFIG = {
  whatsapp: "525530071808",
  phone: "+525530071808",
  phoneDisplay: "+52 55 3007 1808",
  host: "Prof. Alaiyo Moreno",
  fastUrl: "/",
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

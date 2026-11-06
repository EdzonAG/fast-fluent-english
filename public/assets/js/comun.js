/*
 * Funciones compartidas por el sitio de tours y el de inglés.
 * Requiere tours-config.js antes.
 */
window.SITIO = (function () {
  "use strict";

  var CFG = window.TOURS_CONFIG;
  var MESES = {
    en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
  };
  var DIAS = {
    en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    es: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]
  };

  function aFecha(iso) {
    var p = iso.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  // EN: Thu, Jan 28 – Tue, Feb 2, 2027 · ES: jue 28 ene – mar 2 feb 2027
  function rangoFechas(inicio, fin, lang) {
    var a = aFecha(inicio), b = aFecha(fin);
    var mismoAnio = a.getFullYear() === b.getFullYear();
    if (lang === "es") {
      var parteEs = function (d) { return DIAS.es[d.getDay()] + " " + d.getDate() + " " + MESES.es[d.getMonth()]; };
      return parteEs(a) + (mismoAnio ? "" : " " + a.getFullYear()) + " – " + parteEs(b) + " " + b.getFullYear();
    }
    var parteEn = function (d) { return DIAS.en[d.getDay()] + ", " + MESES.en[d.getMonth()] + " " + d.getDate(); };
    return parteEn(a) + (mismoAnio ? "" : ", " + a.getFullYear()) + " – " + parteEn(b) + ", " + b.getFullYear();
  }

  // Una fecha sigue vigente hasta terminar su último día, en la hora del visitante.
  function fechasVigentes(pagina) {
    var hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return CFG.fechas.filter(function (f) {
      if (aFecha(f.fin) < hoy) return false;
      return !pagina || !f.paquete || f.paquete === pagina;
    });
  }

  function destinoLleno(destino) {
    return !!destino && !/^\s*(\[.*\])?\s*$/.test(destino);
  }

  function urlWhatsApp(texto) {
    return "https://wa.me/" + CFG.whatsapp + (texto ? "?text=" + encodeURIComponent(texto) : "");
  }

  return {
    rangoFechas: rangoFechas,
    fechasVigentes: fechasVigentes,
    destinoLleno: destinoLleno,
    urlWhatsApp: urlWhatsApp
  };
})();

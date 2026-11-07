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

  /* ---------------- Idioma elegido: se recuerda entre visitas y entre los dos sitios ---------------- */
  var CLAVE_IDIOMA = "fast-lang";
  function idiomaGuardado() {
    try { return localStorage.getItem(CLAVE_IDIOMA); } catch (e) { return null; }
  }
  function guardarIdioma(idioma) {
    try { localStorage.setItem(CLAVE_IDIOMA, idioma); } catch (e) { /* modo privado: dura esta página */ }
  }
  function iniciarBotonIdioma() {
    var btn = document.getElementById("langToggle");
    if (!btn) return;
    function etiqueta() {
      btn.setAttribute("aria-label", document.documentElement.lang === "es" ? "View in English" : "Ver en español");
    }
    new MutationObserver(etiqueta).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    etiqueta();
  }
  iniciarBotonIdioma();

  /* ---------------- Visor de imágenes: PhotoSwipe, se descarga al abrir la primera ---------------- */
  var VISOR = {
    en: { cerrar: "Close", zoom: "Zoom", anterior: "Previous", siguiente: "Next", error: "This image could not be loaded." },
    es: { cerrar: "Cerrar", zoom: "Acercar", anterior: "Anterior", siguiente: "Siguiente", error: "No se pudo cargar esta imagen." }
  };
  var visor = null;
  function cargarVisor() {
    if (!visor) {
      var hoja = new Promise(function (ok, mal) {
        var css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = document.body.dataset.pswpCss;
        css.onload = ok;
        css.onerror = mal;
        document.head.appendChild(css);
      });
      visor = Promise.all([import(document.body.dataset.pswpJs), hoja]).then(function (r) { return r[0].default; });
    }
    return visor;
  }
  // items: [{ src, width, height, alt }]. opciones.descarga: { href, nombre, texto } agrega un botón de descarga.
  function abrirVisor(items, i, opciones) {
    var descarga = opciones && opciones.descarga;
    cargarVisor().then(function (PhotoSwipe) {
      var v = VISOR[document.documentElement.lang === "es" ? "es" : "en"];
      var sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var pswp = new PhotoSwipe({
        dataSource: items,
        index: i,
        bgOpacity: 0.92,
        showHideAnimationType: sinMovimiento ? "none" : "fade",
        secondaryZoomLevel: 2,
        maxZoomLevel: 4,
        closeTitle: v.cerrar,
        zoomTitle: v.zoom,
        arrowPrevTitle: v.anterior,
        arrowNextTitle: v.siguiente,
        errorMsg: v.error
      });
      pswp.on("uiRegister", function () {
        pswp.ui.registerElement({
          name: "pie",
          className: "pswp__pie",
          appendTo: "root",
          onInit: function (el) { pswp.on("change", function () { el.textContent = pswp.currSlide.data.alt || ""; }); }
        });
        if (descarga) {
          pswp.ui.registerElement({
            name: "descarga",
            order: 8,
            isButton: true,
            tagName: "a",
            html: '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="margin:4px"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>',
            onInit: function (el) {
              el.href = descarga.href;
              el.setAttribute("download", descarga.nombre);
              el.setAttribute("aria-label", descarga.texto);
              el.title = descarga.texto;
            }
          });
        }
      });
      pswp.init();
    }).catch(function () { visor = null; window.open(items[i].src, "_blank", "noopener"); });
  }

  /* ---------------- WhatsApp ---------------- */
  // Español si el visitante eligió español o si su navegador empieza con "es".
  function idiomaWhatsApp(idiomaPagina) {
    var navegador = (navigator.language || "").toLowerCase();
    return idiomaPagina === "es" || navegador.indexOf("es") === 0 ? "es" : "en";
  }
  function mensajeWhatsApp(clave, idiomaPagina) {
    return CFG.mensajesWhatsApp[clave][idiomaWhatsApp(idiomaPagina)];
  }
  function mensajeFecha(f, idiomaPagina) {
    var l = idiomaWhatsApp(idiomaPagina);
    return CFG.mensajesWhatsApp.fecha[l].replace("{tour}", f.tour[l]).replace(/\{(fechas|dates)\}/, rangoFechas(f.inicio, f.fin, l));
  }

  /* ---------------- QR flotante ---------------- */
  function iniciarQR() {
    var btn = document.getElementById("qrAbrir"), modal = document.getElementById("qrModal");
    if (!btn || !modal) return;
    var cerrar = modal.querySelector(".qr-modal__cerrar");
    var img = modal.querySelector(".qr-modal__codigo");
    var etiqueta = btn.querySelector("span"), texto = modal.querySelector(".qr-modal__texto");

    function aplicarIdioma() {
      var d = CFG.qrTextos[document.documentElement.lang === "es" ? "es" : "en"];
      etiqueta.textContent = d.escanea;
      btn.setAttribute("aria-label", d.ampliar);
      texto.textContent = d.modal;
      modal.setAttribute("aria-label", d.modal);
      cerrar.setAttribute("aria-label", d.cerrar);
      img.alt = d.alt;
    }
    new MutationObserver(aplicarIdioma).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    aplicarIdioma();

    /* Tarjeta completa, mini u oculta según lo que tenga debajo. */
    var carta = null;
    function medir() {
      btn.classList.remove("qr--mini", "qr--oculto");
      var r = btn.getBoundingClientRect();
      carta = { izq: r.left, abajo: window.innerHeight - r.bottom, ancho: r.width, alto: r.height };
    }
    function cruza(a, b) { return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top; }
    function actualizar() {
      pendiente = false;
      if (!carta) medir();
      var H = window.innerHeight;
      var caja = { left: carta.izq, right: carta.izq + carta.ancho, top: H - carta.abajo - carta.alto, bottom: H - carta.abajo };
      var objetivos = document.querySelectorAll(".btn, .linkbtn, .seg button, input[type=range], .cv, .menu-card");
      var mini = H < 560;
      var i, r;
      for (i = 0; !mini && i < objetivos.length; i++) {
        r = objetivos[i].getBoundingClientRect();
        if (r.width && cruza(caja, r)) mini = true;
      }
      // Al abrir la página el QR se ve completo; al desplazarse deja leer la frase de la ballena y el título de la página.
      if (!mini && window.scrollY > 0) {
        var frases = document.querySelectorAll(".ballena__frase, .t-hero h2");
        for (i = 0; !mini && i < frases.length; i++) mini = cruza(caja, frases[i].getBoundingClientRect());
      }
      // data-titulo: dónde está el título dentro de la portada, en fracciones (x1,y1,x2,y2).
      var portadas = document.querySelectorAll(".portada__img img[data-titulo]");
      for (i = 0; !mini && i < portadas.length; i++) {
        r = portadas[i].getBoundingClientRect();
        var t = portadas[i].dataset.titulo.split(",");
        if (cruza(caja, { left: r.left + t[0] * r.width, top: r.top + t[1] * r.height, right: r.left + t[2] * r.width, bottom: r.top + t[3] * r.height })) mini = true;
      }
      btn.classList.toggle("qr--mini", mini);
      // Aun en mini se quita mientras pasa encima de un botón, para no taparlo.
      // Sobre el CV y el menú del inicio sí se queda: ahí no tapa el texto.
      var oculto = false;
      if (mini) {
        var m = btn.getBoundingClientRect();
        var cajaMini = { left: carta.izq, right: carta.izq + m.width, top: caja.bottom - m.height, bottom: caja.bottom };
        for (i = 0; !oculto && i < objetivos.length; i++) {
          r = objetivos[i].getBoundingClientRect();
          oculto = r.width > 0 && !objetivos[i].matches(".cv, .menu-card") && cruza(cajaMini, r);
        }
      }
      btn.classList.toggle("qr--oculto", oculto);
    }
    var pendiente = false;
    function programar() {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(actualizar);
    }
    window.addEventListener("scroll", programar, { passive: true });
    window.addEventListener("resize", function () { carta = null; programar(); });
    window.addEventListener("load", programar);
    programar();

    /* No estorba con el menú móvil ni con el panel de WhatsApp abiertos. */
    var estorbos = ["mMenu", "mobileMenu", "waPanel"].map(function (id) { return document.getElementById(id); }).filter(Boolean);
    function revisarEstorbos() {
      btn.hidden = estorbos.some(function (el) { return !el.hidden; });
    }
    estorbos.forEach(function (el) {
      new MutationObserver(revisarEstorbos).observe(el, { attributes: true, attributeFilter: ["hidden"] });
    });

    /* Modal */
    function abrir() {
      modal.hidden = false;
      document.documentElement.style.overflow = "hidden";
      cerrar.focus();
    }
    function ocultar() {
      modal.hidden = true;
      document.documentElement.style.overflow = "";
      btn.focus();
    }
    btn.addEventListener("click", abrir);
    cerrar.addEventListener("click", ocultar);
    modal.addEventListener("click", function (e) {
      if (!e.target.closest(".qr-modal__caja") && !e.target.closest(".qr-modal__cerrar")) ocultar();
    });
    document.addEventListener("keydown", function (e) {
      if (modal.hidden) return;
      if (e.key === "Escape") { e.stopPropagation(); ocultar(); }
      // El único elemento enfocable es cerrar: el foco no sale del modal.
      if (e.key === "Tab") { e.preventDefault(); cerrar.focus(); }
    });
  }
  iniciarQR();

  return {
    abrirVisor: abrirVisor,
    idiomaGuardado: idiomaGuardado,
    guardarIdioma: guardarIdioma,
    rangoFechas: rangoFechas,
    fechasVigentes: fechasVigentes,
    destinoLleno: destinoLleno,
    urlWhatsApp: urlWhatsApp,
    idiomaWhatsApp: idiomaWhatsApp,
    mensajeWhatsApp: mensajeWhatsApp,
    mensajeFecha: mensajeFecha
  };
})();

(function () {
  "use strict";

  var CFG = window.TOURS_CONFIG;
  var I18N = window.TOURS_I18N;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ICONS = document.body.dataset.icons || "assets/img/icons.svg";
  function icon(name) { return '<svg class="i"><use href="' + ICONS + "#" + name + '"/></svg>'; }

  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
    } catch (e) { return null; }
  }

  // Los textos de ballena viven en la configuración: el inglés ya viene en el HTML del build.
  if (CFG.ballena) {
    I18N.es["w.frase"] = CFG.ballena.frase.es;
    CFG.ballena.fotos.forEach(function (f, i) { I18N.es["w.foto." + i] = f.alt.es; });
    CFG.ballena.videos.forEach(function (v, i) { I18N.es["w.video." + i] = v.titulo.es; });
  }

  /* ---------------- Language (shared with the FAST English site) ---------------- */
  var EN = {};
  $$("[data-i18n]").forEach(function (el) { EN[el.dataset.i18n] = el.innerHTML; });
  $$("[data-i18n-alt]").forEach(function (el) { EN[el.dataset.i18nAlt] = el.alt; });
  $$("[data-i18n-aria]").forEach(function (el) { EN[el.dataset.i18nAria] = el.getAttribute("aria-label"); });
  var urlLang = (location.search.match(/[?&]lang=(en|es)\b/) || [])[1];
  // Abre en inglés salvo que el visitante haya elegido español con el botón del header (o ?lang=es).
  var lang = urlLang || SITIO.idiomaGuardado() || "en";
  function t(key) { var d = I18N.dynamic[lang]; return d[key] != null ? d[key] : I18N.dynamic.en[key]; }

  function applyLang() {
    document.documentElement.lang = lang;
    var dict = lang === "es" ? I18N.es : EN;
    $$("[data-i18n]").forEach(function (el) {
      var v = dict[el.dataset.i18n];
      if (v != null) el.innerHTML = v;
    });
    $$("[data-i18n-alt]").forEach(function (el) {
      var v = dict[el.dataset.i18nAlt];
      if (v != null) el.alt = v;
    });
    $$("[data-i18n-aria]").forEach(function (el) {
      var v = dict[el.dataset.i18nAria];
      if (v != null) el.setAttribute("aria-label", v);
    });
    updateWa();
    updatePrices();
    renderTimelines();
    renderFechas();
    $$("[data-vip]").forEach(updateVip);
  }
  var langBtn = $("#langToggle");
  if (langBtn) langBtn.addEventListener("click", function () {
    lang = lang === "en" ? "es" : "en";
    SITIO.guardarIdioma(lang);
    applyLang();
  });

  /* ---------------- Money ---------------- */
  function money(n, idioma) {
    var s = String(Math.round(n));
    s = s.replace(/\B(?=(\d{3})+(?!\d))/g, (idioma || lang) === "es" ? "." : ",");
    return CFG.currency + s;
  }
  function tourTotal(key) { var p = CFG.tours[key]; return p.reservation + p.firstZoom + p.secondZoom; }

  function updatePrices() {
    $$("[data-price]").forEach(function (el) { el.textContent = money(tourTotal(el.dataset.price)); });
    $$("[data-pay]").forEach(function (el) {
      var p = CFG.tours[el.dataset.pay];
      el.textContent = t("payLine").replace("{a}", money(p.reservation)).replace("{b}", money(p.firstZoom)).replace("{c}", money(p.secondZoom));
    });
    $$("[data-vipline]").forEach(function (el) {
      var p = CFG.tours[el.dataset.vipline];
      el.textContent = t("vipLine").replace("{s}", money(p.vipSolo)).replace("{c}", money(p.vipCouple));
    });
  }

  /* ---------------- Payment timeline ---------------- */
  function renderTimelines() {
    $$("[data-timeline]").forEach(function (ol) {
      var p = CFG.tours[ol.dataset.timeline];
      var amounts = [money(p.reservation), "+" + money(p.firstZoom), "+" + money(p.secondZoom), ""];
      var icons = ["calendar", "video", "video", "plane"];
      var steps = t("timeline");
      ol.innerHTML = steps.map(function (s, i) {
        return "<li><span class=\"timeline__dot\">" + icon(icons[i]) + "</span><span><b>" + s[0] + "</b><small>" + s[1] + "</small></span>" +
          '<span class="timeline__amt">' + amounts[i] + "</span></li>";
      }).join("");
      var total = document.createElement("div");
      total.className = "timeline__total";
      total.innerHTML = "<span>" + t("total") + "</span><span>" + money(tourTotal(ol.dataset.timeline)) + "</span>";
      if (ol.nextElementSibling && ol.nextElementSibling.classList.contains("timeline__total")) ol.nextElementSibling.remove();
      ol.after(total);
    });
  }

  /* ---------------- Fechas de tours ---------------- */
  function renderFechas() {
    $$("[data-fechas]").forEach(function (ul) {
      var lista = SITIO.fechasVigentes(ul.dataset.fechas);
      ul.closest("section").hidden = !lista.length;
      ul.innerHTML = lista.map(function (f) {
        return '<li class="fecha"><div class="fecha__info"><h3>' + f.tour[lang] + '</h3><p class="fecha__dias"><time datetime="' + f.inicio + '">' +
          SITIO.rangoFechas(f.inicio, f.fin, lang) + "</time></p>" +
          (SITIO.destinoLleno(f.destino) ? '<p class="fecha__destino">' + icon("pin") + "<span>" + f.destino + "</span></p>" : "") +
          '</div><a class="btn btn--wa" target="_blank" rel="noopener" href="' + SITIO.urlWhatsApp(SITIO.mensajeFecha(f, lang)).replace(/&/g, "&amp;") + '">' + icon("whatsapp") + "<span>" + t("reservar") + "</span></a></li>";
      }).join("");
    });
  }

  /* ---------------- VIP calculator ---------------- */
  function updateVip(box) {
    var key = box.dataset.vip;
    var p = CFG.tours[key];
    var type = (box.querySelector("[data-vip-type].is-active") || {}).dataset;
    type = type ? type.vipType : "solo";
    var range = box.querySelector("input[type=range]");
    var days = +range.value;
    var rate = type === "couple" ? p.vipCouple : p.vipSolo;
    var total = rate * days;
    box.querySelector('[data-vip-rate="solo"]').textContent = money(p.vipSolo) + " " + t("perDay");
    box.querySelector('[data-vip-rate="couple"]').textContent = money(p.vipCouple) + " " + t("perDay");
    box.querySelector("[data-vip-days]").textContent = days;
    box.querySelector("[data-vip-total]").textContent = money(total);
    var idiomaWa = SITIO.idiomaWhatsApp(lang), d = I18N.dynamic[idiomaWa];
    var msg = d.vipMsg.replace("{tour}", d.tourName[key]).replace("{type}", d[type]).replace("{days}", days).replace("{total}", money(total, idiomaWa));
    box.querySelector("[data-vip-wa]").href = waUrl(msg);
  }
  $$("[data-vip]").forEach(function (box) {
    $$("[data-vip-type]", box).forEach(function (b) {
      b.addEventListener("click", function () {
        $$("[data-vip-type]", box).forEach(function (x) { x.classList.toggle("is-active", x === b); });
        updateVip(box);
      });
    });
    box.querySelector("input[type=range]").addEventListener("input", function () { updateVip(box); });
  });

  /* ---------------- Config-driven links ---------------- */
  function waUrl(text) { return "https://wa.me/" + CFG.whatsapp + (text ? "?text=" + encodeURIComponent(text) : ""); }
  function updateWa() { $$("[data-wa]").forEach(function (a) { a.href = waUrl(SITIO.mensajeWhatsApp(a.dataset.wa, lang)); }); }
  // El botón flotante usa el mensaje de la sección que está a media pantalla.
  var waFlotante = $(".wa-fab__btn"), waBase = waFlotante ? waFlotante.dataset.wa : "general", waZonas = $$("[data-wa-context]");
  function contextoWa() {
    if (!waFlotante) return;
    var mitad = window.innerHeight / 2, contexto = waBase;
    waZonas.forEach(function (z) {
      var r = z.getBoundingClientRect();
      if (r.top <= mitad && r.bottom > mitad) contexto = z.dataset.waContext;
    });
    if (contexto === waFlotante.dataset.wa) return;
    waFlotante.dataset.wa = contexto;
    waFlotante.href = waUrl(SITIO.mensajeWhatsApp(contexto, lang));
  }
  $$("[data-tel]").forEach(function (a) { a.href = "tel:" + CFG.phone; });
  $$("[data-phone]").forEach(function (el) { el.textContent = CFG.phoneDisplay; });
  $$("[data-host]").forEach(function (el) { el.textContent = CFG.host; });
  $$("[data-fast]").forEach(function (a) { a.href = CFG.fastUrl + (a.dataset.fastHash || ""); });
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  $$("[data-social]").forEach(function (a) {
    var key = a.dataset.social;
    var url = key === "email" ? (CFG.social.email ? "mailto:" + CFG.social.email : "") : CFG.social[key];
    if (url) { a.href = url; } else if (a.closest(".social")) { a.remove(); }
  });

  /* ---------------- Nav ---------------- */
  var burger = $("#burger"), menu = $("#mMenu");
  function closeMenu() { menu.hidden = true; burger.setAttribute("aria-expanded", "false"); }
  burger.addEventListener("click", function () {
    var open = menu.hidden;
    menu.hidden = !open;
    burger.setAttribute("aria-expanded", String(open));
  });
  $$("a", menu).forEach(function (a) { a.addEventListener("click", closeMenu); });

  var navLinks = $$('.t-nav__links a[href^="#"]');
  var navSecs = navLinks.map(function (a) { return $(a.getAttribute("href")); });
  var tick = false;
  function markActive() {
    tick = false;
    contextoWa();
    var mid = window.innerHeight / 2, cur = -1;
    navSecs.forEach(function (s, i) { if (!s) return; var r = s.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) cur = i; });
    navLinks.forEach(function (a, i) { a.classList.toggle("is-active", i === cur); });
  }
  window.addEventListener("scroll", function () { if (!tick) { tick = true; requestAnimationFrame(markActive); } }, { passive: true });

  /* ---------------- Reveal ---------------- */
  if ("IntersectionObserver" in window && !reduceMotion) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var sibs = $$(".reveal", en.target.parentNode);
        en.target.style.transitionDelay = Math.min(Math.max(0, sibs.indexOf(en.target)) * 70, 350) + "ms";
        en.target.classList.add("is-in");
        obs.unobserve(en.target);
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
    $$(".reveal").forEach(function (el) {
      // Elements already on screen at load are shown right away (don't wait for the observer).
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("is-in");
      else obs.observe(el);
    });
  } else {
    $$(".reveal").forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------------- Overlay: videos ---------------- */
  var overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  document.body.appendChild(overlay);
  var lastFocus = null;

  function closeOverlay() {
    overlay.hidden = true;
    overlay.innerHTML = "";
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  // El iframe se crea hasta aquí: antes del clic no se carga nada de YouTube.
  function showVideo(id, title) {
    lastFocus = document.activeElement;
    overlay.setAttribute("aria-label", title);
    overlay.innerHTML = '<button class="overlay__close" type="button" aria-label="' + t("close") + '">' + icon("close") + "</button>" +
      '<div class="overlay__frame"><iframe src="https://www.youtube-nocookie.com/embed/' + id +
      '?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>' +
      '<span class="overlay__fin" tabindex="0"></span>';
    overlay.querySelector("iframe").title = title;
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    overlay.querySelector(".overlay__close").focus();
  }
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay || e.target.closest(".overlay__close")) closeOverlay();
  });
  // Foco atrapado: al salir del video por el final regresa a cerrar, y al revés.
  overlay.addEventListener("focusin", function (e) {
    if (e.target.classList.contains("overlay__fin")) overlay.querySelector(".overlay__close").focus();
  });
  document.addEventListener("keydown", function (e) {
    if (overlay.hidden) { if (e.key === "Escape" && !menu.hidden) closeMenu(); return; }
    if (e.key === "Escape") closeOverlay();
    if (e.key === "Tab" && e.shiftKey && document.activeElement === overlay.querySelector(".overlay__close")) {
      e.preventDefault();
      overlay.querySelector("iframe").focus();
    }
  });
  $$("[data-video]").forEach(function (b) {
    b.addEventListener("click", function () {
      var cap = b.querySelector("[data-i18n^='w.video']") || b.querySelector(".tile__cap b, .vcard__body");
      showVideo(b.dataset.video, cap ? cap.textContent.trim() : "SpectaCulTours video");
    });
  });

  /* ---------------- Visor de fotos: PhotoSwipe, se descarga al abrir la primera foto ---------------- */
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
  function abrirVisor(items, i) {
    cargarVisor().then(function (PhotoSwipe) {
      var v = t("viewer");
      var pswp = new PhotoSwipe({
        dataSource: items,
        index: i,
        bgOpacity: 0.92,
        showHideAnimationType: reduceMotion ? "none" : "fade",
        secondaryZoomLevel: 2,
        maxZoomLevel: 4,
        closeTitle: t("close"),
        zoomTitle: v.zoom,
        arrowPrevTitle: v.prev,
        arrowNextTitle: v.next,
        errorMsg: v.error
      });
      pswp.on("uiRegister", function () {
        pswp.ui.registerElement({
          name: "pie",
          className: "pswp__pie",
          appendTo: "root",
          onInit: function (el) { pswp.on("change", function () { el.textContent = pswp.currSlide.data.alt || ""; }); }
        });
      });
      pswp.init();
    }).catch(function () { visor = null; window.open(items[i].src, "_blank", "noopener"); });
  }
  function itemDe(im) {
    return { src: im.dataset.full || im.currentSrc || im.src, width: +im.dataset.fullW || im.naturalWidth, height: +im.dataset.fullH || im.naturalHeight, alt: im.alt };
  }
  $$("[data-photo]").forEach(function (b) {
    b.addEventListener("click", function () {
      abrirVisor([{ src: b.dataset.photo, width: +b.dataset.fullW, height: +b.dataset.fullH, alt: (b.querySelector(".tile__cap b") || {}).textContent || "" }], 0);
    });
  });
  $$("[data-gallery]").forEach(function (g) {
    var items = $$("button", g);
    items.forEach(function (b, i) {
      b.addEventListener("click", function () {
        abrirVisor(items.map(function (x) { return itemDe(x.querySelector("img")); }), i);
      });
    });
  });
  // Every other photo opens full size too (links, video tiles and logos keep their own action).
  // Arrows/swipe browse the photos of the same section.
  var zoomable = $$("main img").filter(function (im) { return !im.closest("a, button, .portada, [class*='logo']"); });
  zoomable.forEach(function (im) {
    im.classList.add("zoomable");
    im.tabIndex = 0;
    im.setAttribute("role", "button");
    if (!im.alt) im.setAttribute("aria-label", "Open photo");
    function open() {
      var group = zoomable.filter(function (x) { return x.closest("section") === im.closest("section"); });
      abrirVisor(group.map(itemDe), group.indexOf(im));
    }
    im.addEventListener("click", open);
    im.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });
  });

  /* ---------------- WhatsApp tip ---------------- */
  var fab = $(".wa-fab");
  if (fab && !store("tours-tip-seen")) {
    setTimeout(function () {
      fab.classList.add("show-tip");
      setTimeout(function () { fab.classList.remove("show-tip"); store("tours-tip-seen", "1"); }, 5000);
    }, 6000);
  }

  applyLang();
  markActive();
})();

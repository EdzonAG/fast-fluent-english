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

  /* ---------------- Language (shared with the FAST English site) ---------------- */
  var EN = {};
  $$("[data-i18n]").forEach(function (el) { EN[el.dataset.i18n] = el.innerHTML; });
  var urlLang = (location.search.match(/[?&]lang=(en|es)\b/) || [])[1];
  var lang = urlLang || store("fast-lang") || ((navigator.language || "en").toLowerCase().indexOf("es") === 0 ? "es" : "en");
  function t(key) { var d = I18N.dynamic[lang]; return d[key] != null ? d[key] : I18N.dynamic.en[key]; }

  function applyLang() {
    document.documentElement.lang = lang;
    var dict = lang === "es" ? I18N.es : EN;
    $$("[data-i18n]").forEach(function (el) {
      var v = dict[el.dataset.i18n];
      if (v != null) el.innerHTML = v;
    });
    updateWa();
    updatePrices();
    renderTimelines();
    $$("[data-vip]").forEach(updateVip);
  }
  var langBtn = $("#langToggle");
  if (langBtn) langBtn.addEventListener("click", function () {
    lang = lang === "en" ? "es" : "en";
    store("fast-lang", lang);
    applyLang();
  });

  /* ---------------- Money ---------------- */
  function money(n) {
    var s = String(Math.round(n));
    s = s.replace(/\B(?=(\d{3})+(?!\d))/g, lang === "es" ? "." : ",");
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
    var msg = t("vipMsg").replace("{tour}", t("tourName")[key]).replace("{type}", t(type)).replace("{days}", days).replace("{total}", money(total));
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
  function updateWa() { $$("[data-wa]").forEach(function (a) { a.href = waUrl(t(a.dataset.wa)); }); }
  $$("[data-tel]").forEach(function (a) { a.href = "tel:" + CFG.phone; });
  $$("[data-phone]").forEach(function (el) { el.textContent = CFG.phoneDisplay; });
  $$("[data-host]").forEach(function (el) { el.textContent = CFG.host; });
  $$("[data-fast]").forEach(function (a) { a.href = CFG.fastUrl; });
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  $$("[data-social]").forEach(function (a) {
    var key = a.dataset.social;
    var url = key === "email" ? (CFG.social.email ? "mailto:" + CFG.social.email : "") : CFG.social[key];
    if (url) { a.href = url; } else if (a.closest(".social")) { a.remove(); }
  });

  /* ---------------- Nav ---------------- */
  var nav = $("#nav"), burger = $("#burger"), menu = $("#mMenu");
  function onScroll() { nav.classList.toggle("is-scrolled", window.scrollY > 24 || !menu.hidden); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  function closeMenu() { menu.hidden = true; burger.setAttribute("aria-expanded", "false"); onScroll(); }
  burger.addEventListener("click", function () {
    var open = menu.hidden;
    menu.hidden = !open;
    burger.setAttribute("aria-expanded", String(open));
    onScroll();
  });
  $$("a", menu).forEach(function (a) { a.addEventListener("click", closeMenu); });

  var navLinks = $$('.t-nav__links a[href^="#"]');
  var navSecs = navLinks.map(function (a) { return $(a.getAttribute("href")); });
  var tick = false;
  function markActive() {
    tick = false;
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

  /* ---------------- Overlay: videos & photos ---------------- */
  var overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  document.body.appendChild(overlay);
  var gallery = [], gIndex = 0, lastFocus = null;

  function openOverlay(html) {
    lastFocus = document.activeElement;
    overlay.innerHTML = '<button class="overlay__close" type="button" aria-label="Close">' + icon("close") + "</button>" + html;
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    overlay.querySelector(".overlay__close").focus();
  }
  function closeOverlay() {
    overlay.hidden = true;
    overlay.innerHTML = "";
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  function showVideo(id) {
    openOverlay('<div class="overlay__frame"><iframe src="https://www.youtube-nocookie.com/embed/' + id +
      '?autoplay=1&rel=0" title="SpectaCulTours video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>');
  }
  function showPhoto(i) {
    gIndex = (i + gallery.length) % gallery.length;
    var img = gallery[gIndex];
    var nav = gallery.length > 1
      ? '<button class="overlay__nav overlay__nav--prev" type="button" aria-label="Previous">' + icon("arrow") + "</button>" +
        '<button class="overlay__nav overlay__nav--next" type="button" aria-label="Next">' + icon("arrow") + "</button>"
      : "";
    openOverlay('<figure style="margin:0;text-align:center"><img class="overlay__img" src="' + img.src + '" alt="' + (img.alt || "") + '">' +
      (img.alt ? '<figcaption class="overlay__cap">' + img.alt + "</figcaption>" : "") + "</figure>" + nav);
  }
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay || e.target.closest(".overlay__close")) closeOverlay();
    else if (e.target.closest(".overlay__nav--prev")) showPhoto(gIndex - 1);
    else if (e.target.closest(".overlay__nav--next")) showPhoto(gIndex + 1);
  });
  document.addEventListener("keydown", function (e) {
    if (overlay.hidden) { if (e.key === "Escape" && !menu.hidden) closeMenu(); return; }
    if (e.key === "Escape") closeOverlay();
    if (gallery.length && overlay.querySelector(".overlay__img")) {
      if (e.key === "ArrowLeft") showPhoto(gIndex - 1);
      if (e.key === "ArrowRight") showPhoto(gIndex + 1);
    }
  });

  $$("[data-video]").forEach(function (b) { b.addEventListener("click", function () { showVideo(b.dataset.video); }); });
  $$("[data-photo]").forEach(function (b) {
    b.addEventListener("click", function () {
      gallery = [{ src: b.dataset.photo, alt: (b.querySelector(".tile__cap b") || {}).textContent || "" }];
      showPhoto(0);
    });
  });
  $$("[data-gallery]").forEach(function (g) {
    var items = $$("button", g);
    items.forEach(function (b, i) {
      b.addEventListener("click", function () {
        gallery = items.map(function (x) { var im = x.querySelector("img"); return { src: im.src, alt: im.alt }; });
        showPhoto(i);
      });
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

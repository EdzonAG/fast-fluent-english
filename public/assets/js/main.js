(function () {
  "use strict";

  var CFG = window.FAST_CONFIG;
  var I18N = window.FAST_I18N;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Storage (never required) ---------------- */
  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
    } catch (e) { return null; }
  }
  // Per-tab memory: a language switch survives navigation within the visit only.
  function session(key, val) {
    try {
      if (val === undefined) return sessionStorage.getItem(key);
      sessionStorage.setItem(key, val);
    } catch (e) { return null; }
  }

  /* ---------------- Language ---------------- */
  var EN = {};
  $$("[data-i18n]").forEach(function (el) { EN[el.dataset.i18n] = el.innerHTML; });
  $$("[data-i18n-placeholder]").forEach(function (el) { EN[el.dataset.i18nPlaceholder] = el.placeholder; });

  // English is always the default; Spanish only via the footer switch (or ?lang=es).
  var urlLang = (location.search.match(/[?&]lang=(en|es)\b/) || [])[1];
  var lang = urlLang || session("fast-lang") || "en";

  function t(key) { return I18N.dynamic[lang][key] != null ? I18N.dynamic[lang][key] : I18N.dynamic.en[key]; }

  function applyLang() {
    document.documentElement.lang = lang;
    var dict = lang === "es" ? I18N.es : EN;
    $$("[data-i18n]").forEach(function (el) {
      var v = dict[el.dataset.i18n];
      if (v != null) el.innerHTML = v;
    });
    $$("[data-i18n-placeholder]").forEach(function (el) {
      var v = dict[el.dataset.i18nPlaceholder];
      if (v != null) el.placeholder = v;
    });
    updateWaLinks();
    updatePrices();
    renderQuiz();
    rotatorIndex = 0;
    setRotator();
  }

  $("#langToggle").addEventListener("click", function () {
    lang = lang === "en" ? "es" : "en";
    session("fast-lang", lang);
    applyLang();
  });

  /* ---------------- Config-driven links ---------------- */
  function waUrl(text) {
    return "https://wa.me/" + CFG.whatsapp + (text ? "?text=" + encodeURIComponent(text) : "");
  }
  function updateWaLinks() {
    $$("[data-wa]").forEach(function (a) { a.href = waUrl(t(a.dataset.wa)); });
  }
  $$("[data-tel]").forEach(function (a) { a.href = "tel:" + CFG.phone; });
  $$("[data-phone]").forEach(function (el) { el.textContent = CFG.phoneDisplay; });
  $$("[data-teacher]").forEach(function (el) { el.textContent = CFG.teacher; });
  $$("[data-calendly]").forEach(function (a) { a.href = CFG.calendly; });
  $$("[data-tours]").forEach(function (a) { a.href = CFG.toursUrl + a.dataset.tours; });
  $$("[data-social]").forEach(function (a) {
    var key = a.dataset.social;
    var url = key === "email" ? (CFG.email ? "mailto:" + CFG.email : "") : CFG.social[key];
    if (url) { a.href = url; } else { a.remove(); }
  });
  $("#year").textContent = new Date().getFullYear();

  /* ---------------- Calendly popup (lazy) ---------------- */
  var calendlyLoading = null;
  function loadCalendly() {
    if (calendlyLoading) return calendlyLoading;
    calendlyLoading = new Promise(function (resolve, reject) {
      var css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://assets.calendly.com/assets/external/widget.css";
      document.head.appendChild(css);
      var s = document.createElement("script");
      s.src = "https://assets.calendly.com/assets/external/widget.js";
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return calendlyLoading;
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-calendly]");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    closeMenu();
    loadCalendly().then(function () {
      window.Calendly.initPopupWidget({ url: CFG.calendly + "?hide_gdpr_banner=1" });
    }).catch(function () {
      window.open(CFG.calendly, "_blank", "noopener");
    });
  });

  /* ---------------- Nav ---------------- */
  var nav = $("#nav");
  var burger = $("#burger");
  var menu = $("#mobileMenu");
  function onScroll() { nav.classList.toggle("is-scrolled", window.scrollY > 24 || !menu.hidden); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function closeMenu() {
    menu.hidden = true;
    burger.setAttribute("aria-expanded", "false");
    onScroll();
  }
  burger.addEventListener("click", function () {
    var open = menu.hidden;
    menu.hidden = !open;
    burger.setAttribute("aria-expanded", String(open));
    onScroll();
  });
  $$("a", menu).forEach(function (a) { a.addEventListener("click", closeMenu); });

  // Active section highlight
  var navLinks = $$('.nav__links a[href^="#"]');
  var navSecs = navLinks.map(function (a) { return $(a.getAttribute("href")); });
  var navTick = false;
  function markActive() {
    navTick = false;
    var mid = window.innerHeight / 2, current = -1;
    navSecs.forEach(function (sec, i) {
      if (!sec) return;
      var r = sec.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) current = i;
    });
    navLinks.forEach(function (a, i) { a.classList.toggle("is-active", i === current); });
  }
  window.addEventListener("scroll", function () {
    if (!navTick) { navTick = true; requestAnimationFrame(markActive); }
  }, { passive: true });
  markActive();

  /* ---------------- Reveal + counters ---------------- */
  function countUp(el) {
    var target = +el.dataset.count, suffix = el.dataset.suffix || "";
    if (reduceMotion) { el.textContent = target + suffix; return; }
    var start = null, dur = 1400;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if ("IntersectionObserver" in window) {
    var revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        // stagger siblings in grids
        var sibs = $$(".reveal", el.parentNode);
        var idx = Math.max(0, sibs.indexOf(el));
        el.style.transitionDelay = Math.min(idx * 70, 350) + "ms";
        el.classList.add("is-in");
        $$("[data-count]", el).forEach(countUp);
        if (el.querySelector("#donut") || el.id === "donut") animateDonut();
        revObs.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    $$(".reveal").forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        el.classList.add("is-in");
        $$("[data-count]", el).forEach(countUp);
      } else {
        revObs.observe(el);
      }
    });
  } else {
    $$(".reveal").forEach(function (el) { el.classList.add("is-in"); });
    $$("[data-count]").forEach(countUp);
  }

  function animateDonut() {
    if (reduceMotion) return;
    var d = $("#donut");
    d.style.transition = "none";
    d.style.setProperty("--p", 0);
    void d.offsetWidth;
    d.style.transition = "";
    requestAnimationFrame(function () { d.style.setProperty("--p", 80); });
  }

  /* ---------------- Hero rotator ---------------- */
  var rotEl = $("#rotator");
  var rotatorIndex = 0;
  function setRotator() { rotEl.textContent = t("rotator")[rotatorIndex]; }
  if (!reduceMotion) {
    setInterval(function () {
      rotEl.classList.add("is-out");
      setTimeout(function () {
        rotatorIndex = (rotatorIndex + 1) % t("rotator").length;
        setRotator();
        rotEl.classList.remove("is-out");
      }, 350);
    }, 2400);
  }

  /* ---------------- Method tabs ---------------- */
  var tabs = $$(".tab");
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (x) { x.classList.toggle("is-active", x === tab); x.setAttribute("aria-selected", String(x === tab)); });
      $$(".tabpanel").forEach(function (p) { p.classList.toggle("is-active", p.dataset.panel === tab.dataset.tab); });
    });
  });

  /* ---------------- Video (lite YouTube embed) ---------------- */
  var player = $("#player");
  function loadVideo(id, autoplay) {
    player.dataset.id = id;
    if (autoplay) {
      player.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id +
        '?autoplay=1&rel=0" title="FAST English video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
    } else {
      player.innerHTML = '<img class="player__thumb" src="https://i.ytimg.com/vi/' + id + '/hqdefault.jpg" alt="FAST English video">' +
        '<button class="player__play" type="button" aria-label="Play video"><svg class="i"><use href="#i-play"/></svg></button>';
    }
  }
  player.addEventListener("click", function (e) {
    if (e.target.closest(".player__play, .player__thumb")) loadVideo(player.dataset.id, true);
  });
  $$(".vlist__item").forEach(function (b) {
    b.addEventListener("click", function () {
      $$(".vlist__item").forEach(function (x) { x.classList.toggle("is-active", x === b); });
      loadVideo(b.dataset.video, true);
      if (window.innerWidth < 980) player.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    });
  });
  // Buttons elsewhere on the page (e.g. the testimonial) that open a video in the player
  $$("[data-play-video]").forEach(function (b) {
    b.addEventListener("click", function () {
      var id = b.dataset.playVideo;
      $$(".vlist__item").forEach(function (x) { x.classList.toggle("is-active", x.dataset.video === id); });
      loadVideo(id, true);
      player.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    });
  });

  /* ---------------- Level quiz ---------------- */
  var quizEl = $("#quiz");
  var answers = [];
  var qStep = -1; // -1 = intro, 0..n-1 questions, n = result
  function levelFor(score) {
    // 6 questions × 0–3 points = 0–18
    if (score <= 3) return "A1";
    if (score <= 6) return "A2";
    if (score <= 9) return "B1";
    if (score <= 12) return "B2";
    if (score <= 15) return "C1";
    return "C2";
  }
  function renderQuiz() {
    var Q = t("quiz");
    var n = Q.qs.length;
    var html;
    if (qStep < 0) {
      html = '<div class="quiz__start quiz__step"><svg class="i"><use href="#i-spark"/></svg>' +
        "<h3>" + Q.startTitle + "</h3><p>" + Q.startText + "</p>" +
        '<button class="btn btn--primary btn--lg" type="button" data-q="start">' + Q.start + ' <svg class="i"><use href="#i-arrow"/></svg></button></div>';
    } else if (qStep < n) {
      var item = Q.qs[qStep];
      html = '<div class="quiz__progress"><span>' + Q.question + " " + (qStep + 1) + " " + Q.of + " " + n + '</span>' +
        '<div class="quiz__bar"><span style="width:' + ((qStep) / n * 100) + '%"></span></div></div>' +
        '<div class="quiz__step"><p class="quiz__q">' + item.q + '</p><div class="quiz__opts">' +
        item.o.map(function (o, i) {
          return '<button class="quiz__opt' + (answers[qStep] === i ? " is-picked" : "") + '" type="button" data-a="' + i + '"><i>' + "ABCD"[i] + "</i>" + o + "</button>";
        }).join("") + "</div></div>" +
        (qStep > 0 ? '<button class="quiz__back" type="button" data-q="back">' + Q.back + "</button>" : "");
    } else {
      var score = answers.reduce(function (a, b) { return a + b; }, 0);
      var lvl = levelFor(score);
      var info = Q.levels[lvl];
      var msg = t("wa.level").replace("{level}", lvl + " (" + info[0] + ")");
      html = '<div class="quiz__progress"><span>' + Q.resultTitle + '</span><div class="quiz__bar"><span style="width:100%"></span></div></div>' +
        '<div class="result quiz__step"><div class="result__level">' + lvl + '</div>' +
        '<p class="result__name">' + info[0] + "</p><p>" + info[1] + "</p>" +
        '<div class="result__ctas">' +
        '<a class="btn btn--primary" href="' + CFG.calendly + '" data-calendly target="_blank" rel="noopener"><svg class="i"><use href="#i-calendar"/></svg>' + Q.bookCall + "</a>" +
        '<a class="btn btn--wa" href="' + waUrl(msg) + '" target="_blank" rel="noopener"><svg class="i"><use href="#i-whatsapp"/></svg>' + Q.sendWa + "</a></div>" +
        "<small>" + Q.resultNote + '</small><button class="quiz__back" style="align-self:center" type="button" data-q="retry">' + Q.retry + "</button></div>";
    }
    quizEl.innerHTML = html;
  }
  quizEl.addEventListener("click", function (e) {
    var opt = e.target.closest("[data-a]");
    var ctl = e.target.closest("[data-q]");
    if (opt) {
      answers[qStep] = +opt.dataset.a;
      opt.classList.add("is-picked");
      setTimeout(function () { qStep++; renderQuiz(); }, 220);
    } else if (ctl) {
      var a = ctl.dataset.q;
      if (a === "start") { qStep = 0; answers = []; }
      if (a === "back") { qStep = Math.max(0, qStep - 1); }
      if (a === "retry") { qStep = 0; answers = []; }
      renderQuiz();
    }
  });

  /* ---------------- Prices ---------------- */
  var priceView = "month";
  function fmt(n) {
    var cur = CFG.prices.currency;
    var s = n % 1 === 0 ? String(n) : n.toFixed(2);
    if (lang === "es") s = s.replace(".", ",");
    return cur + s;
  }
  function updatePrices() {
    $$("[data-price]").forEach(function (el) {
      var monthly = CFG.prices[el.dataset.price];
      var perWeek = +el.dataset.perWeek;
      var classesPerMonth = perWeek * 52 / 12;
      var value = priceView === "month" ? monthly : Math.round(monthly / classesPerMonth * 100) / 100;
      el.textContent = fmt(value);
      el.classList.remove("is-swap");
      void el.offsetWidth;
      el.classList.add("is-swap");
    });
    $$("[data-per]").forEach(function (el) { el.textContent = priceView === "month" ? t("perMonth") : "≈ " + t("perClass"); });
  }
  $$(".switch__btn").forEach(function (b) {
    b.addEventListener("click", function () {
      priceView = b.dataset.view;
      $$(".switch__btn").forEach(function (x) { x.classList.toggle("is-active", x === b); });
      updatePrices();
    });
  });

  /* ---------------- WhatsApp widget ---------------- */
  var wa = $("#wa"), waPanel = $("#waPanel"), waFab = $("#waFab");
  function setWa(open) {
    waPanel.hidden = !open;
    wa.classList.toggle("is-open", open);
    waFab.setAttribute("aria-expanded", String(open));
    if (open) { wa.classList.add("seen"); store("fast-wa-seen", "1"); }
  }
  if (store("fast-wa-seen")) wa.classList.add("seen");
  waFab.addEventListener("click", function () { setWa(waPanel.hidden); });
  $("#waClose").addEventListener("click", function () { setWa(false); });
  $$("[data-wa-quick]").forEach(function (b) {
    b.addEventListener("click", function () { window.open(waUrl(t(b.dataset.waQuick)), "_blank", "noopener"); });
  });
  $("#waForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var v = $("#waInput").value.trim();
    window.open(waUrl(v || t("wa.hello")), "_blank", "noopener");
    $("#waInput").value = "";
  });

  /* ---------------- Lightbox ---------------- */
  var lb = $("#lightbox");
  function setLb(open) { lb.hidden = !open; document.body.style.overflow = open ? "hidden" : ""; }
  $("#openBrochure").addEventListener("click", function () { setLb(true); });
  lb.addEventListener("click", function (e) { if (e.target === lb || e.target.closest(".lightbox__close")) setLb(false); });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!lb.hidden) setLb(false);
    if (!waPanel.hidden) setWa(false);
    if (!menu.hidden) closeMenu();
  });

  /* ---------------- Init ---------------- */
  applyLang();
})();

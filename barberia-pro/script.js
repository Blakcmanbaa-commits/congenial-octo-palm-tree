/* =====================================================================
   NAVAJA & ROBLE — script.js
   ===================================================================== */

/* ---------------------------------------------------------------------
   CONFIGURACIÓN DEL NEGOCIO  ← edita esto al personalizar por cliente
   ------------------------------------------------------------------- */
const BOOKING_URL      = "";              // URL de tu sistema de reservas (Booksy, Treatwell, Fresha…).
                                          // Si se deja vacío, el botón hace scroll a la sección de reserva.
const WHATSAPP_NUMBER  = "34600000000";   // Número con prefijo país, sin "+" ni espacios.
const WHATSAPP_MESSAGE = "¡Hola! Me gustaría reservar una cita en Navaja & Roble.";
/* ------------------------------------------------------------------- */

(function () {
  "use strict";
  const root = document.documentElement;
  root.classList.add("js");

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---- Año en el footer ------------------------------------------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- Botones de reserva ----------------------------------------- */
  // Si BOOKING_URL está vacío, el href="#reserva" original hace scroll suave.
  $$(".js-book").forEach((el) => {
    if (BOOKING_URL) {
      el.setAttribute("href", BOOKING_URL);
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener");
    }
  });

  /* ---- WhatsApp flotante ------------------------------------------ */
  const wa = $("#waFloat");
  if (wa) {
    wa.href = "https://wa.me/" + WHATSAPP_NUMBER +
      "?text=" + encodeURIComponent(WHATSAPP_MESSAGE);
  }

  /* ---- Header compacto al hacer scroll ---------------------------- */
  const header = $(".site-header");
  const onScroll = () => header && header.classList.toggle("is-scrolled", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---- Menú móvil ------------------------------------------------- */
  const toggle = $("#navToggle");
  const menu   = $("#mobileMenu");
  const openMenu = (open) => {
    if (!toggle || !menu) return;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    menu.classList.toggle("is-open", open);
    menu.setAttribute("aria-hidden", String(!open));
    document.body.style.overflow = open ? "hidden" : "";
    if (open) { const first = $("a", menu); first && first.focus(); }
  };
  if (toggle && menu) {
    toggle.addEventListener("click", () =>
      openMenu(toggle.getAttribute("aria-expanded") !== "true"));
    $$("a", menu).forEach((a) => a.addEventListener("click", () => openMenu(false)));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.classList.contains("is-open")) {
        openMenu(false); toggle.focus();
      }
    });
  }

  /* ---- Reveal al hacer scroll ------------------------------------- */
  const reveals = $$(".reveal");
  if (prefersReduced || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("is-visible"));
  } else {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const sibs = el.parentElement ? $$(":scope > .reveal", el.parentElement) : [el];
        const i = Math.max(0, sibs.indexOf(el));
        el.style.transitionDelay = Math.min(i * 80, 320) + "ms";
        el.classList.add("is-visible");
        obs.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach((el) => io.observe(el));
  }

  /* ---- Resaltar enlace de navegación activo ----------------------- */
  const sections = ["servicios", "galeria", "equipo", "contacto"]
    .map((id) => document.getElementById(id)).filter(Boolean);
  const navLinks = new Map($$(".nav__link").map((a) => [a.getAttribute("href"), a]));
  if (sections.length && "IntersectionObserver" in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const link = navLinks.get("#" + e.target.id);
        if (link && e.isIntersecting) {
          navLinks.forEach((l) => l.removeAttribute("aria-current"));
          link.setAttribute("aria-current", "true");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((s) => spy.observe(s));
  }

  /* ---- Resaltar el día de hoy en el horario ----------------------- */
  const todayRow = $('.hours__row[data-day="' + new Date().getDay() + '"]');
  if (todayRow) todayRow.classList.add("is-today");

  /* ---- Contador de cifras ----------------------------------------- */
  // Cada .stat__num tiene un número y, opcionalmente, un sufijo en <em> (K, ★).
  const runCount = (el) => {
    const em = el.querySelector("em");
    const suffix = em ? em.outerHTML : "";
    const baseText = (el.childNodes[0] ? el.childNodes[0].textContent : el.textContent).trim();
    if (!/^[\d.,]+$/.test(baseText)) return;
    const hasDecimal = baseText.includes(",");
    const target = parseFloat(baseText.replace(",", "."));
    const dur = 1100, t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const val = target * (1 - Math.pow(1 - p, 3)); // easeOutCubic
      const num = hasDecimal ? val.toFixed(1).replace(".", ",") : Math.round(val).toString();
      el.innerHTML = num + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else el.innerHTML = baseText + suffix;
    };
    requestAnimationFrame(tick);
  };
  const stats = $$(".stat__num");
  if (stats.length && !prefersReduced && "IntersectionObserver" in window) {
    const sObs = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        runCount(e.target);
        obs.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    stats.forEach((s) => sObs.observe(s));
  }
})();

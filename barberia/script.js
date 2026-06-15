/* ================================================================== */
/*  NAVAJA & ROBLE — script.js                                        */
/* ================================================================== */

/* ------------------------------------------------------------------ */
/*  CONFIGURACIÓN  (SUSTITUIR por cliente)                            */
/* ------------------------------------------------------------------ */

/* URL de la plataforma de reservas (Booksy, Fresha, Treatwell, etc.).
 * ▸ Si la dejas VACÍA (""), todos los botones "Reservar" hacen scroll
 *   al formulario de la página (#reservar).
 * ▸ Si pones una URL, los botones llevarán a esa plataforma externa. */
const BOOKING_URL = "";

/* WhatsApp del negocio en formato internacional SIN "+", espacios ni guiones.
 * Ej.: España 600 123 456  ->  "34600123456" */
const WHATSAPP_NUMBER = "34600123456";

/* Mensaje con el que se abre WhatsApp desde el botón flotante */
const WHATSAPP_MESSAGE = "¡Hola! Me gustaría reservar una cita en Navaja & Roble.";

/* Nombre del negocio (se usa en el mensaje de reserva por WhatsApp) */
const BUSINESS_NAME = "Navaja & Roble";

/* ------------------------------------------------------------------ */
/*  Utilidades                                                        */
/* ------------------------------------------------------------------ */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* ------------------------------------------------------------------ */
/*  Año dinámico en el footer                                         */
/* ------------------------------------------------------------------ */
const yearEl = $("#year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ------------------------------------------------------------------ */
/*  Header: se compacta al hacer scroll                               */
/* ------------------------------------------------------------------ */
const header = $(".site-header");
const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 40);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

/* ------------------------------------------------------------------ */
/*  Navegación móvil (menú hamburguesa)                               */
/* ------------------------------------------------------------------ */
const navToggle = $(".nav-toggle");
const nav = $("#nav-principal");
const backdrop = $(".nav-backdrop");

function setMenu(open) {
  nav.classList.toggle("is-open", open);
  navToggle.setAttribute("aria-expanded", String(open));
  navToggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  backdrop.hidden = !open;
  // Pequeño retardo para permitir la transición de opacidad del backdrop
  requestAnimationFrame(() => backdrop.classList.toggle("is-visible", open));
  document.body.style.overflow = open ? "hidden" : "";
}

navToggle.addEventListener("click", () => setMenu(navToggle.getAttribute("aria-expanded") !== "true"));
backdrop.addEventListener("click", () => setMenu(false));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
// Cerrar el menú al pulsar cualquier enlace de navegación
$$(".nav__link").forEach((link) => link.addEventListener("click", () => setMenu(false)));

/* ------------------------------------------------------------------ */
/*  Botones de reserva: destino según BOOKING_URL                     */
/* ------------------------------------------------------------------ */
const bookButtons = $$("[data-book]");
if (BOOKING_URL) {
  // Plataforma externa: todos los botones abren la URL en una pestaña nueva
  bookButtons.forEach((btn) => {
    btn.setAttribute("href", BOOKING_URL);
    btn.setAttribute("target", "_blank");
    btn.setAttribute("rel", "noopener");
  });
}
// Si una tarjeta de servicio tiene data-service, preseleccionamos el servicio
// en el formulario antes de hacer scroll (solo cuando usamos el formulario interno).
const serviceSelect = $("#bf-service");
$$("[data-service]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (BOOKING_URL || !serviceSelect) return;
    const value = btn.getAttribute("data-service");
    const match = $$("option", serviceSelect).find((o) => o.value === value || o.textContent.trim() === value);
    if (match) serviceSelect.value = match.value || match.textContent.trim();
  });
});

/* ------------------------------------------------------------------ */
/*  Enlaces de WhatsApp                                               */
/* ------------------------------------------------------------------ */
function whatsappLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
$$("[data-whatsapp]").forEach((el) => {
  el.setAttribute("href", whatsappLink(WHATSAPP_MESSAGE));
  el.setAttribute("target", "_blank");
  el.setAttribute("rel", "noopener");
});

/* ------------------------------------------------------------------ */
/*  Formulario de reserva                                             */
/*  Demo sin backend: al enviar componemos un mensaje de WhatsApp con  */
/*  los datos y lo abrimos. En producción, conectar a un backend o a   */
/*  la plataforma de reservas (Booksy/Fresha/Treatwell).               */
/* ------------------------------------------------------------------ */
const form = $("#booking-form");
const feedback = $("#booking-feedback");

if (form) {
  // No permitir reservar en fechas pasadas
  const dateInput = $("#bf-date");
  if (dateInput) dateInput.min = new Date().toISOString().split("T")[0];

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      feedback.textContent = "Revisa los campos obligatorios, por favor.";
      feedback.className = "booking__form-note is-error";
      form.reportValidity();
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    const lines = [
      `Hola, quiero reservar una cita en ${BUSINESS_NAME}:`,
      `• Nombre: ${data.name}`,
      `• Teléfono: ${data.phone}`,
      `• Servicio: ${data.service}`,
      `• Día: ${data.date}  Hora: ${data.time}`,
    ];
    if (data.notes && data.notes.trim()) lines.push(`• Comentarios: ${data.notes.trim()}`);

    // Abrimos WhatsApp con la solicitud prerrellenada
    window.open(whatsappLink(lines.join("\n")), "_blank", "noopener");

    feedback.textContent = `¡Gracias, ${data.name}! Te hemos abierto WhatsApp para confirmar la cita. Si no se ha abierto, llámanos al +34 910 555 123.`;
    feedback.className = "booking__form-note is-success";
    form.reset();
  });
}

/* ------------------------------------------------------------------ */
/*  Animaciones de aparición al hacer scroll (fade-up)                */
/*  Respeta prefers-reduced-motion (no observa si está activo).        */
/* ------------------------------------------------------------------ */
const reveals = $$(".reveal");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (prefersReducedMotion || !("IntersectionObserver" in window)) {
  reveals.forEach((el) => el.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  reveals.forEach((el) => observer.observe(el));
}

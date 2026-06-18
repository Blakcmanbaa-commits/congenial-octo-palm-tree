/* =====================================================================
   NAVAJA & ROBLE — Módulo de reserva interactivo (estilo Booksy)
   booking.js  ·  100% cliente. El envío real de email/SMS se conecta
   poniendo una URL de backend en BOOKING.endpoint (ver abajo).
   ===================================================================== */
(function () {
  "use strict";

  /* ===================================================================
     CONFIGURACIÓN  ← edita aquí al personalizar por cliente
     =================================================================== */
  const BOOKING = {
    business: "Navaja & Roble",
    address:  "Calle de Fuencarral 78, Malasaña, 28004 Madrid",
    // Backend que recibe la reserva y envía email/SMS + avisa al barbero.
    // Si se deja vacío, la cita se confirma en pantalla y se puede
    // descargar como .ics (no se envía nada por su cuenta todavía).
    endpoint: "",
    busyProbability: 0.30,   // simulación de huecos ocupados (0–1)
    monthsAhead: 3,
  };

  // Servicios (nombre, descripción, precio €, duración min, categoría)
  const SERVICES = [
    { id: "corte",    name: "Corte",               desc: "Lavado, corte a tijera o máquina y peinado.", price: 15, min: 30, cat: "Cortes" },
    { id: "corte-barba", name: "Corte + Barba",    desc: "El ritual completo con toalla caliente.",     price: 22, min: 45, cat: "Cortes" },
    { id: "infantil", name: "Corte infantil",      desc: "Para los más pequeños (hasta 12 años).",      price: 12, min: 30, cat: "Cortes" },
    { id: "barba",    name: "Arreglo de barba",    desc: "Perfilado, recorte y aceite hidratante.",     price: 10, min: 20, cat: "Barba" },
    { id: "afeitado", name: "Afeitado a navaja",   desc: "Apurado clásico con toalla caliente.",        price: 18, min: 30, cat: "Barba" },
    { id: "capilar",  name: "Tratamiento capilar", desc: "Diagnóstico, masaje y tratamiento.",          price: 20, min: 40, cat: "Tratamientos" },
  ];

  // Barberos (id, nombre, especialidad, valoración, inicial para el avatar)
  const BARBERS = [
    { id: "any",  name: "Cualquiera", any: true },
    { id: "mario", name: "Mario", role: "Degradados",        rating: 4.9, initial: "M" },
    { id: "ivan",  name: "Iván",  role: "Afeitado clásico",  rating: 5.0, initial: "I" },
    { id: "leo",   name: "Leo",   role: "Estilismo",         rating: 5.0, initial: "L" },
  ];
  const REAL_BARBERS = BARBERS.filter((b) => !b.any);

  // Horario: 0=Dom … 6=Sáb. [apertura, cierre] en horas, o null si cerrado.
  const HOURS = { 0: null, 1: [10, 21], 2: [10, 21], 3: [10, 21], 4: [10, 21], 5: [10, 21], 6: [10, 20] };

  const STEP = 15; // minutos entre huecos
  const STEPS = ["service", "barber", "datetime", "details", "done"];
  const PERIODS = [
    { id: "manana",   label: "Mañana",   test: (m) => m < 12 * 60 },
    { id: "mediodia", label: "Mediodía", test: (m) => m >= 12 * 60 && m < 17 * 60 },
    { id: "tarde",    label: "Tarde",    test: (m) => m >= 17 * 60 },
  ];

  /* ===================================================================
     ESTADO
     =================================================================== */
  const state = {
    step: "service",
    services: [],         // ids
    barber: null,         // id
    date: null,           // Date (medianoche)
    time: null,           // "HH:MM"
    filter: null,         // periodo activo o null
    calMonth: startOfMonth(new Date()),
    customer: {},
  };

  /* ===================================================================
     UTILIDADES
     =================================================================== */
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const pad = (n) => String(n).padStart(2, "0");
  const hhmm = (m) => pad(Math.floor(m / 60)) + ":" + pad(m % 60);
  const eur = (n) => n.toFixed(2).replace(".", ",") + " €";
  function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
  function isoDate(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function sameDay(a, b) { return a && b && isoDate(a) === isoDate(b); }
  function todayMid() { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  function svc(id) { return SERVICES.find((s) => s.id === id); }
  function barber(id) { return BARBERS.find((b) => b.id === id); }
  function totalPrice() { return state.services.reduce((s, id) => s + svc(id).price, 0); }
  function totalDur() { const d = state.services.reduce((s, id) => s + svc(id).min, 0); return d || 30; }
  function durLabel(min) { const h = Math.floor(min / 60), m = min % 60; return (h ? h + " h " : "") + (m ? m + " min" : "").trim() || "0 min"; }

  // ---- Disponibilidad simulada (determinista) -----------------------
  function blockBusy(iso, barberId, m) {
    return (hashStr(iso + "|" + barberId + "|" + m) % 1000) / 1000 < BOOKING.busyProbability;
  }
  function isFree(date, barberId, minute, dur) {
    if (barberId === "any") return REAL_BARBERS.some((b) => isFree(date, b.id, minute, dur));
    const iso = isoDate(date);
    for (let m = minute; m < minute + dur; m += STEP) if (blockBusy(iso, barberId, m)) return false;
    return true;
  }
  function freeSlots(date, barberId, dur) {
    const oh = HOURS[date.getDay()];
    if (!oh) return [];
    const last = oh[1] * 60 - dur, out = [];
    for (let m = oh[0] * 60; m <= last; m += STEP) if (isFree(date, barberId, m, dur)) out.push(m);
    return out;
  }
  function dayInfo(date) {
    if (date < todayMid() || !HOURS[date.getDay()]) return { free: 0, off: true };
    return { free: freeSlots(date, state.barber || "any", totalDur()).length, off: false };
  }

  /* ===================================================================
     REFERENCIAS DOM
     =================================================================== */
  let root, dlg, mainEl, summaryEl, continueBtn, backBtn, totalEl, cartEl, pickEl, addMoreBtn, noteEl, lastFocus;

  function build() {
    root = $("#booking");
    if (!root) return false;
    dlg = $(".bk__dialog", root);
    mainEl = $("#bkMain", root);
    continueBtn = $("#bkContinue", root);
    backBtn = $("[data-bk-back]", root);
    totalEl = $("#bkTotal", root);
    cartEl = $("#bkCart", root);
    pickEl = $("#bkPick", root);
    addMoreBtn = $("[data-bk-addmore]", root);
    noteEl = $("#bkNote", root);
    summaryEl = $("#bkSummary", root);
    return true;
  }

  /* ===================================================================
     APERTURA / CIERRE
     =================================================================== */
  function open() {
    document.body.style.overflow = "hidden";
    root.classList.add("is-open");
    root.setAttribute("aria-hidden", "false");
    lastFocus = document.activeElement;
    goStep(state.step);
    const f = $(".bk__close", root); f && f.focus();
  }
  function close() {
    root.classList.remove("is-open", "is-done");
    root.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    lastFocus && lastFocus.focus && lastFocus.focus();
  }

  /* ===================================================================
     NAVEGACIÓN ENTRE PASOS
     =================================================================== */
  function goStep(name) {
    state.step = name;
    $$("[data-step]", mainEl).forEach((s) => (s.hidden = s.getAttribute("data-step") !== name));
    // pasos UI
    const idx = STEPS.indexOf(name);
    $$(".bk__step", root).forEach((li) => {
      const i = STEPS.indexOf(li.getAttribute("data-s"));
      li.classList.toggle("is-active", i === idx);
      li.classList.toggle("is-done", i < idx);
    });
    backBtn.hidden = idx <= 0 || name === "done";
    root.classList.toggle("is-done", name === "done");
    summaryEl.hidden = name === "done";
    mainEl.scrollTop = 0;

    if (name === "service") renderServices();
    if (name === "barber") renderBarbers();
    if (name === "datetime") renderDateTime();
    if (name === "done") renderDone();

    renderSummary();
    mainEl.scrollTop = 0;
  }
  function next() {
    const i = STEPS.indexOf(state.step);
    if (state.step === "details") return submit();
    if (i < STEPS.length - 1) goStep(STEPS[i + 1]);
  }
  function back() {
    const i = STEPS.indexOf(state.step);
    if (i > 0) goStep(STEPS[i - 1]);
  }

  /* ===================================================================
     PASO 1 · SERVICIOS
     =================================================================== */
  function renderServices() {
    const host = $("#bkServices", root);
    const cats = [...new Set(SERVICES.map((s) => s.cat))];
    host.innerHTML = cats.map((cat) => {
      const rows = SERVICES.filter((s) => s.cat === cat).map((s) => {
        const on = state.services.includes(s.id);
        return `<button type="button" class="bk-svc${on ? " is-picked" : ""}" data-svc="${s.id}" aria-pressed="${on}">
          <span class="bk-svc__name">${s.name}</span>
          <span class="bk-svc__price">${eur(s.price)}</span>
          <span class="bk-svc__meta">${s.desc} · ${durLabel(s.min)}</span>
          <span class="bk-svc__add" aria-hidden="true">${on ? "✓" : "+"}</span>
        </button>`;
      }).join("");
      return `<div class="bk-cat">${cat}</div>${rows}`;
    }).join("");
    $$(".bk-svc", host).forEach((b) => b.addEventListener("click", () => toggleService(b.getAttribute("data-svc"))));
  }
  function toggleService(id) {
    const i = state.services.indexOf(id);
    if (i >= 0) state.services.splice(i, 1); else state.services.push(id);
    state.time = null; // cambia la duración → recalcular huecos
    renderServices();
    renderSummary();
  }

  /* ===================================================================
     PASO 2 · PROFESIONALES
     =================================================================== */
  function renderBarbers() {
    const host = $("#bkBarbers", root);
    host.innerHTML = BARBERS.map((b) => {
      const on = state.barber === b.id;
      const av = b.any
        ? `<span class="bk-pro__av bk-pro__any" aria-hidden="true">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="30" height="30"><circle cx="9" cy="8" r="3"/><circle cx="16" cy="9" r="2.5"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M14 19a5 5 0 0 1 7 0"/></svg>
           </span>`
        : `<span class="bk-pro__av" aria-hidden="true">${b.initial}</span>`;
      const meta = b.any
        ? `<span class="bk-pro__rating">Máxima disponibilidad</span>`
        : `<span class="bk-pro__rating"><b>★ ${b.rating.toFixed(1)}</b> · ${b.role}</span>`;
      return `<button type="button" class="bk-pro${on ? " is-picked" : ""}" data-bar="${b.id}" aria-pressed="${on}">
        ${av}<span class="bk-pro__name">${b.name}</span>${meta}</button>`;
    }).join("");
    $$(".bk-pro", host).forEach((b) => b.addEventListener("click", () => {
      state.barber = b.getAttribute("data-bar");
      state.time = null;
      renderBarbers();
      renderSummary();
    }));
  }

  /* ===================================================================
     PASO 3 · FECHA Y HORA
     =================================================================== */
  function renderDateTime() {
    renderCalendar();
    renderSlots();
  }
  function renderCalendar() {
    const host = $("#bkCal", root);
    const m = state.calMonth;
    const first = new Date(m.getFullYear(), m.getMonth(), 1);
    const startWd = (first.getDay() + 6) % 7; // lunes=0
    const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const monthName = m.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    const minMonth = startOfMonth(new Date());
    const maxMonth = startOfMonth(new Date(new Date().getFullYear(), new Date().getMonth() + BOOKING.monthsAhead, 1));
    const wds = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

    let cells = "";
    for (let i = 0; i < startWd; i++) cells += `<button class="bk-day is-empty" disabled tabindex="-1"></button>`;
    for (let d = 1; d <= days; d++) {
      const date = new Date(m.getFullYear(), m.getMonth(), d);
      const info = dayInfo(date);
      const sel = sameDay(date, state.date);
      const lvl = info.off || info.free === 0 ? 0 : info.free > 10 ? 3 : info.free >= 6 ? 2 : 1;
      const dis = info.off || info.free === 0;
      cells += `<button class="bk-day${sel ? " is-selected" : ""}${lvl ? " lvl-" + lvl : ""}" data-d="${isoDate(date)}"${dis ? " disabled" : ""}>
        ${d}<span class="bk-day__dot"></span></button>`;
    }

    host.innerHTML = `
      <div class="bk-cal__top">
        <div class="bk-cal__month">${monthName}</div>
        <div class="bk-cal__nav">
          <button type="button" data-mv="-1" aria-label="Mes anterior"${m <= minMonth ? " disabled" : ""}>‹</button>
          <button type="button" data-mv="1" aria-label="Mes siguiente"${m >= maxMonth ? " disabled" : ""}>›</button>
        </div>
      </div>
      <div class="bk-cal__grid">${wds.map((w) => `<div class="bk-cal__wd">${w}</div>`).join("")}${cells}</div>
      <div class="bk-legend">
        <span><i style="background:#4caf6e"></i> +10 huecos</span>
        <span><i style="background:#d9a13a"></i> 6–10</span>
        <span><i style="background:#d4763a"></i> 1–5</span>
      </div>`;

    $$(".bk-cal__nav button", host).forEach((b) => b.addEventListener("click", () => {
      state.calMonth = new Date(m.getFullYear(), m.getMonth() + Number(b.getAttribute("data-mv")), 1);
      renderCalendar();
    }));
    $$(".bk-day[data-d]", host).forEach((b) => b.addEventListener("click", () => {
      if (b.disabled) return;
      const [y, mo, da] = b.getAttribute("data-d").split("-").map(Number);
      state.date = new Date(y, mo - 1, da);
      state.time = null;
      renderCalendar();
      renderSlots();
      renderSummary();
    }));
  }
  function renderSlots() {
    const host = $("#bkSlots", root);
    if (!state.date) { host.innerHTML = `<p class="bk-empty">Elige primero un día en el calendario.</p>`; return; }
    const all = freeSlots(state.date, state.barber || "any", totalDur());
    const filtered = state.filter ? all.filter((m) => PERIODS.find((p) => p.id === state.filter).test(m)) : all;

    const filters = PERIODS.map((p) => {
      const n = all.filter((m) => p.test(m)).length;
      const on = state.filter === p.id;
      return `<button type="button" class="bk-filter${on ? " is-on" : ""}" data-f="${p.id}"${n ? "" : " disabled"}>${p.label} (${n})</button>`;
    }).join("");

    let body;
    if (!all.length) {
      body = `<p class="bk-empty">No quedan huecos este día. Prueba con otra fecha o con “Cualquiera”.</p>`;
    } else {
      body = PERIODS.map((p) => {
        const list = filtered.filter((m) => p.test(m));
        if (!list.length) return "";
        return `<div class="bk-period"><div class="bk-period__t">${p.label}</div>
          <div class="bk-slots">${list.map((m) => `<button type="button" class="bk-slot${state.time === hhmm(m) ? " is-selected" : ""}" data-t="${hhmm(m)}">${hhmm(m)}</button>`).join("")}</div></div>`;
      }).join("");
    }

    const dateLabel = state.date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
    host.innerHTML = `<p class="bk__sub" style="text-transform:capitalize">${dateLabel}</p>
      <div class="bk-filters">${filters}<button type="button" class="bk-filter${state.filter ? "" : " is-on"}" data-f="">Todo</button></div>
      <div class="bk-slots-wrap">${body}</div>`;

    $$(".bk-filter", host).forEach((b) => b.addEventListener("click", () => { state.filter = b.getAttribute("data-f") || null; renderSlots(); }));
    $$(".bk-slot", host).forEach((b) => b.addEventListener("click", () => { state.time = b.getAttribute("data-t"); renderSlots(); renderSummary(); }));
  }

  /* ===================================================================
     PASO 4 · ENVÍO / VALIDACIÓN
     =================================================================== */
  function submit() {
    const form = $("#bkForm", root);
    const name = $("#bkName", form), phone = $("#bkPhone", form), email = $("#bkEmail", form), priv = $("#bkPrivacy", form);
    const setErr = (el, msg) => {
      el.classList.toggle("is-err", !!msg);
      const e = $(`.bk-err[data-for="${el.name || el.id}"]`, form);
      if (e) e.textContent = msg || "";
    };
    let ok = true;
    if (!name.value.trim()) { setErr(name, "Dinos tu nombre."); ok = false; } else setErr(name, "");
    if (!/^[+\d][\d\s().-]{6,}$/.test(phone.value.trim())) { setErr(phone, "Teléfono no válido."); ok = false; } else setErr(phone, "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim())) { setErr(email, "Email no válido."); ok = false; } else setErr(email, "");
    const pe = $('.bk-err[data-for="privacy"]', form);
    if (!priv.checked) { if (pe) pe.textContent = "Debes aceptar la política."; ok = false; } else if (pe) pe.textContent = "";
    if (!ok) { const bad = $(".is-err", form); bad && bad.focus(); return; }

    state.customer = { name: name.value.trim(), phone: phone.value.trim(), email: email.value.trim(), notes: $("#bkNotes", form).value.trim() };
    finalize();
  }

  function bookingPayload() {
    const [hh, mm] = state.time.split(":");
    const start = new Date(state.date); start.setHours(+hh, +mm, 0, 0);
    const end = new Date(start.getTime() + totalDur() * 60000);
    return {
      business: BOOKING.business,
      services: state.services.map((id) => ({ id, name: svc(id).name, price: svc(id).price, min: svc(id).min })),
      barber: barber(state.barber).name,
      start: start.toISOString(), end: end.toISOString(),
      price: totalPrice(), duration: totalDur(),
      customer: state.customer,
    };
  }

  function finalize() {
    // Intento de envío real si hay backend configurado (no bloquea la confirmación).
    if (BOOKING.endpoint) {
      try {
        fetch(BOOKING.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bookingPayload()) }).catch(() => {});
      } catch (e) {}
    }
    goStep("done");
  }

  /* ===================================================================
     PASO 5 · CONFIRMACIÓN + .ics
     =================================================================== */
  function renderDone() {
    const host = $("#bkDone", root);
    const [hh, mm] = state.time.split(":");
    const start = new Date(state.date); start.setHours(+hh, +mm, 0, 0);
    const when = start.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }) + " · " + state.time + " h";
    const svcNames = state.services.map((id) => svc(id).name).join(" + ");
    host.innerHTML = `
      <div class="bk-done__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg></div>
      <h3>¡Cita confirmada!</h3>
      <p>Gracias, ${state.customer.name.split(" ")[0]}. Te enviaremos la confirmación y los recordatorios a <b>${state.customer.email}</b>${BOOKING.endpoint ? "" : ""}.</p>
      <div class="bk-done__card">
        <div class="bk-done__row"><span>Servicio</span><b>${svcNames}</b></div>
        <div class="bk-done__row"><span>Profesional</span><b>${barber(state.barber).name}</b></div>
        <div class="bk-done__row"><span>Cuándo</span><b style="text-transform:capitalize">${when}</b></div>
        <div class="bk-done__row"><span>Duración</span><b>${durLabel(totalDur())}</b></div>
        <div class="bk-done__row"><span>Lugar</span><b>${BOOKING.address}</b></div>
        <div class="bk-done__row"><span>Total</span><b>${eur(totalPrice())}</b></div>
      </div>
      <div class="bk-done__actions">
        <button type="button" class="btn btn--primary" id="bkIcs">Añadir a mi calendario</button>
        <button type="button" class="btn btn--ghost" data-bk-close>Hecho</button>
      </div>`;
    $("#bkIcs", host).addEventListener("click", downloadIcs);
    $$("[data-bk-close]", host).forEach((b) => b.addEventListener("click", reset));
  }

  function downloadIcs() {
    const p = bookingPayload();
    const fmt = (iso) => iso.replace(/[-:]/g, "").split(".")[0] + "Z";
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Navaja y Roble//Reserva//ES", "BEGIN:VEVENT",
      "UID:" + Date.now() + "@navajayroble", "DTSTAMP:" + fmt(new Date().toISOString()),
      "DTSTART:" + fmt(p.start), "DTEND:" + fmt(p.end),
      "SUMMARY:" + p.services.map((s) => s.name).join(" + ") + " — " + BOOKING.business,
      "LOCATION:" + BOOKING.address,
      "DESCRIPTION:Cita con " + p.barber + ". Total " + eur(p.price) + ".",
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "cita-navaja-roble.ics";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function reset() {
    Object.assign(state, { step: "service", services: [], barber: null, date: null, time: null, filter: null, calMonth: startOfMonth(new Date()), customer: {} });
    const form = $("#bkForm", root); if (form) form.reset();
    close();
    setTimeout(() => goStep("service"), 50);
  }

  /* ===================================================================
     RESUMEN (carrito) + botón Continuar
     =================================================================== */
  function renderSummary() {
    // carrito de servicios
    if (!state.services.length) {
      cartEl.innerHTML = `<p class="bk-cart__empty">Aún no has elegido servicio.</p>`;
    } else {
      cartEl.innerHTML = state.services.map((id) => {
        const s = svc(id);
        return `<div class="bk-cart__item">
          <span class="bk-cart__name">${s.name}</span>
          <span class="bk-cart__price">${eur(s.price)}</span>
          <button type="button" class="bk-cart__rm" data-rm="${id}" aria-label="Quitar ${s.name}">×</button>
          <span class="bk-cart__meta">${durLabel(s.min)}</span></div>`;
      }).join("");
      $$("[data-rm]", cartEl).forEach((b) => b.addEventListener("click", () => toggleService(b.getAttribute("data-rm"))));
    }

    // selección de barbero / fecha
    const bits = [];
    if (state.barber) bits.push(`<div class="bk-pick">Profesional: <b>${barber(state.barber).name}</b></div>`);
    if (state.date && state.time) {
      const d = state.date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
      bits.push(`<div class="bk-pick" style="text-transform:capitalize">Cuándo: <b>${d} · ${state.time} h</b></div>`);
    }
    pickEl.innerHTML = bits.join("");

    addMoreBtn.hidden = !(state.step === "barber" || state.step === "datetime" || state.step === "details") || !state.services.length;

    totalEl.textContent = state.services.length ? eur(totalPrice()) : "—";
    $("#bkDur") && ($("#bkDur").textContent = state.services.length ? durLabel(totalDur()) : "");

    // estado del botón Continuar
    let label = "Continuar", ok = false;
    if (state.step === "service") ok = state.services.length > 0;
    else if (state.step === "barber") ok = !!state.barber;
    else if (state.step === "datetime") ok = !!(state.date && state.time);
    else if (state.step === "details") { ok = true; label = "Confirmar cita"; }
    continueBtn.textContent = label;
    continueBtn.disabled = !ok;

    noteEl.textContent = state.step === "details"
      ? "Recibirás confirmación y recordatorio."
      : (state.endpoint ? "" : "");
  }

  /* ===================================================================
     ARRANQUE
     =================================================================== */
  function init() {
    if (!build()) return;

    // Abrir desde cualquier botón .js-book (si no hay sistema externo)
    const external = (typeof BOOKING_URL !== "undefined" && BOOKING_URL);
    $$(".js-book").forEach((el) => {
      if (external) return; // deja que abra el sistema externo configurado
      el.addEventListener("click", (e) => { e.preventDefault(); open(); });
    });

    continueBtn.addEventListener("click", next);
    backBtn.addEventListener("click", back);
    addMoreBtn.addEventListener("click", () => goStep("service"));
    $$("[data-bk-close]", root).forEach((b) => { if (!b.closest("#bkDone")) b.addEventListener("click", close); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && root.classList.contains("is-open")) close(); });

    window.__openBooking = open; // para pruebas / enlaces externos
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

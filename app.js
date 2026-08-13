/* Szwajcaria 2026 — app logic: tabs, stop cards, Leaflet maps */

(function () {
  "use strict";

  const state = {
    data: null,
    maps: {}, // dayId -> Leaflet map instance
    activeDay: null,
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    try {
      const res = await fetch("data.json");
      state.data = await res.json();
    } catch (err) {
      document.getElementById("day-panels").innerHTML =
        '<p style="padding:1.5rem;text-align:center;">Nie udało się wczytać danych wycieczki (data.json). Odśwież stronę.</p>';
      console.error(err);
      return;
    }

    renderHeader();
    renderTabs();
    renderDayPanels();
    renderAccommodation();
    renderBookingInfo();
    renderPackingList();
    renderInfo();
    renderEmergencyContacts();
    renderCashBudget();

    // Auto-select today's day if within trip dates, else first day
    const today = new Date().toISOString().slice(0, 10);
    const todayDay = state.data.days.find((d) => d.date === today);
    activateDay(todayDay ? todayDay.id : state.data.days[0].id);
  }

  function renderHeader() {
    const { trip } = state.data;
    document.getElementById("trip-subtitle").textContent = trip.subtitle;
    document.getElementById("trip-dates").textContent = trip.date_range;
  }

  function renderTabs() {
    const nav = document.getElementById("day-tabs");
    nav.innerHTML = "";
    state.data.days.forEach((day, i) => {
      const btn = document.createElement("button");
      btn.className = "day-tab";
      btn.type = "button";
      btn.dataset.day = day.id;
      btn.innerHTML = `
        <span class="day-tab__num">Dzień ${i + 1}</span>
        <span class="day-tab__label">${escapeHtml(shortLabel(day))}</span>
      `;
      btn.addEventListener("click", () => activateDay(day.id));
      nav.appendChild(btn);
    });
  }

  function shortLabel(day) {
    const weekday = day.weekday || "";
    return weekday;
  }

  function renderDayPanels() {
    const main = document.getElementById("day-panels");
    main.innerHTML = "";
    state.data.days.forEach((day) => {
      const panel = document.createElement("section");
      panel.className = "day-panel";
      panel.id = `panel-${day.id}`;

      const header = document.createElement("div");
      header.className = "day-panel__header";
      header.innerHTML = `
        <h2 class="day-panel__label">${escapeHtml(day.label)}</h2>
        <div class="day-panel__meta">
          <span><strong>${escapeHtml(day.weekday)}</strong> · ${escapeHtml(formatDate(day.date))}</span>
          ${day.base_note ? `<span>${escapeHtml(day.base_note)}</span>` : ""}
        </div>
      `;
      panel.appendChild(header);

      const planBHtml = day.plan_b
        ? `<div class="plan-b-banner">🌧️ <strong>Plan B (zła pogoda):</strong> ${escapeHtml(day.plan_b)}</div>`
        : "";

      const mapDiv = document.createElement("div");
      mapDiv.className = "map-container";
      mapDiv.id = `map-${day.id}`;
      panel.appendChild(mapDiv);

      if (day.plan_b) {
        const planBEl = document.createElement("div");
        planBEl.innerHTML = planBHtml;
        panel.appendChild(planBEl.firstElementChild);
      }

      const list = document.createElement("ul");
      list.className = "stops-list";
      day.stops.forEach((stop) => {
        list.appendChild(renderStopCard(stop));
      });
      panel.appendChild(list);

      main.appendChild(panel);
    });
  }

  function renderStopCard(stop) {
    const li = document.createElement("li");
    li.className = "stop-card";

    let mediaHtml = "";
    if (stop.image) {
      mediaHtml = `<img class="stop-card__image" src="${escapeAttr(stop.image)}" alt="${escapeAttr(stop.name)}" loading="lazy" />`;
    } else if (!stop.skip_photo) {
      mediaHtml = `<div class="stop-card__placeholder"><span>${escapeHtml(stop.name)}</span></div>`;
    }

    const notesHtml = stop.notes
      ? `<p class="stop-card__notes">⚠️ ${escapeHtml(stop.notes)}</p>`
      : "";

    const foodTipHtml = stop.food_tip
      ? `<p class="stop-card__food-tip">🍽️ ${escapeHtml(stop.food_tip)}</p>`
      : "";

    const descriptionHtml = stop.description
      ? `<p class="stop-card__description">${escapeHtml(stop.description)}</p>`
      : "";

    const linkHtml = stop.link
      ? `<a class="stop-card__link" href="${escapeAttr(stop.link)}" target="_blank" rel="noopener noreferrer">Więcej info</a>`
      : "";

    const directionsHtml = stop.directions_link
      ? `<a class="stop-card__directions" href="${escapeAttr(stop.directions_link)}" target="_blank" rel="noopener noreferrer">🗺️ Pokaż trasę (Google Maps)</a>`
      : "";

    const ticketHtml = stop.ticket_image
      ? `<a class="stop-card__ticket" href="${escapeAttr(stop.ticket_image)}" target="_blank" rel="noopener noreferrer">
           <img src="${escapeAttr(stop.ticket_image)}" alt="Bilet – ${escapeAttr(stop.name)}" loading="lazy" />
           <span>🎫 Bilet kupiony — pokaż QR</span>
         </a>`
      : "";

    li.innerHTML = `
      ${mediaHtml}
      <div class="stop-card__body">
        <div class="stop-card__top">
          <span class="stop-card__time">${escapeHtml(stop.time || "")}</span>
          <span class="stop-card__name">${escapeHtml(stop.name)}</span>
        </div>
        ${descriptionHtml}
        ${notesHtml}
        ${foodTipHtml}
        ${directionsHtml}
        ${ticketHtml}
        ${linkHtml}
      </div>
    `;
    return li;
  }

  function activateDay(dayId) {
    state.activeDay = dayId;

    document.querySelectorAll(".day-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.day === dayId);
    });
    document.querySelectorAll(".day-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `panel-${dayId}`);
    });

    ensureMap(dayId);
  }

  function ensureMap(dayId) {
    const day = state.data.days.find((d) => d.id === dayId);
    if (!day) return;

    if (state.maps[dayId]) {
      // Panel was hidden (display:none) so Leaflet needs a nudge to recompute size
      setTimeout(() => state.maps[dayId].invalidateSize(), 50);
      return;
    }

    const points = day.stops
      .filter((s) => typeof s.lat === "number" && typeof s.lon === "number")
      .map((s) => ({ lat: s.lat, lon: s.lon, name: s.name, time: s.time }));

    if (points.length === 0) return;

    const map = L.map(`map-${dayId}`, {
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const latlngs = points.map((p) => [p.lat, p.lon]);

    points.forEach((p, i) => {
      const marker = L.marker([p.lat, p.lon], {
        title: p.name,
      }).addTo(map);
      marker.bindPopup(`<strong>${i + 1}. ${escapeHtml(p.name)}</strong>${p.time ? `<br>${escapeHtml(p.time)}` : ""}`);
    });

    if (latlngs.length > 1) {
      L.polyline(latlngs, {
        color: "#1e7e8c",
        weight: 4,
        opacity: 0.85,
        dashArray: "1 8",
        lineCap: "round",
      }).addTo(map);
    }

    const bounds = L.latLngBounds(latlngs);
    map.fitBounds(bounds, { padding: [30, 30] });

    state.maps[dayId] = map;
    setTimeout(() => map.invalidateSize(), 50);
  }

  function renderAccommodation() {
    const container = document.getElementById("accommodation-list");
    container.innerHTML = "";
    state.data.accommodation.forEach((city) => {
      const card = document.createElement("div");
      const isConfirmed = !!city.confirmed;
      card.className = "accommodation-city" + (isConfirmed ? " accommodation-city--confirmed" : " accommodation-city--open");

      const statusBadge = isConfirmed
        ? `<span class="accommodation-status accommodation-status--confirmed">✅ Zarezerwowane</span>`
        : `<span class="accommodation-status accommodation-status--open">🤔 Decyzja otwarta</span>`;

      const notePlHtml = city.note_pl
        ? `<p class="accommodation-decision-note">${escapeHtml(city.note_pl)}</p>`
        : "";

      const optionsClass = isConfirmed ? "accommodation-options" : "accommodation-options accommodation-options--compare";
      const options = city.options
        .map(
          (opt) => `
        <div class="accommodation-option">
          <span class="accommodation-option__name">${escapeHtml(opt.name)}</span>
          <span class="accommodation-option__note">${escapeHtml(opt.note)}</span>
        </div>`
        )
        .join("");

      card.innerHTML = `
        <div class="accommodation-city__top">
          <div>
            <div class="accommodation-city__name">${escapeHtml(city.city)}</div>
            <div class="accommodation-city__nights">${escapeHtml(city.nights)}</div>
          </div>
          ${statusBadge}
        </div>
        ${notePlHtml}
        <div class="${optionsClass}">${options}</div>
      `;
      container.appendChild(card);
    });
  }

  function renderBookingInfo() {
    const container = document.getElementById("bookings-content");
    const groups = state.data.booking_info || [];
    container.innerHTML = groups
      .map(
        (group) => `
      <h3>${escapeHtml(group.day)}</h3>
      <ul class="booking-list">
        ${group.items
          .map(
            (item) => `
          <li class="booking-item">
            <div class="booking-item__top">
              <span class="booking-item__name">${escapeHtml(item.name)}</span>
              <span class="booking-item__cost ${item.paid ? "booking-item__cost--paid" : "booking-item__cost--free"}">${escapeHtml(item.cost)}</span>
            </div>
            ${item.action ? `<span class="booking-item__action">${escapeHtml(item.action)}</span>` : ""}
          </li>`
          )
          .join("")}
      </ul>`
      )
      .join("");
  }

  const PACKING_STORAGE_KEY = "szwajcaria2026-packing-checked";

  function loadPackingChecked() {
    try {
      return JSON.parse(localStorage.getItem(PACKING_STORAGE_KEY)) || {};
    } catch (err) {
      return {};
    }
  }

  function savePackingChecked(checked) {
    try {
      localStorage.setItem(PACKING_STORAGE_KEY, JSON.stringify(checked));
    } catch (err) {
      // localStorage unavailable (private mode etc.) — silently skip persistence
    }
  }

  function renderPackingList() {
    const container = document.getElementById("packing-content");
    const categories = state.data.packing_list || [];
    const checked = loadPackingChecked();

    container.innerHTML = categories
      .map(
        (cat, catIndex) => `
      <div class="packing-category">
        <h3>${cat.icon ? escapeHtml(cat.icon) + " " : ""}${escapeHtml(cat.category)}</h3>
        <ul class="packing-list">
          ${cat.items
            .map((item, itemIndex) => {
              const id = `pack-${catIndex}-${itemIndex}`;
              const isChecked = !!checked[id];
              return `
            <li class="packing-item${isChecked ? " packing-item--checked" : ""}">
              <label>
                <input type="checkbox" data-packing-id="${id}" ${isChecked ? "checked" : ""} />
                <span>${escapeHtml(item)}</span>
              </label>
            </li>`;
            })
            .join("")}
        </ul>
      </div>`
      )
      .join("");

    container.querySelectorAll("input[data-packing-id]").forEach((input) => {
      input.addEventListener("change", () => {
        const current = loadPackingChecked();
        current[input.dataset.packingId] = input.checked;
        savePackingChecked(current);
        input.closest(".packing-item").classList.toggle("packing-item--checked", input.checked);
      });
    });
  }

  function renderEmergencyContacts() {
    const { trip } = state.data;
    const contacts = trip.emergency_contacts || [];
    if (!contacts.length) return;
    const section = document.getElementById("emergency-section");
    if (!section) return;
    const list = contacts
      .map(
        (c) => `<div class="emergency-item">
          <span class="emergency-item__label">${escapeHtml(c.label)}</span>
          <a class="emergency-item__number" href="tel:${escapeAttr(c.number)}">${escapeHtml(c.number)}</a>
        </div>`
      )
      .join("");
    document.getElementById("emergency-list").innerHTML = list;
  }

  function renderCashBudget() {
    const { trip } = state.data;
    const budget = trip.cash_budget;
    const currency = trip.currency_info;
    const container = document.getElementById("cash-budget-content");
    if (!container || !budget) return;

    let html = "";
    if (currency) {
      html += `<p class="currency-note">${escapeHtml(currency.note)}</p>`;
      html += `<p class="currency-rate">💱 ${escapeHtml(currency.rate_approx)}</p>`;
    }
    html += `<p class="cash-note">${escapeHtml(budget.note)}</p>`;
    html += `<div class="cash-list">`;
    budget.items.forEach((item) => {
      const paid = item.paid ? ` <span class="cash-paid">✅ opłacone</span>` : "";
      html += `<div class="cash-item">
        <span class="cash-item__label">${escapeHtml(item.label)}</span>
        <span class="cash-item__amount">${escapeHtml(item.amount)} / ${escapeHtml(item.per)}${paid}</span>
      </div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
  }

  function renderInfo() {
    const container = document.getElementById("info-content");
    const { practical_info, weather_snapshot } = state.data;

    let html = `<p class="info-disclaimer">📅 Prognoza pobrana ${escapeHtml(
      weather_snapshot.fetched_on
    )}${weather_snapshot.source ? ` (${escapeHtml(weather_snapshot.source)})` : ""}. ${escapeHtml(weather_snapshot.disclaimer)}</p>`;

    html += `<h3>Praktyczne info</h3><ul>`;
    practical_info.forEach((item) => {
      html += `<li>${escapeHtml(item)}</li>`;
    });
    html += `</ul>`;

    html += renderWeatherBlock(weather_snapshot.forecast);

    container.innerHTML = html;
  }

  function renderWeatherBlock(forecast) {
    const cells = forecast
      .map(
        (f) => `
      <div class="weather-slot">
        <div class="weather-slot__top">
          <span class="weather-slot__place">${escapeHtml(f.location)}</span>
          <span class="weather-slot__when">${escapeHtml(formatDateShort(f.date))} · ${escapeHtml(f.time)}</span>
        </div>
        <div class="weather-slot__readings">
          <span class="weather-slot__temp">${f.temp_c}°C</span>
          <span class="weather-slot__rain">💧 ${f.rain_chance}%</span>
        </div>
        ${f.note ? `<span class="weather-slot__note">${escapeHtml(f.note)}</span>` : ""}
      </div>`
      )
      .join("");
    return `<h3>Pogoda w trasie</h3><div class="weather-list">${cells}</div>`;
  }

  function formatDate(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
  }

  function formatDateShort(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("pl-PL", { day: "numeric", month: "numeric" });
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(str) {
    return escapeHtml(str);
  }
})();

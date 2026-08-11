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
    renderInfo();

    const firstDay = state.data.days[0].id;
    activateDay(firstDay);
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

      const mapDiv = document.createElement("div");
      mapDiv.className = "map-container";
      mapDiv.id = `map-${day.id}`;
      panel.appendChild(mapDiv);

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

    const descriptionHtml = stop.description
      ? `<p class="stop-card__description">${escapeHtml(stop.description)}</p>`
      : "";

    const linkHtml = stop.link
      ? `<a class="stop-card__link" href="${escapeAttr(stop.link)}" target="_blank" rel="noopener noreferrer">Więcej info</a>`
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
      card.className = "accommodation-city";
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
        <div class="accommodation-city__name">${escapeHtml(city.city)}</div>
        <div class="accommodation-city__nights">${escapeHtml(city.nights)}</div>
        ${options}
      `;
      container.appendChild(card);
    });
  }

  function renderInfo() {
    const container = document.getElementById("info-content");
    const { practical_info, weather_snapshot } = state.data;

    let html = `<p class="info-disclaimer">📅 Migawka danych sprzed wyjazdu (pobrana ${escapeHtml(
      weather_snapshot.fetched_on
    )}). ${escapeHtml(weather_snapshot.disclaimer)}</p>`;

    html += `<h3>Praktyczne info</h3><ul>`;
    practical_info.forEach((item) => {
      html += `<li>${escapeHtml(item)}</li>`;
    });
    html += `</ul>`;

    html += renderWeatherBlock("Interlaken", weather_snapshot.interlaken);
    html += renderWeatherBlock("Bazylea", weather_snapshot.basel);

    container.innerHTML = html;
  }

  function renderWeatherBlock(cityName, days) {
    const cells = days
      .map(
        (d) => `
      <div class="weather-day">
        <span class="weather-day__date">${escapeHtml(formatDateShort(d.date))}</span>
        <span class="weather-day__temp">${d.high_f}° / ${d.low_f}°F</span>
        <span class="weather-day__rain">💧 ${d.rain_chance}%</span>
      </div>`
      )
      .join("");
    return `<h3>Pogoda — ${escapeHtml(cityName)}</h3><div class="weather-grid">${cells}</div>`;
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

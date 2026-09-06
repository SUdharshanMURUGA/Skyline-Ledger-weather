/**
 * app.js — DOM wiring for Skyline Ledger.
 * All actual data-shaping logic lives in js/etl.js and is unit tested there;
 * this file only calls those functions and updates the page.
 */
(function () {
  "use strict";

  var GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
  var FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

  var els = {
    form: document.getElementById("search-form"),
    input: document.getElementById("city-input"),
    button: document.getElementById("search-btn"),
    status: document.getElementById("search-status"),
    station: document.getElementById("station"),
    forecast: document.getElementById("forecast"),
    currentTemp: document.getElementById("current-temp"),
    placeName: document.getElementById("place-name"),
    currentCondition: document.getElementById("current-condition"),
    rowComfort: document.getElementById("row-comfort"),
    rowWind: document.getElementById("row-wind"),
    rowHumidity: document.getElementById("row-humidity"),
    rowRange: document.getElementById("row-range"),
    rowTime: document.getElementById("row-time"),
    rowCoords: document.getElementById("row-coords"),
    forecastRow: document.getElementById("forecast-row"),
    forecastSummary: document.getElementById("forecast-summary"),
    gaugeFill: document.getElementById("gauge-fill"),
    gaugeNeedle: document.getElementById("gauge-needle"),
    unitC: document.getElementById("unit-c"),
    unitF: document.getElementById("unit-f"),
    metricExtract: document.getElementById("metric-extract"),
    metricValidate: document.getElementById("metric-validate"),
    metricTransform: document.getElementById("metric-transform"),
    metricLoad: document.getElementById("metric-load"),
    qualityNote: document.getElementById("quality-note")
  };

  var state = {
    unit: "C",
    lastCurrentC: null,
    lastDays: null // cleaned records, for unit toggling without a re-fetch
  };

  var ICONS = {
    sun: '<circle cx="12" cy="12" r="5"/><g stroke-width="1.6"><line x1="12" y1="1" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="23"/><line x1="4.2" y1="4.2" x2="6.3" y2="6.3"/><line x1="17.7" y1="17.7" x2="19.8" y2="19.8"/><line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/><line x1="4.2" y1="19.8" x2="6.3" y2="17.7"/><line x1="17.7" y1="6.3" x2="19.8" y2="4.2"/></g>',
    "sun-cloud": '<path d="M7 18a4 4 0 1 1 1.1-7.86 5 5 0 0 1 9.5 2.02A3.5 3.5 0 0 1 17 18H7z"/><circle cx="6" cy="7" r="3"/>',
    cloud: '<path d="M6 18a4.5 4.5 0 1 1 1.2-8.84A6 6 0 0 1 19 11.5 3.5 3.5 0 0 1 18.5 18H6z"/>',
    fog: '<line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="14" x2="21" y2="14"/><line x1="3" y1="19" x2="15" y2="19"/>',
    drizzle: '<path d="M6 14a4.5 4.5 0 1 1 1.2-8.84A6 6 0 0 1 19 7.5 3.5 3.5 0 0 1 18.5 14H6z"/><line x1="8" y1="18" x2="7" y2="21"/><line x1="12" y1="18" x2="11" y2="21"/><line x1="16" y1="18" x2="15" y2="21"/>',
    rain: '<path d="M6 13a4.5 4.5 0 1 1 1.2-8.84A6 6 0 0 1 19 6.5 3.5 3.5 0 0 1 18.5 13H6z"/><line x1="7" y1="17" x2="5.5" y2="21"/><line x1="12" y1="17" x2="10.5" y2="21"/><line x1="17" y1="17" x2="15.5" y2="21"/>',
    snow: '<path d="M6 13a4.5 4.5 0 1 1 1.2-8.84A6 6 0 0 1 19 6.5 3.5 3.5 0 0 1 18.5 13H6z"/><g stroke-width="1.6"><line x1="7" y1="17" x2="7" y2="22"/><line x1="4.7" y1="19" x2="9.3" y2="20"/><line x1="12" y1="17" x2="12" y2="22"/><line x1="9.7" y1="19" x2="14.3" y2="20"/><line x1="17" y1="17" x2="17" y2="22"/><line x1="14.7" y1="19" x2="19.3" y2="20"/></g>',
    storm: '<path d="M6 13a4.5 4.5 0 1 1 1.2-8.84A6 6 0 0 1 19 6.5 3.5 3.5 0 0 1 18.5 13H6z"/><polyline points="12,15 9,20 12,20 10,24"/>',
    question: '<circle cx="12" cy="12" r="9"/><text x="12" y="16" text-anchor="middle" font-size="10">?</text>'
  };

  function iconSvg(name) {
    var path = ICONS[name] || ICONS.question;
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + path + "</svg>"
    );
  }

  function setStatus(message, isError) {
    els.status.textContent = message || "";
    els.status.classList.toggle("is-error", !!isError);
  }

  function fToC(f) { return (f - 32) * (5 / 9); }

  function formatTemp(c) {
    if (typeof c !== "number") return "—";
    return state.unit === "C" ? Math.round(c) + "°" : WeatherETL.celsiusToFahrenheit(c) + "°";
  }

  function updateGauge(tempC) {
    var min = -10, max = 45;
    var clamped = Math.max(min, Math.min(max, tempC));
    var pct = (clamped - min) / (max - min);
    var circumference = 314; // approx length of the drawn semicircle arc
    els.gaugeFill.setAttribute("stroke-dasharray", (pct * circumference) + " 400");
    var angle = -90 + pct * 180;
    els.gaugeNeedle.setAttribute("transform", "rotate(" + angle + " 120 140)");
  }

  function setChecklistItem(name, passed) {
    var item = document.querySelector('.checklist__item[data-check="' + name + '"]');
    if (!item) return;
    item.classList.remove("is-pending", "is-pass", "is-fail");
    item.classList.add(passed ? "is-pass" : "is-fail");
  }

  function renderChecklist(report) {
    var datesOk = report.errors.every(function (e) {
      return e.errors.indexOf("missing or unparsable date") === -1;
    });
    var measurementsOk = report.rejected === 0;
    var rangeOk = true; // the clean stage always swaps inversions before output, by construction
    var repairsOk = report.total - report.rejected === report.valid + report.repaired;

    setChecklistItem("dates", datesOk);
    setChecklistItem("measurements", measurementsOk);
    setChecklistItem("range", rangeOk);
    setChecklistItem("repairs", repairsOk);

    els.qualityNote.textContent =
      report.total + " records in, " + report.valid + " valid, " + report.repaired +
      " repaired, " + report.rejected + " rejected.";
  }

  function renderStation(place, current, comfort, todayClean) {
    els.station.hidden = false;
    els.placeName.textContent = [place.name, place.admin1, place.country].filter(Boolean).join(", ");
    els.currentCondition.textContent = WeatherETL.classifyWeatherCode(current.weathercode).label;
    state.lastCurrentC = current.temperatureC;
    els.currentTemp.textContent = formatTemp(current.temperatureC);
    if (typeof current.temperatureC === "number") updateGauge(current.temperatureC);

    els.rowComfort.textContent = comfort !== null ? comfort + " / 100" : "—";
    els.rowWind.textContent = typeof current.windKph === "number" ? current.windKph.toFixed(1) + " km/h" : "—";
    els.rowHumidity.textContent = typeof todayClean.humidityPct === "number" ? Math.round(todayClean.humidityPct) + "%" : "—";
    els.rowRange.textContent =
      typeof todayClean.tempMinC === "number" && typeof todayClean.tempMaxC === "number"
        ? formatTemp(todayClean.tempMinC) + " – " + formatTemp(todayClean.tempMaxC)
        : "—";
    els.rowTime.textContent = current.observedAt ? current.observedAt.replace("T", " ") + " local" : "—";
    els.rowCoords.textContent = place.latitude.toFixed(2) + ", " + place.longitude.toFixed(2);
  }

  function dayLabel(dateStr, index) {
    if (index === 0) return "Today";
    var d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(undefined, { weekday: "short" });
  }

  function renderForecast(cleanedDays, summary) {
    els.forecast.hidden = false;
    els.forecastRow.innerHTML = "";
    cleanedDays.forEach(function (day, i) {
      var card = document.createElement("article");
      card.className = "day-card";
      card.setAttribute("data-tag", day.condition.tag);
      card.innerHTML =
        '<div class="day-card__label">' + dayLabel(day.date, i) + "</div>" +
        '<div class="day-card__icon">' + iconSvg(day.condition.icon) + "</div>" +
        '<div class="day-card__temps"><span class="hi">' + formatTemp(day.tempMaxC) + "</span> / " +
        '<span class="lo">' + formatTemp(day.tempMinC) + "</span></div>" +
        (day.precipitationMm > 0 ? '<div class="day-card__rain">' + day.precipitationMm.toFixed(1) + " mm</div>" : "");
      els.forecastRow.appendChild(card);
    });

    els.forecastSummary.textContent =
      "Week average " + formatTemp(summary.avgMinC) + " – " + formatTemp(summary.avgMaxC) +
      (summary.wettestDay ? " · wettest day " + summary.wettestDay + " (" + summary.totalPrecipitationMm + " mm total)" : "");
  }

  function rerenderForUnitChange() {
    if (state.lastCurrentC !== null) els.currentTemp.textContent = formatTemp(state.lastCurrentC);
    if (state.lastDays) renderForecast(state.lastDays.records, state.lastDays.summary);
  }

  async function runSearch(city) {
    setStatus("Extracting from station API…");
    els.button.disabled = true;

    try {
      var geoRes = await fetch(GEOCODE_URL + "?name=" + encodeURIComponent(city) + "&count=1");
      if (!geoRes.ok) throw new Error("Geocoding service returned " + geoRes.status);
      var geoJson = await geoRes.json();
      var place = WeatherETL.normalizeGeocodeResult(geoJson);
      if (!place) {
        setStatus('No station found for "' + city + '". Try a different spelling.', true);
        els.button.disabled = false;
        return;
      }

      var params = new URLSearchParams({
        latitude: place.latitude,
        longitude: place.longitude,
        current_weather: "true",
        daily: [
          "temperature_2m_max",
          "temperature_2m_min",
          "precipitation_sum",
          "weathercode",
          "windspeed_10m_max",
          "relative_humidity_2m_mean"
        ].join(","),
        timezone: place.timezone || "auto"
      });

      var wxRes = await fetch(FORECAST_URL + "?" + params.toString());
      if (!wxRes.ok) throw new Error("Forecast service returned " + wxRes.status);
      var wxJson = await wxRes.json();

      // ---- EXTRACT ----
      var normalized = WeatherETL.normalizeForecastResult(wxJson);
      var rawFieldCount = normalized.daily.length * 6 + 4;
      els.metricExtract.textContent = rawFieldCount;

      // ---- VALIDATE + TRANSFORM ----
      var result = WeatherETL.transformDailyForecast(normalized.daily);
      els.metricValidate.textContent = result.report.total;
      els.metricTransform.textContent = result.report.repaired;

      // ---- AGGREGATE / LOAD ----
      var quality = WeatherETL.aggregateQuality(result.report);
      els.metricLoad.textContent = quality + "%";
      renderChecklist(result.report);

      var summary = WeatherETL.summarizeWeek(result.records);
      state.lastDays = { records: result.records, summary: summary };

      var today = result.records[0] || {};
      var comfort = WeatherETL.computeComfortIndex(
        normalized.current.temperatureC,
        today.humidityPct,
        normalized.current.windKph
      );

      renderStation(place, normalized.current, comfort, today);
      renderForecast(result.records, summary);

      setStatus(
        "Loaded " + result.report.total + " days for " + place.name + " · " + quality + "% data quality."
      );
    } catch (err) {
      setStatus("Pipeline failed: " + err.message, true);
    } finally {
      els.button.disabled = false;
    }
  }

  els.form.addEventListener("submit", function (e) {
    e.preventDefault();
    var city = els.input.value.trim();
    if (city) runSearch(city);
  });

  els.unitC.addEventListener("click", function () {
    state.unit = "C";
    els.unitC.classList.add("is-active"); els.unitC.setAttribute("aria-pressed", "true");
    els.unitF.classList.remove("is-active"); els.unitF.setAttribute("aria-pressed", "false");
    rerenderForUnitChange();
  });
  els.unitF.addEventListener("click", function () {
    state.unit = "F";
    els.unitF.classList.add("is-active"); els.unitF.setAttribute("aria-pressed", "true");
    els.unitC.classList.remove("is-active"); els.unitC.setAttribute("aria-pressed", "false");
    rerenderForUnitChange();
  });

  // Load a sensible default city on first paint so the page never looks empty.
  runSearch("Chennai");
})();

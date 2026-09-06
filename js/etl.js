/**
 * etl.js — Skyline Ledger data pipeline core
 * -------------------------------------------------------------
 * This file is the "data engineering" heart of the project.
 * It has no DOM code and no fetch calls, on purpose: it is pure,
 * synchronous, and side-effect free, so it can run both in the
 * browser (loaded via <script>) and in plain Node (via require)
 * for automated testing, without a bundler or dependency install.
 *
 * Pipeline stages implemented here:
 *   1. EXTRACT   -> normalizeGeocodeResult / normalizeForecastResult
 *   2. VALIDATE  -> validateRecord
 *   3. TRANSFORM -> cleanRecord, transformDailyForecast, celsiusToFahrenheit
 *   4. AGGREGATE -> aggregateQuality, summarizeWeek
 *   5. ENRICH    -> computeComfortIndex, classifyWeatherCode
 */

(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.WeatherETL = factory();
  }
})(typeof window !== "undefined" ? window : this, function () {
  "use strict";

  // ---- Reference tables -------------------------------------------------

  // Open-Meteo "weathercode" -> human label + icon glyph + palette tag.
  // (https://open-meteo.com/en/docs — WMO weather interpretation codes)
  var WEATHER_CODES = {
    0: { label: "Clear sky", icon: "sun", tag: "clear" },
    1: { label: "Mostly clear", icon: "sun-cloud", tag: "clear" },
    2: { label: "Partly cloudy", icon: "sun-cloud", tag: "cloud" },
    3: { label: "Overcast", icon: "cloud", tag: "cloud" },
    45: { label: "Fog", icon: "fog", tag: "fog" },
    48: { label: "Depositing rime fog", icon: "fog", tag: "fog" },
    51: { label: "Light drizzle", icon: "drizzle", tag: "rain" },
    53: { label: "Drizzle", icon: "drizzle", tag: "rain" },
    55: { label: "Dense drizzle", icon: "drizzle", tag: "rain" },
    61: { label: "Slight rain", icon: "rain", tag: "rain" },
    63: { label: "Rain", icon: "rain", tag: "rain" },
    65: { label: "Heavy rain", icon: "rain", tag: "rain" },
    66: { label: "Freezing rain", icon: "rain", tag: "rain" },
    67: { label: "Heavy freezing rain", icon: "rain", tag: "rain" },
    71: { label: "Slight snow", icon: "snow", tag: "snow" },
    73: { label: "Snow", icon: "snow", tag: "snow" },
    75: { label: "Heavy snow", icon: "snow", tag: "snow" },
    77: { label: "Snow grains", icon: "snow", tag: "snow" },
    80: { label: "Slight showers", icon: "rain", tag: "rain" },
    81: { label: "Showers", icon: "rain", tag: "rain" },
    82: { label: "Violent showers", icon: "rain", tag: "rain" },
    85: { label: "Slight snow showers", icon: "snow", tag: "snow" },
    86: { label: "Heavy snow showers", icon: "snow", tag: "snow" },
    95: { label: "Thunderstorm", icon: "storm", tag: "storm" },
    96: { label: "Thunderstorm, hail", icon: "storm", tag: "storm" },
    99: { label: "Thunderstorm, heavy hail", icon: "storm", tag: "storm" }
  };

  function classifyWeatherCode(code) {
    return WEATHER_CODES[code] || { label: "Unknown", icon: "question", tag: "unknown" };
  }

  // ---- Extract ------------------------------------------------------------

  // Normalizes the raw geocoding API payload into a flat, predictable shape.
  // Returns null (rather than throwing) when nothing usable was found, so
  // callers can treat "no match" as data, not an exception.
  function normalizeGeocodeResult(rawApiJson) {
    if (!rawApiJson || !Array.isArray(rawApiJson.results) || rawApiJson.results.length === 0) {
      return null;
    }
    var hit = rawApiJson.results[0];
    return {
      name: hit.name || "Unknown",
      admin1: hit.admin1 || "",
      country: hit.country || "",
      latitude: hit.latitude,
      longitude: hit.longitude,
      timezone: hit.timezone || "UTC"
    };
  }

  // Normalizes the raw forecast API payload into the record shapes the rest
  // of the pipeline expects. This is intentionally defensive: any missing
  // array is coerced to an empty array rather than left undefined, so
  // downstream validate/transform steps never crash on a partial response.
  function normalizeForecastResult(rawApiJson) {
    var cw = (rawApiJson && rawApiJson.current_weather) || {};
    var daily = (rawApiJson && rawApiJson.daily) || {};

    var current = {
      temperatureC: typeof cw.temperature === "number" ? cw.temperature : null,
      windKph: typeof cw.windspeed === "number" ? cw.windspeed : null,
      weathercode: typeof cw.weathercode === "number" ? cw.weathercode : null,
      isDay: cw.is_day === 1,
      observedAt: cw.time || null
    };

    var days = [];
    var dates = daily.time || [];
    for (var i = 0; i < dates.length; i++) {
      days.push({
        date: dates[i],
        tempMaxC: numOrNull(daily.temperature_2m_max, i),
        tempMinC: numOrNull(daily.temperature_2m_min, i),
        precipitationMm: numOrNull(daily.precipitation_sum, i),
        weathercode: numOrNull(daily.weathercode, i),
        windMaxKph: numOrNull(daily.windspeed_10m_max, i),
        humidityPct: numOrNull(daily.relative_humidity_2m_mean, i)
      });
    }

    return { current: current, daily: days };
  }

  function numOrNull(arr, i) {
    if (!Array.isArray(arr) || i >= arr.length) return null;
    var v = arr[i];
    return typeof v === "number" && !isNaN(v) ? v : null;
  }

  // ---- Validate -------------------------------------------------------

  // A record is "valid" for our purposes if it has a parseable date and at
  // least one real (non-null) numeric measurement. Fully-empty records are
  // flagged so they can be dropped or repaired rather than silently
  // rendered as "0" (a classic data-quality bug).
  function validateRecord(record) {
    var errors = [];
    if (!record || typeof record !== "object") {
      return { valid: false, errors: ["record is not an object"] };
    }
    if (!record.date || isNaN(Date.parse(record.date))) {
      errors.push("missing or unparsable date");
    }
    var measurementFields = ["tempMaxC", "tempMinC", "precipitationMm", "windMaxKph"];
    var hasMeasurement = measurementFields.some(function (f) {
      return typeof record[f] === "number";
    });
    if (!hasMeasurement) {
      errors.push("no numeric measurements present");
    }
    if (
      typeof record.tempMaxC === "number" &&
      typeof record.tempMinC === "number" &&
      record.tempMaxC < record.tempMinC
    ) {
      errors.push("tempMaxC is lower than tempMinC");
    }
    return { valid: errors.length === 0, errors: errors };
  }

  // ---- Transform ------------------------------------------------------

  function celsiusToFahrenheit(c) {
    if (typeof c !== "number" || isNaN(c)) return null;
    return Math.round((c * 9) / 5 + 32);
  }

  function round1(n) {
    return typeof n === "number" ? Math.round(n * 10) / 10 : null;
  }

  // Repairs a single daily record: clamps impossible swapped min/max,
  // fills a missing min or max from the other when only one is present,
  // and rounds noisy floating point values to one decimal place.
  function cleanRecord(record) {
    var out = Object.assign({}, record);

    if (typeof out.tempMaxC === "number" && typeof out.tempMinC === "number" && out.tempMaxC < out.tempMinC) {
      var tmp = out.tempMaxC;
      out.tempMaxC = out.tempMinC;
      out.tempMinC = tmp;
    }
    if (typeof out.tempMaxC === "number" && typeof out.tempMinC !== "number") {
      out.tempMinC = out.tempMaxC;
    }
    if (typeof out.tempMinC === "number" && typeof out.tempMaxC !== "number") {
      out.tempMaxC = out.tempMinC;
    }
    if (typeof out.precipitationMm !== "number") {
      out.precipitationMm = 0;
    }

    out.tempMaxC = round1(out.tempMaxC);
    out.tempMinC = round1(out.tempMinC);
    out.precipitationMm = round1(out.precipitationMm);
    out.windMaxKph = round1(out.windMaxKph);

    return out;
  }

  // Runs the full validate -> clean pipeline over a list of raw daily
  // records and returns both the cleaned records and a per-run quality
  // report, mirroring what a small batch ETL job would log.
  function transformDailyForecast(rawDays) {
    var cleaned = [];
    var report = { total: rawDays.length, valid: 0, repaired: 0, rejected: 0, errors: [] };

    rawDays.forEach(function (raw) {
      var check = validateRecord(raw);
      if (!check.valid) {
        // A record with no measurements at all cannot be repaired; a record
        // with a swapped min/max or a missing single field can be.
        var onlyRepairable =
          check.errors.length === 1 && check.errors[0] === "tempMaxC is lower than tempMinC";
        if (!onlyRepairable && check.errors.indexOf("no numeric measurements present") !== -1) {
          report.rejected += 1;
          report.errors.push({ date: raw && raw.date, errors: check.errors });
          return;
        }
        report.repaired += 1;
      } else {
        report.valid += 1;
      }
      var clean = cleanRecord(raw);
      clean.tempMaxF = celsiusToFahrenheit(clean.tempMaxC);
      clean.tempMinF = celsiusToFahrenheit(clean.tempMinC);
      clean.condition = classifyWeatherCode(clean.weathercode);
      cleaned.push(clean);
    });

    return { records: cleaned, report: report };
  }

  // ---- Aggregate / Enrich ---------------------------------------------

  // Overall pipeline quality score: share of incoming records that made it
  // through as valid or repaired, expressed as a whole-number percentage.
  function aggregateQuality(report) {
    if (!report || report.total === 0) return 100;
    var usable = report.valid + report.repaired;
    return Math.round((usable / report.total) * 100);
  }

  // A simple heuristic "comfort index" (0-100) derived from temperature,
  // humidity and wind — a small enrichment step layered on top of the raw
  // measurements, the kind of derived metric a transform stage would add.
  function computeComfortIndex(tempC, humidityPct, windKph) {
    if (typeof tempC !== "number") return null;
    var score = 100;
    score -= Math.abs(tempC - 21) * 2.2; // ideal ~21C
    if (typeof humidityPct === "number") {
      score -= Math.max(0, humidityPct - 55) * 0.6;
    }
    if (typeof windKph === "number") {
      score -= Math.max(0, windKph - 15) * 0.8;
    }
    score = Math.max(0, Math.min(100, Math.round(score)));
    return score;
  }

  function summarizeWeek(cleanedDays) {
    if (!cleanedDays || cleanedDays.length === 0) {
      return { avgMaxC: null, avgMinC: null, totalPrecipitationMm: 0, wettestDay: null };
    }
    var maxSum = 0,
      maxCount = 0,
      minSum = 0,
      minCount = 0,
      precipTotal = 0,
      wettest = null;

    cleanedDays.forEach(function (d) {
      if (typeof d.tempMaxC === "number") {
        maxSum += d.tempMaxC;
        maxCount += 1;
      }
      if (typeof d.tempMinC === "number") {
        minSum += d.tempMinC;
        minCount += 1;
      }
      var p = typeof d.precipitationMm === "number" ? d.precipitationMm : 0;
      precipTotal += p;
      if (!wettest || p > wettest.precipitationMm) wettest = d;
    });

    return {
      avgMaxC: maxCount ? round1(maxSum / maxCount) : null,
      avgMinC: minCount ? round1(minSum / minCount) : null,
      totalPrecipitationMm: round1(precipTotal),
      wettestDay: wettest ? wettest.date : null
    };
  }

  return {
    classifyWeatherCode: classifyWeatherCode,
    normalizeGeocodeResult: normalizeGeocodeResult,
    normalizeForecastResult: normalizeForecastResult,
    validateRecord: validateRecord,
    cleanRecord: cleanRecord,
    celsiusToFahrenheit: celsiusToFahrenheit,
    transformDailyForecast: transformDailyForecast,
    aggregateQuality: aggregateQuality,
    computeComfortIndex: computeComfortIndex,
    summarizeWeek: summarizeWeek
  };
});

/**
 * tests/etl.test.js
 * A tiny, dependency-free test runner (built on Node's core "assert" module)
 * so `npm test` works immediately after cloning, with no npm install step.
 */

const assert = require("assert");
const ETL = require("../js/etl.js");

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

// ---- classifyWeatherCode -------------------------------------------------

test("classifyWeatherCode maps a known code", () => {
  const result = ETL.classifyWeatherCode(0);
  assert.strictEqual(result.label, "Clear sky");
  assert.strictEqual(result.tag, "clear");
});

test("classifyWeatherCode falls back gracefully for unknown codes", () => {
  const result = ETL.classifyWeatherCode(9999);
  assert.strictEqual(result.label, "Unknown");
});

// ---- normalizeGeocodeResult ---------------------------------------------

test("normalizeGeocodeResult extracts the first match", () => {
  const raw = {
    results: [
      { name: "Chennai", admin1: "Tamil Nadu", country: "India", latitude: 13.08, longitude: 80.27, timezone: "Asia/Kolkata" }
    ]
  };
  const result = ETL.normalizeGeocodeResult(raw);
  assert.strictEqual(result.name, "Chennai");
  assert.strictEqual(result.country, "India");
  assert.strictEqual(result.latitude, 13.08);
});

test("normalizeGeocodeResult returns null when there are no results", () => {
  assert.strictEqual(ETL.normalizeGeocodeResult({ results: [] }), null);
  assert.strictEqual(ETL.normalizeGeocodeResult({}), null);
  assert.strictEqual(ETL.normalizeGeocodeResult(null), null);
});

// ---- normalizeForecastResult ---------------------------------------------

test("normalizeForecastResult flattens current + daily blocks", () => {
  const raw = {
    current_weather: { temperature: 31.2, windspeed: 12.4, weathercode: 2, is_day: 1, time: "2026-09-06T12:00" },
    daily: {
      time: ["2026-09-06", "2026-09-07"],
      temperature_2m_max: [34.1, 33.5],
      temperature_2m_min: [26.2, 25.9],
      precipitation_sum: [0, 4.2],
      weathercode: [2, 61],
      windspeed_10m_max: [18.3, 22.1],
      relative_humidity_2m_mean: [70, 78]
    }
  };
  const result = ETL.normalizeForecastResult(raw);
  assert.strictEqual(result.current.temperatureC, 31.2);
  assert.strictEqual(result.daily.length, 2);
  assert.strictEqual(result.daily[1].precipitationMm, 4.2);
});

test("normalizeForecastResult tolerates a missing daily block entirely", () => {
  const result = ETL.normalizeForecastResult({ current_weather: { temperature: 20 } });
  assert.deepStrictEqual(result.daily, []);
  assert.strictEqual(result.current.temperatureC, 20);
});

// ---- validateRecord -------------------------------------------------------

test("validateRecord accepts a well-formed record", () => {
  const check = ETL.validateRecord({ date: "2026-09-06", tempMaxC: 30, tempMinC: 22 });
  assert.strictEqual(check.valid, true);
  assert.deepStrictEqual(check.errors, []);
});

test("validateRecord rejects a record with no measurements", () => {
  const check = ETL.validateRecord({ date: "2026-09-06" });
  assert.strictEqual(check.valid, false);
  assert.ok(check.errors.includes("no numeric measurements present"));
});

test("validateRecord rejects an unparsable date", () => {
  const check = ETL.validateRecord({ date: "not-a-date", tempMaxC: 30 });
  assert.strictEqual(check.valid, false);
  assert.ok(check.errors.includes("missing or unparsable date"));
});

test("validateRecord flags swapped min/max temperatures", () => {
  const check = ETL.validateRecord({ date: "2026-09-06", tempMaxC: 10, tempMinC: 20 });
  assert.strictEqual(check.valid, false);
  assert.ok(check.errors.includes("tempMaxC is lower than tempMinC"));
});

// ---- cleanRecord ------------------------------------------------------

test("cleanRecord swaps an inverted min/max pair", () => {
  const cleaned = ETL.cleanRecord({ date: "2026-09-06", tempMaxC: 10, tempMinC: 20 });
  assert.strictEqual(cleaned.tempMaxC, 20);
  assert.strictEqual(cleaned.tempMinC, 10);
});

test("cleanRecord fills a missing min from max, and vice versa", () => {
  const a = ETL.cleanRecord({ date: "2026-09-06", tempMaxC: 30 });
  assert.strictEqual(a.tempMinC, 30);
  const b = ETL.cleanRecord({ date: "2026-09-06", tempMinC: 18 });
  assert.strictEqual(b.tempMaxC, 18);
});

test("cleanRecord defaults missing precipitation to 0 and rounds values", () => {
  const cleaned = ETL.cleanRecord({ date: "2026-09-06", tempMaxC: 30.148, tempMinC: 22.02 });
  assert.strictEqual(cleaned.precipitationMm, 0);
  assert.strictEqual(cleaned.tempMaxC, 30.1);
  assert.strictEqual(cleaned.tempMinC, 22);
});

// ---- celsiusToFahrenheit -------------------------------------------------

test("celsiusToFahrenheit converts known reference points", () => {
  assert.strictEqual(ETL.celsiusToFahrenheit(0), 32);
  assert.strictEqual(ETL.celsiusToFahrenheit(100), 212);
  assert.strictEqual(ETL.celsiusToFahrenheit(21), 70);
});

test("celsiusToFahrenheit returns null for non-numeric input", () => {
  assert.strictEqual(ETL.celsiusToFahrenheit(null), null);
  assert.strictEqual(ETL.celsiusToFahrenheit("hot"), null);
});

// ---- transformDailyForecast ----------------------------------------------

test("transformDailyForecast reports rejects, repairs, and valid counts", () => {
  const rawDays = [
    { date: "2026-09-06", tempMaxC: 30, tempMinC: 22 }, // valid
    { date: "2026-09-07", tempMaxC: 10, tempMinC: 20 }, // repairable (swapped)
    { date: "2026-09-08" } // rejected (no measurements)
  ];
  const { records, report } = ETL.transformDailyForecast(rawDays);
  assert.strictEqual(report.total, 3);
  assert.strictEqual(report.valid, 1);
  assert.strictEqual(report.repaired, 1);
  assert.strictEqual(report.rejected, 1);
  assert.strictEqual(records.length, 2);
  assert.strictEqual(records[1].tempMaxC, 20); // repaired record was swapped
});

test("transformDailyForecast attaches Fahrenheit and condition labels", () => {
  const { records } = ETL.transformDailyForecast([{ date: "2026-09-06", tempMaxC: 0, tempMinC: 0, weathercode: 95 }]);
  assert.strictEqual(records[0].tempMaxF, 32);
  assert.strictEqual(records[0].condition.label, "Thunderstorm");
});

// ---- aggregateQuality -----------------------------------------------------

test("aggregateQuality scores a fully clean run at 100", () => {
  const report = { total: 5, valid: 5, repaired: 0, rejected: 0 };
  assert.strictEqual(ETL.aggregateQuality(report), 100);
});

test("aggregateQuality counts repaired records as usable", () => {
  const report = { total: 4, valid: 2, repaired: 1, rejected: 1 };
  assert.strictEqual(ETL.aggregateQuality(report), 75);
});

test("aggregateQuality treats an empty run as 100 (nothing to fail)", () => {
  assert.strictEqual(ETL.aggregateQuality({ total: 0, valid: 0, repaired: 0, rejected: 0 }), 100);
});

// ---- computeComfortIndex -------------------------------------------------

test("computeComfortIndex peaks near the ideal temperature", () => {
  const ideal = ETL.computeComfortIndex(21, 50, 5);
  const hot = ETL.computeComfortIndex(40, 50, 5);
  const cold = ETL.computeComfortIndex(-5, 50, 5);
  assert.ok(ideal > hot, "ideal conditions should score higher than a heatwave");
  assert.ok(ideal > cold, "ideal conditions should score higher than a freeze");
});

test("computeComfortIndex stays within the 0-100 bounds", () => {
  const extreme = ETL.computeComfortIndex(55, 100, 120);
  assert.ok(extreme >= 0 && extreme <= 100);
});

// ---- summarizeWeek -------------------------------------------------------

test("summarizeWeek averages temperatures and finds the wettest day", () => {
  const days = [
    { date: "2026-09-06", tempMaxC: 30, tempMinC: 20, precipitationMm: 0 },
    { date: "2026-09-07", tempMaxC: 32, tempMinC: 22, precipitationMm: 12.5 }
  ];
  const summary = ETL.summarizeWeek(days);
  assert.strictEqual(summary.avgMaxC, 31);
  assert.strictEqual(summary.avgMinC, 21);
  assert.strictEqual(summary.wettestDay, "2026-09-07");
  assert.strictEqual(summary.totalPrecipitationMm, 12.5);
});

test("summarizeWeek handles an empty list without throwing", () => {
  const summary = ETL.summarizeWeek([]);
  assert.strictEqual(summary.avgMaxC, null);
  assert.strictEqual(summary.totalPrecipitationMm, 0);
});

// ---- runner --------------------------------------------------------------

let passed = 0;
let failed = 0;

console.log("\nSkyline Ledger — ETL test suite\n--------------------------------");
for (const { name, fn } of tests) {
  try {
    fn();
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (err) {
    failed++;
    console.log(`  \x1b[31m✗ ${name}\x1b[0m`);
    console.log(`      ${err.message}`);
  }
}

console.log("--------------------------------");
console.log(`${passed + failed} tests, ${passed} passed, ${failed} failed\n`);

process.exit(failed > 0 ? 1 : 0);

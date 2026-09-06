# Skyline Ledger

A weather report that shows its plumbing. Search a city and you get the usual
things — current temperature, a 7-day outlook — but you also get the actual
**data pipeline** that produced them: extract, validate, clean, aggregate,
each stage visible with live counts on the page itself.

It's a small, deliberately simple **data engineering** project wrapped in a
weather site, built with plain HTML/CSS/JavaScript so it needs no build step,
no framework, and no API key.

---

## Why this project exists

Most weather widgets hide their plumbing behind a single "72°" and call it
done. The interesting part of a real weather product is what happens
*before* that number renders: raw API responses are messy (missing fields,
occasionally swapped min/max values, inconsistent units), and a data
pipeline's job is to notice that and fix or reject it, not silently show bad
data.

This project makes that pipeline the actual subject of the page:

1. **Extract** — fetch current conditions + a 7-day outlook from a public
   weather API.
2. **Validate** — check every daily record for a real date and at least one
   usable measurement.
3. **Transform / clean** — repair swapped or missing values, round noisy
   decimals, convert °C → °F, attach a human-readable condition label.
4. **Aggregate / load** — compute a weekly summary and a data-quality score,
   then render everything into the UI.

The four pipeline stages on the page aren't decorative — they're wired
directly to the functions in [`js/etl.js`](js/etl.js), and those same
functions are covered by the automated tests in
[`tests/etl.test.js`](tests/etl.test.js).

## What's inside

```
skyline-ledger/
├── index.html          # Page structure: hero/search, station, forecast, pipeline, quality, about
├── css/
│   └── styles.css       # Storm-slate + brass instrument-panel design system
├── js/
│   ├── etl.js            # Pure data pipeline logic (extract/validate/clean/aggregate) — no DOM, no fetch
│   └── app.js             # Fetches live data, calls etl.js, updates the DOM
├── tests/
│   └── etl.test.js         # Node test suite for etl.js (built-in `assert`, no dependencies)
├── package.json
├── vercel.json           # Tells Vercel this is a static site with no build step
└── README.md
```

`js/etl.js` is written so the exact same file works two ways:

- loaded via a `<script>` tag in the browser, where it attaches itself to
  `window.WeatherETL`
- `require()`d directly from plain Node in the test suite

That's what makes "all tests pass" meaningful here — the tests exercise the
literal code the browser runs, not a separate reimplementation.

## Data source

Weather data comes from **[Open-Meteo](https://open-meteo.com)**, a free
weather API that requires no API key and has no rate limit for reasonable
personal use:

- Geocoding endpoint turns a city name into coordinates.
- Forecast endpoint returns current conditions and a 7-day daily outlook.

Because there's no key to manage, there are no secrets or environment
variables to configure — clone it and it works.

## Running it locally

No install step is required to view the site — it's static files. Pick
whichever you have available:

```bash
# Option 1 — Python (already on most machines)
cd skyline-ledger
python3 -m http.server 5173

# Option 2 — Node, via the included npm script
cd skyline-ledger
npm start
```

Then open **http://localhost:5173** in a browser. (Opening `index.html`
directly with a `file://` URL also works in most browsers, since the app
only makes external `fetch` calls to Open-Meteo — but a local server avoids
any browser quirks with `file://` and is recommended.)

## Running the tests

The test suite has **zero dependencies** — it uses only Node's built-in
`assert` module, so there's no `npm install` step before testing:

```bash
npm test
# or directly:
node tests/etl.test.js
```

You should see all 24 tests pass:

```
Skyline Ledger — ETL test suite
--------------------------------
  ✓ classifyWeatherCode maps a known code
  ✓ classifyWeatherCode falls back gracefully for unknown codes
  ✓ normalizeGeocodeResult extracts the first match
  ...
--------------------------------
24 tests, 24 passed, 0 failed
```

The suite covers:

- weather-code classification, including unknown codes
- geocoding/forecast response normalization, including partial/missing data
- record validation (bad dates, missing measurements, inverted ranges)
- record cleaning/repair (swap, fill-from-sibling, rounding, defaults)
- unit conversion
- the full validate→clean pipeline's pass/repair/reject counts
- quality scoring
- the comfort-index heuristic and its bounds
- weekly aggregation, including the empty-input edge case

## Deploying

This is a static site, so both platforms need effectively zero
configuration.

### Deploy to Vercel

1. Push this folder to a GitHub repository.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Vercel will detect it as a static project. The included `vercel.json`
   makes that explicit (no build command, output directory is the project
   root).
4. Click **Deploy** — you'll get a live URL in under a minute.

Or from the CLI, from inside the project folder:

```bash
npx vercel --prod
```

### Deploy to GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to "Deploy from a branch".
4. Choose your default branch (e.g. `main`) and the `/ (root)` folder, then
   save.
5. GitHub will publish the site at
   `https://<your-username>.github.io/<repo-name>/` within a minute or two.

No build step, no environment variables, no server — either platform is
just serving the files in this folder.

## Notes on the design

The visual language is a "storm-slate and brass instrument panel" rather
than a generic dashboard: a hand-drawn-style analog gauge for the current
temperature, ledger-style rows for conditions, and a connected node diagram
for the pipeline stages (since that content genuinely is a sequence). Colors
were chosen away from default AI-generated palettes on purpose — deep slate
(`#12181F`), brass (`#C98A3B`), verdigris (`#5C8A78`) for healthy data, and
rust (`#B4553F`) for rejected/invalid data.

## License

MIT — do whatever you'd like with it.

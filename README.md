# 🌦️ Skyline Ledger

### A Weather Data Pipeline You Can Actually See

**Skyline Ledger** is a small data engineering project that turns a simple weather application into a transparent data pipeline.

Search for a city and you'll get the weather you'd normally expect — current conditions, temperatures, and a 7-day forecast.

But instead of hiding what happens behind the scenes, Skyline Ledger shows the **data journey** that produces those results.

**Extract → Validate → Clean → Transform → Aggregate → Display**

Every stage is visible on the page, along with live record counts and data-quality information.

🔗 **Live Demo:** https://sudharshanmuruga.github.io/Skyline-Ledger-weather/

---

## 📌 What is Skyline Ledger?

Weather applications usually make the process look simple:

> Search a city → Get the weather

But behind that result is a data pipeline.

Weather APIs can return incomplete records, missing measurements, inconsistent values, unexpected weather codes, or temperature ranges that need correction before the data can be safely presented.

Skyline Ledger was built to demonstrate how a **data engineer approaches that problem**.

The project takes raw weather data and processes it through a lightweight ETL pipeline before presenting the final information to the user.

Instead of only showing the final number, the application answers:

* Where did this data come from?
* Was the data valid?
* What needed to be corrected?
* How many records passed validation?
* How many required repairs?
* Were any records rejected?
* How is the final weekly summary calculated?

That is the main idea behind Skyline Ledger.

---

# 🎯 Project Objective

The goal of this project is not to build another weather website.

The goal is to understand and demonstrate the fundamentals of **data engineering through a practical application**.

The project focuses on:

* Data extraction
* Data validation
* Data cleaning
* Data transformation
* Data quality
* Data aggregation
* Error handling
* Automated testing
* API integration
* Static web deployment

The weather application is simply the interface used to make those concepts visible and easier to understand.

---

# 🔄 How the Data Pipeline Works

The application follows a simple ETL-style workflow.

```text
                    ┌──────────────────┐
                    │   User Searches  │
                    │      City        │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │     EXTRACT      │
                    │                  │
                    │ Open-Meteo API   │
                    │ Geocoding +      │
                    │ Forecast Data    │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │     VALIDATE     │
                    │                  │
                    │ Check dates      │
                    │ Check measurements│
                    │ Check data shape │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  CLEAN / REPAIR  │
                    │                  │
                    │ Fix missing data │
                    │ Repair ranges    │
                    │ Round values     │
                    │ Convert units    │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │    AGGREGATE     │
                    │                  │
                    │ Weekly summary   │
                    │ Quality score    │
                    │ Comfort index    │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │     DISPLAY      │
                    │                  │
                    │ Current weather  │
                    │ 7-day forecast   │
                    │ Pipeline metrics │
                    │ Data quality     │
                    └──────────────────┘
```

---

# 🧩 Pipeline Stages

## 1. Extract

The application retrieves weather information from the **Open-Meteo API**.

Two API operations are involved:

### Geocoding

The city name entered by the user is converted into geographic coordinates.

```text
City Name
   ↓
Geocoding API
   ↓
Latitude + Longitude
```

### Forecast

Those coordinates are then used to retrieve:

* Current weather
* Temperature
* Weather conditions
* Daily minimum temperature
* Daily maximum temperature
* 7-day forecast

No API key is required.

---

## 2. Validate

Raw API data should not automatically be trusted.

The validation stage checks whether each daily record contains usable information.

Examples include:

* Is the date valid?
* Is there at least one usable temperature measurement?
* Is the record structurally valid?
* Are the temperature values reasonable?
* Are minimum and maximum values consistent?

Invalid records are identified instead of silently being treated as correct.

---

## 3. Clean & Transform

After validation, the pipeline prepares the data for presentation.

The transformation layer can:

* Repair swapped minimum and maximum temperatures
* Fill missing values using available sibling measurements
* Apply sensible defaults where necessary
* Round unnecessary decimal precision
* Convert Celsius to Fahrenheit
* Translate weather codes into readable descriptions

For example:

```text
Raw API Data
     ↓
23.847391°C
     ↓
Rounded
     ↓
23.8°C
     ↓
Converted
     ↓
74.8°F
```

The important concept is that **data is transformed before it reaches the UI**.

---

## 4. Aggregate

Once the individual records are cleaned, the pipeline calculates higher-level information.

Examples include:

* Weekly temperature summary
* Average temperatures
* Data-quality score
* Comfort index
* Valid / repaired / rejected record counts

This demonstrates how raw records can be transformed into useful analytical information.

---

## 5. Display

The final processed data is presented through the weather interface.

The application displays:

* Current temperature
* Current conditions
* 7-day forecast
* Pipeline stages
* Processing counts
* Data-quality information
* Weekly summary
* Project explanation

The UI therefore acts as a window into the data pipeline rather than simply displaying weather information.

---

# 🛠️ Technology Stack

| Technology   | Purpose                       |
| ------------ | ----------------------------- |
| HTML5        | Application structure         |
| CSS3         | Styling and responsive layout |
| JavaScript   | Application logic             |
| Node.js      | Running the test suite        |
| Open-Meteo   | Weather and geocoding data    |
| Git          | Version control               |
| GitHub       | Source code hosting           |
| GitHub Pages | Deployment                    |

The project intentionally avoids a frontend framework.

There is:

* No React
* No Angular
* No Vue
* No backend server
* No database
* No API key
* No build process

The purpose was to keep the implementation simple enough that the **data engineering concepts remain the focus**.

---

# 📁 Project Structure

```text
Skyline-Ledger-weather/
│
├── index.html
│
├── css/
│   └── styles.css
│
├── js/
│   ├── etl.js
│   └── app.js
│
├── tests/
│   └── etl.test.js
│
├── package.json
│
├── vercel.json
│
└── README.md
```

### `index.html`

Contains the structure of the application:

* Search interface
* Current weather
* Forecast
* Pipeline visualization
* Data-quality section
* Project information

### `css/styles.css`

Contains the application's responsive layout, typography, components, and visual presentation.

### `js/etl.js`

The core of the project.

Contains the data-processing functions responsible for:

* Normalization
* Validation
* Cleaning
* Transformation
* Aggregation
* Quality scoring

The ETL logic is intentionally separated from the browser UI.

### `js/app.js`

Responsible for:

* Handling user interaction
* Calling the APIs
* Passing data through the ETL pipeline
* Updating the page

### `tests/etl.test.js`

Contains automated tests for the ETL functions.

---

# 🧠 Why `etl.js` Is Separate

One of the important design decisions in this project was keeping the ETL logic independent from the UI.

Instead of putting everything inside browser event handlers, the project separates:

```text
Data Processing
      │
      ▼
   etl.js
      │
      ▼
Application Logic
      │
      ▼
   app.js
      │
      ▼
      UI
```

This makes the pipeline easier to:

* Test
* Debug
* Maintain
* Reuse
* Understand

The same `etl.js` file can run in the browser and can also be loaded directly by Node.js for testing.

This means the automated tests exercise the **actual ETL implementation used by the application**.

---

# 🧪 Testing

Skyline Ledger includes an automated test suite using Node.js's built-in `assert` module.

No external testing framework is required.

Run:

```bash
npm test
```

Or:

```bash
node tests/etl.test.js
```

The test suite covers areas such as:

* Weather-code classification
* Unknown weather codes
* Geocoding response normalization
* Forecast response normalization
* Missing data
* Invalid dates
* Missing measurements
* Inverted temperature ranges
* Data repair
* Temperature rounding
* Unit conversion
* Validation results
* Cleaning results
* Rejected records
* Data-quality scoring
* Comfort-index calculations
* Weekly aggregation
* Empty-input handling

Example:

```text
Skyline Ledger — ETL test suite
--------------------------------
✓ classifyWeatherCode maps a known code
✓ classifyWeatherCode handles unknown codes
✓ normalizeGeocodeResult extracts the first match
✓ validates missing measurements
✓ repairs inverted temperature ranges
✓ converts Celsius to Fahrenheit
✓ calculates quality score
✓ aggregates weekly data
...
--------------------------------
24 tests, 24 passed, 0 failed
```

---

# 📊 Data Quality

Data quality is one of the main concepts demonstrated by the project.

Instead of assuming that every incoming record is perfect, Skyline Ledger keeps track of what happens to the data.

The pipeline distinguishes between:

```text
VALID
  │
  ├── Passed validation
  │
  └── Ready for processing


REPAIRED
  │
  ├── Had an issue
  ├── Was recoverable
  └── Corrected before use


REJECTED
  │
  ├── Invalid or unusable
  └── Removed from processing
```

This makes the pipeline more transparent and introduces an important real-world data engineering concept:

> **Data quality should be measured, not assumed.**

---

# 🌐 Data Source

Weather information is provided by **Open-Meteo**.

Open-Meteo provides:

* Geocoding
* Current weather
* Forecast information
* Daily weather data

The service does not require an API key for this project, which makes the application easy to run and deploy.

Because there are no secrets involved, the repository does not require environment variables for normal usage.

---

# 🚀 Run the Project Locally

Clone the repository:

```bash
git clone https://github.com/SUdharshanMURUGA/Skyline-Ledger-weather.git
```

Move into the project:

```bash
cd Skyline-Ledger-weather
```

### Option 1 — Python

```bash
python3 -m http.server 5173
```

Then open:

```text
http://localhost:5173
```

### Option 2 — Node.js

```bash
npm start
```

Then open:

```text
http://localhost:5173
```

No dependency installation is required for the basic application.

---

# 🧪 Run Tests

After cloning the repository:

```bash
npm test
```

Or:

```bash
node tests/etl.test.js
```

---

# ☁️ Deployment

Skyline Ledger is a static web application, so it can be deployed without a backend server.

The project is currently hosted using **GitHub Pages**.

### Live Application

🌐 **https://sudharshanmuruga.github.io/Skyline-Ledger-weather/**

The deployment process is simple:

```text
Local Project
     ↓
Git
     ↓
GitHub Repository
     ↓
GitHub Pages
     ↓
Live Website
```

No server management or paid cloud infrastructure is required.

---

# 💡 What I Learned From This Project

This project was created as a practical way to understand data engineering concepts rather than learning them only through theory.

Through Skyline Ledger, I explored:

### Data Engineering

* ETL pipeline design
* Data extraction
* Data validation
* Data cleaning
* Data transformation
* Data aggregation
* Data-quality measurement

### JavaScript

* Modular JavaScript
* Async/Await
* Fetch API
* Data manipulation
* Browser DOM interaction
* Error handling

### Testing

* Unit testing
* Edge cases
* Data validation testing
* Testing pure functions

### Software Development

* Separation of concerns
* Git version control
* Repository organization
* Documentation
* Static deployment

---

# 🔍 Interesting Engineering Decisions

### Why no framework?

The project deliberately uses plain HTML, CSS, and JavaScript.

This keeps the application easy to understand and makes the data pipeline the main focus.

### Why no backend?

The Open-Meteo API can be accessed directly from the browser for this use case, so a backend was unnecessary.

### Why no database?

The application works with live weather data and does not require persistent storage.

### Why separate ETL from UI?

Because data processing should be independently testable.

This separation also makes the code easier to maintain and reason about.

### Why show pipeline metrics?

Because the project is intended to demonstrate what happens to data before it becomes a final result.

---

# 📈 Possible Future Improvements

Skyline Ledger is intentionally small, but the architecture provides room for expansion.

Potential improvements include:

* Historical weather storage
* Scheduled data ingestion
* Persistent database storage
* Data warehouse integration
* Apache Airflow orchestration
* Docker support
* CI/CD using GitHub Actions
* Automated data-quality monitoring
* More advanced anomaly detection
* Multiple weather API sources
* API response comparison
* Historical trend analysis
* Interactive data visualizations
* Cloud-based data pipelines

A future version could evolve from a small client-side demonstration into a complete end-to-end data engineering pipeline.

---

# 🎓 Why This Project Matters

Skyline Ledger is intentionally different from a typical portfolio weather application.

The weather forecast is not the main subject.

**The pipeline is.**

The project demonstrates the idea that a data product is more than the final number displayed to a user.

A reliable result requires:

```text
Raw Data
   ↓
Validation
   ↓
Cleaning
   ↓
Transformation
   ↓
Quality Checks
   ↓
Aggregation
   ↓
Useful Information
```

That same thinking applies to much larger systems involving:

* Financial data
* Insurance data
* Customer data
* Transaction processing
* Analytics platforms
* Data warehouses
* Machine learning pipelines

Skyline Ledger is a small example of that larger engineering mindset.

---

# 📸 Project Preview

Visit the live application:

**https://sudharshanmuruga.github.io/Skyline-Ledger-weather/**

Search for any supported city and explore both the weather information and the pipeline that produced it.

---

# 👨‍💻 Author

**Sudharshan Murugan**

Data Engineering enthusiast interested in building reliable data pipelines, backend systems, automation, and practical data-driven applications.

GitHub:
https://github.com/SUdharshanMURUGA

---

# 📄 License

This project is licensed under the **MIT License**.

You are free to:

* Use the project
* Copy the project
* Modify the project
* Distribute the project
* Use it for personal or commercial purposes

See the `LICENSE` file for the complete license text.

---

## ⭐ If You Found This Project Interesting

Feel free to explore the repository, inspect the ETL implementation, run the tests, and experiment with the pipeline.

The best way to understand Skyline Ledger is not just to use the weather application — **look at how the data gets there.**

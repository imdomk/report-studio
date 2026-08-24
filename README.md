# Report Studio

A portfolio-ready CRM and self-service reporting workspace built with React, TypeScript, Papa Parse and Apache ECharts.

## What it demonstrates

- CSV upload with header detection, numeric-field inference and validation.
- A CRM pipeline with search, stage filters and client creation.
- Configurable dashboards persisted in `localStorage`.
- A chart builder with bar, line, area, pie, scatter, radar and funnel views.
- Responsive ECharts visualizations without a React wrapper dependency.
- Accessible dialogs, focus states, reduced-motion support and mobile table layouts.

Uploaded files are parsed locally and never sent to a server. The repository includes seeded sample datasets so reviewers can explore it immediately; those records and metrics are demonstration data, not production claims.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## CSV format

The first row must contain column names. Include at least one text/category column and one numeric column:

```csv
month,revenue,deals
January,24000,8
February,31500,11
```

Files are limited to 1 MB and the first 2,000 rows to keep chart rendering responsive in the browser.

## Verify

```bash
npm test
npm run build
```

## Production boundary

This project intentionally keeps CRM and CSV data in the browser. A production release could replace `localStorage` with an API and durable object storage while keeping the reporting UI unchanged.

# Report Studio

A portfolio-ready CRM and self-service reporting workspace built with React, TypeScript, Auth0 and Apache ECharts.

## What it demonstrates

- Auth0 SPA authentication with secure login and logout flows.
- A CRM pipeline with search, stage filters and client creation.
- Configurable dashboards persisted in `localStorage`.
- A chart builder for selecting datasets, dimensions, measures and chart types.
- Responsive ECharts visualizations without a React wrapper dependency.
- Accessible dialogs, focus states, reduced-motion support and mobile table layouts.

The repository ships with a local demo mode so reviewers can explore it without Auth0 credentials. Demo records and metrics are seeded sample data, not production claims.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Auth0 setup

1. Create a **Single Page Application** in Auth0.
2. Add `http://localhost:5173` to **Allowed Callback URLs**, **Allowed Logout URLs** and **Allowed Web Origins**.
3. Copy `.env.example` to `.env` and set your Auth0 domain and client ID.
4. Restart the development server.

```dotenv
VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=your_spa_client_id
VITE_AUTH0_AUDIENCE=
```

When the required variables are present, the app enforces Auth0 login. Without them, it opens the clearly labelled local demo workspace.

## Verify

```bash
npm test
npm run build
```

## Production boundary

This project intentionally keeps demo records in the browser. A production release would replace `localStorage` with an authenticated API and server-side authorization while keeping the reporting UI unchanged.

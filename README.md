# Pravel Cloudflare migration

This folder contains the Cloudflare Workers Static Assets migration of the local Streamlit prototype. The prototype remains untouched under `legacy-streamlit/`; source images are copied to `public/images/` without renaming or conversion.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Wrangler. Verify the main page, `/360-test.html`, and `/api/health`.

## Deploy

```bash
npx wrangler login
npm run deploy
```

`TOUR_API_KEY` is deliberately not used in this phase. When Tourism Organization API routes are added, save it as a Cloudflare Worker secret (for example, `npx wrangler secret put TOUR_API_KEY`); never put it under `public/` or in Git.

## Data migration

- `legacy-streamlit/busan.csv` (CP949) → `public/data/districts.json` (UTF-8)
- `legacy-streamlit/place.csv` (CP949) → `public/data/places.json` (UTF-8)
- `busan_gu.json` is copied unchanged to `public/data/busan_gu.json`.

The map has six markers because the source `place.csv` contains six rows. The 10 videos are independently represented in `public/data/tours.json`.

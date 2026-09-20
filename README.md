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

## Tourism keyword search (internal API)

`GET /api/tour/search?keyword=송도해수욕장` calls the Korea Tourism Organization API from the Worker and returns only Pravel's normalized fields. The browser never calls data.go.kr directly.

For local development, copy `.dev.vars.example` to `.dev.vars` and set the **Decoding** key:

```text
TOUR_API_KR_KEY="..."
```

For deployment, set the same value as a Worker secret:

```bash
npx wrangler secret put TOUR_API_KR_KEY
```

Do not commit `.dev.vars` or put the secret in `public/`.

## Barrier-free tourism detail (internal API)

`GET /api/tour/barrier-free?contentId=126122` retrieves accessibility information through `KorWithService2/detailWithTour2`. Configure its separate **Decoding** key as `TOUR_API_BARRIER_KEY` in `.dev.vars` locally and as a Worker secret in deployment:

```bash
npx wrangler secret put TOUR_API_BARRIER_KEY
```

The response contains only non-empty documented accessibility fields, grouped as `physical`, `visual`, `hearing`, and `infantFamily`.

## Tourism nearby search (internal API)

Use `GET /api/tour/nearby?mapX=129.2215491&mapY=35.2153743&radius=3000` to inspect nearby TourAPI content when a keyword cannot uniquely identify a place. `mapX` is longitude, `mapY` is latitude, and `radius` is an integer number of metres from 1 to 20,000. The Worker calls `locationBasedList2` server-side and returns only Pravel's normalized fields.

## Data migration

- `legacy-streamlit/busan.csv` (CP949) → `public/data/districts.json` (UTF-8)
- `legacy-streamlit/place.csv` (CP949) → `public/data/places.json` (UTF-8)
- `busan_gu.json` is copied unchanged to `public/data/busan_gu.json`.

The map has six markers because the source `place.csv` contains six rows. The 10 videos are independently represented in `public/data/tours.json`.

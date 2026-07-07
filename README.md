# Outfitter

AI-powered seasonal colour analysis and personalised outfit recommendations. Users
upload a photo, the app detects their **colour season** (12 sub-seasons), then
recommends clothes and outfit combinations that flatter their palette — with an
optional AI "realistic try-on" step.

> Formerly **ChromaStyle**. App-visible strings are being migrated to *Outfitter*.

## Features

| Feature | Notes |
|---|---|
| Colour analysis (photo upload) | Browser-side via face-api.js — 12-season output, zero API cost |
| Season palette display | Spring / Summer / Autumn / Winter × 3 sub-seasons each |
| Shop My Colours | Browse clothing, filter by brand, category, and delta-E colour match |
| My Wardrobe builder | Add owned items → outfit scoring engine (`lib/outfitEngine.ts`) |
| Outfit suggestions | Warm/cool family + value-contrast scoring; top 8 ranked combos |
| Realistic try-on | AI try-on with a reusable body photo (owner-gated by access code) |
| Trend agent | Web search → season trends via the Anthropic SDK |
| Season researcher agent | Validates 5+ sources per colour → `research-output/season-references.json` |
| Wardrobe populator agent | Reads validated research → writes `lib/wardrobe-seed.ts` |

## Stack

- **Next.js 16** (App Router, TypeScript) + **React 19**
- **Tailwind CSS 4** + **shadcn/ui** (Radix primitives)
- **face-api.js** + Canvas API for browser-side colour analysis
- **@imgly/background-removal** + **@mediapipe/tasks-vision** for garment/photo processing
- **Supabase** for auth + Postgres (optional — the app also works as a guest)
- **Anthropic SDK** (`@anthropic-ai/sdk`) for the trend + research agents
- **Vercel** for deployment

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

`predev` / `prebuild` run `scripts/ensure-local-catalog.js` automatically to make sure
a local product catalog is present.

### Environment variables

Create a `.env.local` (not committed):

```bash
# Supabase (optional — guest mode works without these)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Anthropic — required for the trend + research agents
ANTHROPIC_API_KEY=...

# Owner-only realistic try-on
TRYON_ACCESS_CODE=...
```

## Scripts

```bash
npm run dev                 # start dev server
npm run build               # production build
npm run start               # serve the production build
npm run lint                # eslint

npm run research-seasons    # validate colour references (needs ANTHROPIC_API_KEY)
npm run populate-wardrobe   # generate clothing seed (needs Anthropic credits)
npm run ingest-feed -- path/to/feed.csv   # ingest a product feed CSV
npm run scrape-catalog      # scrape catalog data
npm run scrape-uniqlo-men   # scrape Uniqlo men's catalog
```

## Project layout

```
app/            Next.js App Router — routes, pages, API handlers
  api/          Route handlers (analyze-colors, products/search, trends, ...)
  auth/         Sign-in / sign-up / callback
  dashboard/    Authenticated app (analyze, saved, trends, wardrobe)
components/
  dashboard/    Feature components (palette display, trend feed, essence quiz, ...)
  ui/           shadcn/ui primitives
lib/
  outfitEngine.ts   Outfit scoring (0–100: warm/cool, value contrast, season penalty)
  agents/           Trend agent + season researcher
  products/         Product fetching
  supabase/         Client / server / middleware helpers
scripts/        Agent + catalog/feed tooling (tsx)
```

## Outfit engine

`lib/outfitEngine.ts` scores outfits 0–100 on warm/cool family match, value (lightness)
contrast, and a season penalty. Labels: **Great** (85+) / **Good** (65+) /
**Okay** (45+) / **Clash**. It generates the top 8 ranked combos from a user's own items.
Guest wardrobe is stored in `localStorage` under `chromastyle_my_wardrobe`.

## Deployment

Deployed on Vercel. Set the environment variables above in the Vercel project settings.

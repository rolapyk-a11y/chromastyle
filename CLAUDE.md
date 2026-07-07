# Outfitter — Project Context

## App name
**Outfitter**

## Icon
Candidate icon saved at `public/brand/icon-candidate.jpg` — a silver clothing hanger
overlaid on a segmented colour wheel with a gold border, dark background.
Use this as the basis for favicon, OG image, and app icon.

## What this app does
AI-powered seasonal colour analysis and personalised outfit recommendations.
Users upload a photo, the app detects their colour season (12 sub-seasons),
then recommends clothes and outfit combinations that flatter their palette.

## Stack
- Next.js App Router (TypeScript)
- Tailwind CSS + shadcn/ui
- face-api.js + Canvas API for browser-side colour analysis (zero API cost)
- Supabase for auth + Postgres (optional — app works as a guest too)
- Vercel for deployment
- Anthropic SDK for the trend agent (web search beta)

## Key features built
| Feature | Status | Notes |
|---|---|---|
| Colour analysis (photo upload) | ✅ Done | face-api.js, 12-season output |
| Season palette display | ✅ Done | Spring/Summer/Autumn/Winter × 3 sub-seasons |
| Shop tab (clothing browse) | ✅ Done | Filter by brand, category, colour match |
| My Wardrobe builder | ✅ Done | Add owned items → outfit scoring engine |
| Outfit suggestions | ✅ Done | Warm/cool family + value contrast scoring |
| Trend agent | ✅ Done | Web search → season trends via Anthropic beta |
| Season researcher agent | ✅ Done | Validates 5+ sources per colour, writes research-output/season-references.json |
| Wardrobe populator agent | ✅ Done | Reads validated research → writes lib/wardrobe-seed.ts |

## Agent scripts
```bash
npm run research-seasons          # validate colour references (needs ANTHROPIC_API_KEY)
npm run populate-wardrobe         # generate H&M clothing seed (needs credits)
```

## Personal wardrobe engine (`lib/outfitEngine.ts`)
- Scores outfits 0–100: warm/cool family match, value (lightness) contrast, season penalty
- Labels: Great (85+) / Good (65+) / Okay (45+) / Clash
- Generates top 8 ranked combos from user's own items
- Guest storage: `localStorage` key `chromastyle_my_wardrobe`

## Pending
- [ ] Top up Anthropic credits and re-run `npm run populate-wardrobe`
- [ ] Push wardrobe builder commit to GitHub (local commit `dbbcca7` not yet pushed)
- [ ] Rename app-visible strings from "ChromaStyle" → "Outfitter"
- [ ] Use `public/brand/icon-candidate.jpg` as favicon / OG image

## Next steps — get real products into "Shop My Colours"

Website used for Partner-ads signup: `https://chromastyle-bxb7.vercel.app/`

### Step 1 — Sign up at Partner-ads.com ✅ in progress
Sign up as publisher using the Vercel URL as the website. Category: Tøj & mode.

### Step 2 — Apply to fashion advertisers
Once approved, go to **"Find annoncør"** and filter by `Tøj & mode`. Apply to shops
that offer product feeds. Good ones to start with:
- **Zalando** (large feed, good coverage)
- **Boozt** (Scandinavian, good colour variety)
- **Ellos** (Danish/Swedish, often approves quickly)
- **Vila / Only / Vero Moda** (Bestseller brands)

Apply to each — write a short note that you match products by colour science, so you
need feed access.

### Step 3 — Download your feed CSV
After a shop approves you, find their feed under **"Produktfeeds"** in your Publisher
dashboard. Download the CSV (usually contains: product name, brand, price, image URL,
product URL).

### Step 4 — Ingest it
In your chromastyle folder:
```bash
npm run ingest-feed -- path/to/zalando-feed.csv
```
This downloads each product image, extracts the true garment colour, and fills the
**Shop My Colours** tab with real, delta-E matched products.

> The whole signup + first feed is probably 2–4 days of waiting, then ~30 min of
> technical setup. When you have a feed CSV, map its column names to the expected
> format (name, brand, category, price, currency, image_url, product_url).

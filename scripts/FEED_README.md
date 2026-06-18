# Building the colour-matched product catalog

The app matches real clothing to your **exact** palette colour using perceptual
colour distance (CIE Lab delta-E). To do that it needs a catalog of real products,
each tagged with the garment's true colour. Here's how to build it.

## 1. Get a product feed (free)

Retailers publish product feeds through affiliate networks. Sign up (free) and
download a feed for H&M, Zara, ASOS, etc.:

- **AWIN** (https://www.awin.com) — H&M, many EU brands
- **Rakuten Advertising** — large brand list
- **TradeDoubler** / **Adtraction** — common in the Nordics

A feed is a CSV (or you can export one to CSV) with at least these columns:

```
name,brand,category,price,currency,image_url,product_url
Linen Shirt,H&M,shirt,299,DKK,https://.../image.jpg,https://.../product.html
```

Column names are flexible — the script also recognises `title`, `image_link`,
`deeplink`, `product_type`, etc.

## 2. Ingest it

```bash
npm run ingest-feed -- path/to/feed.csv
```

For every product the script:
1. downloads the product image,
2. samples the central region and extracts the **dominant garment colour**,
3. writes it to `lib/product-catalog.json` with the real hex.

It saves progress every 25 items and skips products it has already ingested,
so you can stop and re-run safely.

## 3. See the matches

Start the app (`npm run dev`), finish a colour analysis, then open
**My Wardrobe & Outfits → Shop My Colours**. Each palette colour shows the
closest real products, ranked by match %, with a buy link.

## Notes

- No catalog yet? The "Shop My Colours" tab explains this and the app still works
  (outfit builder, season swatches, search-based shop links).
- Bigger feed = better matches. A few thousand products gives good coverage.
- Re-run ingestion whenever you refresh the feed; the catalog is just a JSON file.

/**
 * Product feed ingestion
 *
 * Reads a retailer product feed (CSV), downloads each product image, extracts the
 * garment's actual dominant colour, and writes lib/product-catalog.json with a
 * real hex per product. The app then matches these against the user's palette by
 * perceptual colour distance (lib/colorMatch.ts).
 *
 * Usage:
 *   npm run ingest-feed -- path/to/feed.csv
 *
 * Expected CSV columns (header row, case-insensitive, extra columns ignored):
 *   name, brand, category, price, currency, image_url, product_url
 *
 * `category` is mapped to one of: top, bottom, jacket, shoes, accessory.
 */

import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import { Jimp, intToRGBA } from 'jimp'
import type { ItemCategory } from '../lib/types'

const OUTPUT_PATH = path.join(__dirname, '..', 'lib', 'product-catalog.json')

// Map free-text feed categories to our 5 buckets
function normaliseCategory(raw: string): ItemCategory | null {
  const c = raw.toLowerCase()
  if (/(shoe|sneaker|trainer|boot|loafer|footwear)/.test(c)) return 'shoes'
  if (/(jacket|coat|blazer|hoodie|outerwear|cardigan)/.test(c)) return 'jacket'
  if (/(trouser|pant|jean|chino|short|bottom|skirt)/.test(c)) return 'bottom'
  if (/(belt|scarf|bag|hat|cap|accessor|sock|tie)/.test(c)) return 'accessory'
  if (/(shirt|tee|t-shirt|top|jumper|sweater|knit|polo|blouse)/.test(c)) return 'top'
  return 'top' // sensible default for apparel
}

interface FeedRow {
  [key: string]: string
}

// Get a value from a row by any of several possible column names
function col(row: FeedRow, ...names: string[]): string {
  for (const n of names) {
    const key = Object.keys(row).find(k => k.toLowerCase().trim() === n.toLowerCase())
    if (key && row[key]) return row[key].trim()
  }
  return ''
}

function toHex(r: number, g: number, b: number): string {
  const h = (v: number) => v.toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase()
}

/**
 * Extract the dominant garment colour from a product image.
 * Samples the central region (where the garment usually is), buckets colours,
 * and ignores near-white / near-black pixels (typical studio backgrounds).
 */
async function dominantColour(imageUrl: string): Promise<string | null> {
  try {
    const image = await Jimp.read(imageUrl)
    image.resize({ w: 100 })
    const { width, height } = image.bitmap

    // Central 60% box — avoids edges/background
    const x0 = Math.floor(width * 0.2)
    const x1 = Math.floor(width * 0.8)
    const y0 = Math.floor(height * 0.2)
    const y1 = Math.floor(height * 0.8)

    const buckets = new Map<string, { count: number; r: number; g: number; b: number }>()

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const { r, g, b, a } = intToRGBA(image.getPixelColor(x, y))
        if (a < 200) continue
        // Skip near-white and near-black (background / shadow)
        if (r > 235 && g > 235 && b > 235) continue
        if (r < 18 && g < 18 && b < 18) continue
        // Quantise to 16-step buckets so similar pixels group
        const key = `${r >> 4}-${g >> 4}-${b >> 4}`
        const cur = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 }
        cur.count++; cur.r += r; cur.g += g; cur.b += b
        buckets.set(key, cur)
      }
    }

    if (buckets.size === 0) return null

    // Most populous bucket = dominant garment colour
    let best = { count: 0, r: 0, g: 0, b: 0 }
    for (const v of buckets.values()) if (v.count > best.count) best = v

    return toHex(
      Math.round(best.r / best.count),
      Math.round(best.g / best.count),
      Math.round(best.b / best.count),
    )
  } catch {
    return null
  }
}

async function main() {
  const feedPath = process.argv[2]
  if (!feedPath) {
    console.error('Usage: npm run ingest-feed -- path/to/feed.csv')
    process.exit(1)
  }
  if (!fs.existsSync(feedPath)) {
    console.error(`Feed not found: ${feedPath}`)
    process.exit(1)
  }

  console.log('ChromaStyle — Product Feed Ingestion')
  console.log('====================================\n')

  const csv = fs.readFileSync(feedPath, 'utf-8')
  const rows = parse(csv, { columns: true, skip_empty_lines: true, relax_column_count: true }) as FeedRow[]
  console.log(`Read ${rows.length} rows from ${feedPath}\n`)

  // Resume: keep already-ingested products (by product_url)
  let existing: Array<Record<string, unknown>> = []
  if (fs.existsSync(OUTPUT_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8')) } catch { existing = [] }
  }
  const doneUrls = new Set(existing.map(p => p.product_url as string))

  const catalog = [...existing]
  let added = 0, skipped = 0, failed = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const product_url = col(row, 'product_url', 'url', 'link', 'deeplink')
    const image_url = col(row, 'image_url', 'image', 'image_link', 'imageurl')
    const name = col(row, 'name', 'title', 'product_name')

    if (!product_url || !image_url || !name) { skipped++; continue }
    if (doneUrls.has(product_url)) { skipped++; continue }

    const hex = await dominantColour(image_url)
    if (!hex) {
      failed++
      console.log(`  ✗ [${i + 1}/${rows.length}] ${name.slice(0, 40)} — couldn't read image`)
      continue
    }

    catalog.push({
      id: `cat-${Date.now()}-${i}`,
      name,
      brand: col(row, 'brand', 'merchant') || 'Unknown',
      category: normaliseCategory(col(row, 'category', 'product_type', 'type')),
      price: parseFloat(col(row, 'price', 'sale_price') || '0') || 0,
      currency: col(row, 'currency') || 'DKK',
      image_url,
      product_url,
      colorHex: hex,
    })
    added++

    if (added % 25 === 0) {
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(catalog, null, 2))
      console.log(`  … ${added} products tagged (progress saved)`)
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(catalog, null, 2))

  console.log(`\nDone.`)
  console.log(`  Added:   ${added}`)
  console.log(`  Skipped: ${skipped} (missing fields or already ingested)`)
  console.log(`  Failed:  ${failed} (image unreadable)`)
  console.log(`  Catalog: ${catalog.length} total products → ${OUTPUT_PATH}`)
}

main()

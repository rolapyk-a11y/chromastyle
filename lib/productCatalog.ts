/**
 * Product catalog
 *
 * A list of real, buyable products — each tagged with the ACTUAL colour of the
 * garment (extracted from its product image by scripts/ingest-feed.ts).
 * The matching engine (lib/colorMatch.ts) ranks these by closeness to a user's
 * palette colour, so we recommend the right nuance, not just "any yellow".
 *
 * This file is generated. Run `npm run ingest-feed -- <feed.csv>` to (re)build it.
 */

import type { ItemCategory, FabricWeight, GarmentCut } from './types'
import { inferCutFromName } from './bodyGuide'
import catalogData from './product-catalog.json'

export interface CatalogProduct {
  id: string
  name: string
  brand: string
  category: ItemCategory
  price: number
  currency: string
  image_url: string
  product_url: string
  colorHex: string          // the real dominant garment colour, from the image
  colorName?: string
  fabric?: FabricWeight     // fabric weight — used for season-fit scoring
  cut?: GarmentCut          // silhouette — used for body-fit scoring
}

// Attach a garment cut to every product (from the JSON if present, otherwise
// inferred from the product name — "Slim Fit", "Relaxed Fit", "Wide Leg", …).
export const PRODUCT_CATALOG: CatalogProduct[] = (catalogData as CatalogProduct[]).map(p => ({
  ...p,
  cut: p.cut ?? inferCutFromName(p.name),
}))

export function catalogByCategory(category: ItemCategory): CatalogProduct[] {
  return PRODUCT_CATALOG.filter(p => p.category === category)
}

export function catalogIsEmpty(): boolean {
  return PRODUCT_CATALOG.length === 0
}

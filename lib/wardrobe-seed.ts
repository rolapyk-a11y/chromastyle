// Placeholder — overwritten by 'npm run populate-wardrobe' once the season
// research agent has completed. Safe to import at any time.

import type { SubSeason, Season } from './types'

export interface WardrobeSeedItem {
  name: string
  brand: string
  category: string
  subcategory: string
  price: number
  currency: string
  image_url: string
  product_url: string
  colors: string[]
  seasons: Season[]
  subSeasons: SubSeason[]
  style_tags: string[]
  is_trending: boolean
  colourMatchName: string
}

export const WARDROBE_BY_SUB_SEASON: Record<SubSeason, WardrobeSeedItem[]> = {
  'light-spring': [],
  'true-spring': [],
  'warm-spring': [],
  'light-summer': [],
  'true-summer': [],
  'soft-summer': [],
  'soft-autumn': [],
  'true-autumn': [],
  'dark-autumn': [],
  'dark-winter': [],
  'true-winter': [],
  'clear-winter': [],
}

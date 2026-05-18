import type { SubSeason, Season } from '../types'

export type { SubSeason, Season }

export interface SourceReference {
  url: string
  title: string
  snippet: string
}

export interface ValidatedColour {
  hex: string
  name: string
  category: 'best' | 'avoid' | 'neutral'
  sources: SourceReference[]   // validated >= MIN_SOURCES before inclusion
}

export interface SeasonResearchResult {
  subSeason: SubSeason
  bestColours: ValidatedColour[]
  avoidColours: ValidatedColour[]
  neutrals: ValidatedColour[]
  researchedAt: string
  validatedCount: number      // colours that passed the 5-source rule
  skippedCount: number        // colours dropped for insufficient references
}

export interface ResearchOutput {
  version: number
  generatedAt: string
  minSourcesRequired: number
  allValidated: boolean       // true when every sub-season passes
  seasons: Record<SubSeason, SeasonResearchResult>
}

export interface WardrobeClothingItem {
  name: string
  brand: string
  category: string
  subcategory: string
  price: number
  currency: string
  image_url: string
  product_url: string
  colors: string[]            // hex codes matched against palette
  seasons: Season[]
  subSeasons: SubSeason[]     // precise sub-season tags
  style_tags: string[]
  is_trending: boolean
  colourMatchName: string     // human-readable colour from the palette
}

export interface WardrobeOutput {
  generatedAt: string
  sourceResearchVersion: number
  items: WardrobeClothingItem[]
}

// All 12 sub-seasons in the correct order
export const ALL_SUB_SEASONS: SubSeason[] = [
  'light-spring', 'true-spring', 'warm-spring',
  'light-summer', 'true-summer', 'soft-summer',
  'soft-autumn', 'true-autumn', 'dark-autumn',
  'dark-winter', 'true-winter', 'clear-winter',
]

export const SUB_SEASON_TO_SEASON: Record<SubSeason, Season> = {
  'light-spring': 'spring', 'true-spring': 'spring', 'warm-spring': 'spring',
  'light-summer': 'summer', 'true-summer': 'summer', 'soft-summer': 'summer',
  'soft-autumn': 'autumn', 'true-autumn': 'autumn', 'dark-autumn': 'autumn',
  'dark-winter': 'winter', 'true-winter': 'winter', 'clear-winter': 'winter',
}

export const MIN_SOURCES = 5

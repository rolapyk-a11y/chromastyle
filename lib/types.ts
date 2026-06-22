export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export type SubSeason =
  | 'light-spring' | 'true-spring' | 'warm-spring'
  | 'light-summer' | 'true-summer' | 'soft-summer'
  | 'soft-autumn' | 'true-autumn' | 'dark-autumn'
  | 'dark-winter' | 'true-winter' | 'clear-winter'

export type SkinUndertone = 'warm' | 'cool' | 'neutral'

export type ItemCategory = 'top' | 'bottom' | 'shoes' | 'jacket' | 'accessory'

// 1 = lightest (linen), 6 = heaviest (wool). Used for texture contrast + season fit scoring.
export type FabricWeight = 'linen' | 'light-cotton' | 'cotton' | 'denim' | 'knit' | 'fleece' | 'wool'

// Garment cut/silhouette — drives body-proportion fit scoring.
export type GarmentCut = 'slim' | 'tapered' | 'regular' | 'relaxed' | 'wide' | 'oversized'

// ─── Body profile (self-reported proportions) ────────────────────────────────
export type HeightBand = 'short' | 'average' | 'tall'
export type ShoulderBuild = 'narrow' | 'average' | 'broad'
export type BodyProportion = 'long-torso' | 'balanced' | 'long-legs'
export type BuildType = 'slim' | 'average' | 'athletic' | 'fuller'

export interface BodyProfile {
  height: HeightBand
  shoulders: ShoulderBuild
  proportion: BodyProportion
  build: BuildType
  created_at: string
}

export interface UserWardrobeItem {
  id: string
  user_id?: string           // undefined for guest (localStorage) items
  name: string               // e.g. "Blue linen shirt"
  category: ItemCategory
  color_hex: string          // e.g. "#A8C4DC"
  color_name: string         // e.g. "Powder Blue"
  fabric?: FabricWeight      // optional — unlocks texture scoring when set
  cut?: GarmentCut           // optional — unlocks body-fit scoring when set
  brand?: string
  image_url?: string
  created_at: string
}

export interface OutfitCombo {
  items: UserWardrobeItem[]
  score: number              // 0–100
  scoreLabel: 'Great' | 'Good' | 'Okay' | 'Clash'
  tip: string                // one-line explanation
}

export interface ColorAnalysis {
  id: string
  user_id: string
  photo_url: string
  season: Season
  sub_season: SubSeason
  skin_undertone: SkinUndertone
  eye_color: string | null
  hair_color: string | null
  best_colors: string[]
  avoid_colors: string[]
  eye_enhancing_colors: string[]
  analysis_details: AnalysisDetails | null
  created_at: string
}

export interface AnalysisDetails {
  season_confidence: number
  skin_analysis: string
  eye_analysis: string
  hair_analysis: string
  overall_recommendation: string
  style_tips: string[]
}

export interface ClothingItem {
  id: string
  name: string
  brand: 'H&M' | 'Zara' | 'Toj Eksperten'
  category: string
  subcategory: string | null
  price: number
  currency: string
  image_url: string
  product_url: string | null
  colors: string[]
  seasons: Season[]
  style_tags: string[]
  is_trending: boolean
  created_at: string
  updated_at: string
}

export interface SavedItem {
  id: string
  user_id: string
  clothing_item_id: string
  created_at: string
  clothing_item?: ClothingItem
}

export interface TryOnResult {
  id: string
  user_id: string
  clothing_item_id: string
  original_photo_url: string
  result_photo_url: string
  created_at: string
  clothing_item?: ClothingItem
}

export interface FashionTrend {
  id: string
  season: Season
  trend_data: TrendData
  source: string
  created_at: string
  expires_at: string
}

export interface TrendData {
  title: string
  description: string
  key_pieces: string[]
  color_palette: string[]
  styling_tips: string[]
}

export interface Profile {
  id: string
  display_name: string | null
  created_at: string
  updated_at: string
}

// Season data for display
export const SEASON_INFO: Record<Season, {
  name: string
  description: string
  characteristics: string[]
  gradient: string
}> = {
  spring: {
    name: 'Spring',
    description: 'Warm and bright coloring with golden undertones',
    characteristics: ['Warm undertones', 'Golden or peachy skin', 'Light to medium contrast'],
    gradient: 'from-amber-400 to-orange-300'
  },
  summer: {
    name: 'Summer',
    description: 'Cool and muted coloring with soft, elegant tones',
    characteristics: ['Cool undertones', 'Pink or rosy skin', 'Low to medium contrast'],
    gradient: 'from-blue-400 to-slate-400'
  },
  autumn: {
    name: 'Autumn',
    description: 'Warm and rich coloring with earthy, deep tones',
    characteristics: ['Warm undertones', 'Golden or olive skin', 'Medium to high contrast'],
    gradient: 'from-orange-600 to-amber-700'
  },
  winter: {
    name: 'Winter',
    description: 'Cool and bold coloring with high contrast features',
    characteristics: ['Cool undertones', 'Porcelain or deep skin', 'High contrast'],
    gradient: 'from-indigo-600 to-slate-800'
  }
}

export const SUB_SEASON_INFO: Record<SubSeason, {
  name: string
  description: string
}> = {
  'light-spring': { name: 'Light Spring', description: 'Delicate warm colors with bright, clear tones' },
  'true-spring': { name: 'True Spring', description: 'Pure warm colors with golden, vibrant energy' },
  'warm-spring': { name: 'Warm Spring', description: 'Rich warm colors leaning towards autumn' },
  'light-summer': { name: 'Light Summer', description: 'Soft, ethereal cool tones with a light touch' },
  'true-summer': { name: 'True Summer', description: 'Classic cool colors with muted elegance' },
  'soft-summer': { name: 'Soft Summer', description: 'Dusty, gentle cool tones with warmth' },
  'soft-autumn': { name: 'Soft Autumn', description: 'Muted earth tones with a gentle warmth' },
  'true-autumn': { name: 'True Autumn', description: 'Rich, warm earth colors at their purest' },
  'dark-autumn': { name: 'Dark Autumn', description: 'Deep, intense warm colors with drama' },
  'dark-winter': { name: 'Dark Winter', description: 'Deep, bold cool colors with intensity' },
  'true-winter': { name: 'True Winter', description: 'Pure, high-contrast cool colors' },
  'clear-winter': { name: 'Clear Winter', description: 'Bright, vivid cool colors with clarity' }
}

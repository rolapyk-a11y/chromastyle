export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export type StyleEssence =
  | 'dramatic'
  | 'gamine'
  | 'natural'
  | 'classic'
  | 'romantic'
  | 'ingenue'
  | 'angelic'

export interface EssenceInfo {
  name: string
  tagline: string
  description: string
  keywords: string[]
  searchTerms: string        // used by wardrobe generator
  gradient: string
  emoji: string
}

export const ESSENCE_INFO: Record<StyleEssence, EssenceInfo> = {
  dramatic: {
    name: 'Dramatic',
    tagline: 'Bold · Striking · Theatrical',
    description: 'You command attention naturally. Your look thrives on strong silhouettes, bold colours, and statement pieces that most people wouldn\'t dare to wear.',
    keywords: ['oversized', 'structured', 'bold prints', 'monochrome', 'long lines', 'statement'],
    searchTerms: 'bold oversized structured statement',
    gradient: 'from-slate-900 to-red-900',
    emoji: '⚡',
  },
  gamine: {
    name: 'Gamine',
    tagline: 'Playful · Youthful · Rebellious',
    description: 'You have an effortless edgy energy. Eclectic mixing, unexpected combinations, and a streetwear edge all feel natural on you.',
    keywords: ['eclectic', 'pattern mixing', 'streetwear', 'cropped', 'contrast', 'playful'],
    searchTerms: 'eclectic streetwear playful pattern contrast',
    gradient: 'from-yellow-500 to-orange-500',
    emoji: '⚡',
  },
  natural: {
    name: 'Natural',
    tagline: 'Relaxed · Casual · Adventurous',
    description: 'You have an easy, effortless appeal. Relaxed layers, natural fabrics, and earthy tones all look like they were made for you.',
    keywords: ['relaxed fit', 'layering', 'earthy', 'natural fabrics', 'casual', 'outdoor'],
    searchTerms: 'relaxed casual earthy layered natural fabric',
    gradient: 'from-green-700 to-emerald-500',
    emoji: '🌿',
  },
  classic: {
    name: 'Classic',
    tagline: 'Timeless · Refined · Elegant',
    description: 'You carry natural authority and polish. Clean tailoring, quality basics, and timeless neutral colours all elevate your look effortlessly.',
    keywords: ['tailored', 'timeless', 'neutral', 'clean lines', 'quality basics', 'formal'],
    searchTerms: 'tailored classic timeless clean neutral formal',
    gradient: 'from-slate-600 to-slate-400',
    emoji: '🎩',
  },
  romantic: {
    name: 'Romantic',
    tagline: 'Sensual · Luxurious · Magnetic',
    description: 'You have a natural magnetism. Fitted silhouettes, rich textures, and luxurious fabrics all enhance your presence.',
    keywords: ['fitted', 'luxurious', 'rich textures', 'tactile', 'sensual', 'velvet', 'silk'],
    searchTerms: 'fitted luxury rich texture premium sensual',
    gradient: 'from-rose-700 to-pink-500',
    emoji: '✨',
  },
  ingenue: {
    name: 'Ingenue',
    tagline: 'Gentle · Youthful · Approachable',
    description: 'You have a naturally warm and approachable energy. Soft details, lighter colours, and delicate pieces all suit your gentle aesthetic.',
    keywords: ['soft', 'delicate', 'light colours', 'gentle', 'pastel', 'subtle details'],
    searchTerms: 'soft delicate light gentle pastel subtle',
    gradient: 'from-sky-400 to-blue-300',
    emoji: '🌸',
  },
  angelic: {
    name: 'Angelic',
    tagline: 'Ethereal · Artistic · Otherworldly',
    description: 'You have a striking, otherworldly quality. Flowing fabrics, fine textures, and draped silhouettes all create an effortlessly artistic look.',
    keywords: ['flowing', 'draped', 'fine texture', 'ethereal', 'artistic', 'minimal'],
    searchTerms: 'flowing draped fine minimal ethereal artistic',
    gradient: 'from-violet-500 to-purple-300',
    emoji: '🌙',
  },
}

export type SubSeason = 
  | 'light-spring' | 'true-spring' | 'warm-spring'
  | 'light-summer' | 'true-summer' | 'soft-summer'
  | 'soft-autumn' | 'true-autumn' | 'dark-autumn'
  | 'dark-winter' | 'true-winter' | 'clear-winter'

export type SkinUndertone = 'warm' | 'cool' | 'neutral'

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
  brand: string
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
  style_essence: StyleEssence | null
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

// ------------------------------------------------------------
// Mit skab – the user's own clothes
// ------------------------------------------------------------
export type ClosetCategory = 'top' | 'bottom' | 'outerwear' | 'shoes' | 'accessory'

export const CLOSET_CATEGORIES: { id: ClosetCategory; label: string }[] = [
  { id: 'top',       label: 'Overdele' },
  { id: 'bottom',    label: 'Underdele' },
  { id: 'outerwear', label: 'Overtøj' },
  { id: 'shoes',     label: 'Sko' },
  { id: 'accessory', label: 'Tilbehør' },
]

export const CLOSET_OCCASIONS: { id: string; label: string }[] = [
  { id: 'everyday', label: 'Hverdag' },
  { id: 'work',     label: 'Arbejde' },
  { id: 'party',    label: 'Fest' },
  { id: 'date',     label: 'Date' },
  { id: 'outdoor',  label: 'Udendørs' },
]

export interface UserItem {
  id: string
  user_id: string
  name: string
  category: ClosetCategory
  subcategory: string | null
  brand: string | null
  colors: string[]
  pattern: string | null
  style_tags: string[]
  occasions: string[]
  image_path: string | null
  notes: string | null
  created_at: string
  updated_at: string
  image_url?: string | null   // signed URL, added server-side
}

// ------------------------------------------------------------
// Outfits – combinations of own clothes and shop items
// ------------------------------------------------------------

/** One garment in an outfit, normalised from either the closet or the shop catalogue. */
export interface Piece {
  key: string                    // 'closet:<id>' or 'shop:<id>'
  source: 'closet' | 'shop'
  id: string
  name: string
  category: ClosetCategory
  subcategory: string | null
  brand: string | null
  colors: string[]
  style_tags: string[]
  occasions?: string[]
  notes: string | null
  image_url: string | null
  product_url?: string | null
  price?: number | null
}

export interface Outfit {
  id: string
  name: string
  occasion: string | null
  notes: string | null
  approved: boolean
  created_at: string
  pieces: Piece[]
}

/**
 * Outfit Engine
 *
 * Generates and scores outfit combinations from a user's personal wardrobe.
 * Rules are based on warm/cool family, value (lightness) contrast, and
 * season-specific palette compatibility.
 */

import type { UserWardrobeItem, OutfitCombo, SubSeason, ItemCategory, Season, BodyProfile } from './types'
import { paletteFor, type PaletteColour } from './palettes'
import { provenPairBonus, SCORE_TIPS, fabricSeasonPenalty, texturePairBonus, drapePairBonus } from './styleGuide'
import { cutFitsBody } from './bodyGuide'

// ─── Colour utilities ─────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

// Relative luminance (perceptual lightness 0–100)
function getLightness(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 2.55
}

// Simple warm/cool classification via the b* axis in Lab space (approximated)
function isWarm(hex: string): boolean {
  const [r, , b] = hexToRgb(hex)
  // Warm colours have more red/green relative to blue
  return r - b > 20
}

function isNeutral(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  // Neutral: low saturation (grey, beige, navy, white, black)
  return max - min < 40
}

// ─── Avoid colours per season family ─────────────────────────────────────────

const SEASON_AVOID: Record<SubSeason, string[]> = {
  'light-spring':  ['cool','black','grey','stark-white'],
  'true-spring':   ['cool','grey','dark-cool'],
  'warm-spring':   ['cool','grey','dark-cool'],
  'light-summer':  ['warm','orange','brown','gold'],
  'true-summer':   ['warm','orange','brown','gold'],
  'soft-summer':   ['vivid','orange','gold'],
  'soft-autumn':   ['cool','vivid-blue','purple'],
  'true-autumn':   ['cool','grey','pastels'],
  'dark-autumn':   ['cool','pastels','light'],
  'dark-winter':   ['warm','orange','brown','gold'],
  'true-winter':   ['warm','beige','orange','brown'],
  'clear-winter':  ['warm','muted','beige'],
}

function colourFitsSeasonAvoid(hex: string, subSeason: SubSeason): boolean {
  const avoid = SEASON_AVOID[subSeason]
  const warm = isWarm(hex)
  const neutral = isNeutral(hex)
  const L = getLightness(hex)

  if (avoid.includes('warm') && warm && !neutral) return false
  if (avoid.includes('cool') && !warm && !neutral) return false
  if (avoid.includes('black') && L < 12) return false
  if (avoid.includes('light') && L > 80) return false
  return true
}

// ─── Pair two items and return a score + tip ──────────────────────────────────

function subSeasonToSeason(sub: SubSeason): Season {
  if (sub.includes('spring')) return 'spring'
  if (sub.includes('summer')) return 'summer'
  if (sub.includes('autumn')) return 'autumn'
  return 'winter'
}

function pairScore(
  a: UserWardrobeItem,
  b: UserWardrobeItem,
  subSeason: SubSeason,
): { score: number; tip: string } {
  const aL = getLightness(a.color_hex)
  const bL = getLightness(b.color_hex)
  const valueDiff = Math.abs(aL - bL)
  const aWarm = isWarm(a.color_hex)
  const bWarm = isWarm(b.color_hex)
  const aNeutral = isNeutral(a.color_hex)
  const bNeutral = isNeutral(b.color_hex)

  // Penalise colours that fight your season
  const aFits = colourFitsSeasonAvoid(a.color_hex, subSeason)
  const bFits = colourFitsSeasonAvoid(b.color_hex, subSeason)
  const seasonPenalty = (!aFits ? 20 : 0) + (!bFits ? 20 : 0)

  // ── Texture modifier (fabric weight vs season + texture contrast) ──────────
  const season = subSeasonToSeason(subSeason)
  let textureDelta = 0
  let textureTip = ''
  if (a.fabric) textureDelta -= fabricSeasonPenalty(a.fabric, season)
  if (b.fabric) textureDelta -= fabricSeasonPenalty(b.fabric, season)
  if (a.fabric && b.fabric) {
    const tb = texturePairBonus(a.fabric, b.fabric)
    if (tb) { textureDelta += tb.bonus; textureTip = ' ' + tb.tip }
    // Drape contrast scores on top of weight contrast — tip overrides when more specific
    const db = drapePairBonus(a.fabric, b.fabric)
    if (db) { textureDelta += db.bonus; textureTip = ' ' + db.tip }
  }

  function finalise(rawColourScore: number, tip: string) {
    const combined = Math.max(0, Math.min(100, rawColourScore + textureDelta))
    return { score: combined, tip: tip + textureTip }
  }

  // Check proven style-guide pairs first — gets a bonus + specific tip
  const proven = provenPairBonus(a.color_hex, b.color_hex)
  if (proven) {
    const raw = Math.min(100, 80 + proven.bonus - seasonPenalty)
    return finalise(Math.max(0, raw), proven.tip)
  }

  // One or both are neutral → always works, just needs enough contrast
  if (aNeutral || bNeutral) {
    if (valueDiff > 30) return finalise(Math.max(0, 92 - seasonPenalty), "A neutral base with clear contrast in depth — you really can't go wrong with this. " + SCORE_TIPS.great[0])
    if (valueDiff > 15) return finalise(Math.max(0, 78 - seasonPenalty), 'A solid neutral pairing — a slightly bigger gap in depth would sharpen it. ' + SCORE_TIPS.good[0])
    return finalise(Math.max(0, 60 - seasonPenalty), 'Your two pieces sit at a similar depth — try one lighter and one darker. ' + SCORE_TIPS.okay[0])
  }

  // Both in same family (warm+warm or cool+cool)
  if (aWarm === bWarm) {
    if (valueDiff > 35) return finalise(Math.max(0, 88 - seasonPenalty), 'Same colour family with strong contrast — this looks cohesive and intentional on you. ' + SCORE_TIPS.great[1])
    if (valueDiff > 20) return finalise(Math.max(0, 73 - seasonPenalty), 'Same family with decent contrast — nudge one piece a shade lighter or darker to perfect it.')
    return finalise(Math.max(0, 45 - seasonPenalty), 'These sit at a similar depth and temperature. ' + SCORE_TIPS.okay[2])
  }

  // Mixed warm + cool
  if (bNeutral || aNeutral) {
    return finalise(Math.max(0, 83 - seasonPenalty), "A statement colour on a neutral base — honestly the most reliable formula there is. " + SCORE_TIPS.good[1])
  }
  if (valueDiff > 30) {
    return finalise(Math.max(0, 68 - seasonPenalty), 'A warm/cool mix with good contrast — keep your shoes and accessories in one family to anchor it.')
  }
  return finalise(Math.max(0, 50 - seasonPenalty), SCORE_TIPS.clash[0])
}

function scoreLabel(score: number): OutfitCombo['scoreLabel'] {
  if (score >= 85) return 'Great'
  if (score >= 65) return 'Good'
  if (score >= 45) return 'Okay'
  return 'Clash'
}

// Average body-fit delta across an outfit's items that have a known cut.
function bodyFit(
  outfitItems: UserWardrobeItem[],
  bodyProfile?: BodyProfile,
): { delta: number; reason: string } {
  if (!bodyProfile) return { delta: 0, reason: '' }
  const scored = outfitItems
    .filter(i => i.cut)
    .map(i => cutFitsBody(i.cut!, i.category, bodyProfile))
  if (scored.length === 0) return { delta: 0, reason: '' }
  const delta = Math.round(scored.reduce((s, x) => s + x.delta, 0) / scored.length)
  // Surface the most negative reason (the thing to fix), else the most positive
  const sorted = [...scored].sort((a, b) => a.delta - b.delta)
  const pick = delta < 0 ? sorted[0] : sorted[sorted.length - 1]
  return { delta, reason: pick.reason }
}

// ─── Texture / material summary for a hand-picked outfit ──────────────────────

export interface TextureSummary {
  level: 'good' | 'flat' | 'mixed' | 'unknown'
  note: string
}

/**
 * Judge how the FABRICS of an outfit work together — separate from colour.
 * Uses weight contrast (texturePairBonus) and drape contrast (drapePairBonus).
 * Returns 'unknown' until at least two pieces have a fabric set, so we can nudge
 * the user to tag their items.
 */
export function outfitTextureSummary(items: UserWardrobeItem[]): TextureSummary {
  const fabrics = items.filter(i => i.fabric).map(i => i.fabric!)
  if (fabrics.length < 2) {
    return { level: 'unknown', note: 'Tag the fabric on your pieces to see how their textures work together.' }
  }

  let total = 0
  let bestTip = ''
  let worstTip = ''
  let worst = Infinity
  for (let i = 0; i < fabrics.length; i++) {
    for (let j = i + 1; j < fabrics.length; j++) {
      const t = texturePairBonus(fabrics[i], fabrics[j])
      const d = drapePairBonus(fabrics[i], fabrics[j])
      const pair = (t?.bonus ?? 0) + (d?.bonus ?? 0)
      const tip = d?.tip || t?.tip || ''
      total += pair
      if (tip && pair < worst) { worst = pair; worstTip = tip }
      if (tip && pair > 0 && !bestTip) bestTip = tip
    }
  }

  if (total <= -4) return { level: 'mixed', note: worstTip || 'These fabrics fight each other — vary the weights more.' }
  if (total >= 6)  return { level: 'good',  note: bestTip || 'Lovely texture contrast — the materials play off each other.' }
  return { level: 'flat', note: 'The textures are fine but a little samey — mix a smooth piece with a more textured one.' }
}

// ─── Main: generate ranked outfit combos ─────────────────────────────────────

export function generateOutfits(
  items: UserWardrobeItem[],
  subSeason: SubSeason,
  bodyProfile?: BodyProfile,
): OutfitCombo[] {
  const tops    = items.filter(i => i.category === 'top')
  const bottoms = items.filter(i => i.category === 'bottom')
  const jackets = items.filter(i => i.category === 'jacket')
  const shoes   = items.filter(i => i.category === 'shoes')

  if (tops.length === 0 || bottoms.length === 0) return []

  const combos: OutfitCombo[] = []

  for (const top of tops) {
    for (const bottom of bottoms) {
      const { score: base, tip } = pairScore(top, bottom, subSeason)
      const outfitItems: UserWardrobeItem[] = [top, bottom]

      // Optionally add best-scoring jacket
      let bestJacket: UserWardrobeItem | undefined
      let bestJacketScore = -1
      for (const jacket of jackets) {
        const { score: js } = pairScore(top, jacket, subSeason)
        if (js > bestJacketScore) { bestJacket = jacket; bestJacketScore = js }
      }
      if (bestJacket && bestJacketScore > 60) outfitItems.push(bestJacket)

      // Optionally add best-scoring shoes
      let bestShoes: UserWardrobeItem | undefined
      let bestShoesScore = -1
      for (const shoe of shoes) {
        const { score: ss } = pairScore(bottom, shoe, subSeason)
        if (ss > bestShoesScore) { bestShoes = shoe; bestShoesScore = ss }
      }
      if (bestShoes && bestShoesScore > 60) outfitItems.push(bestShoes)

      const colourScore = base * 0.7 + (bestJacketScore > 0 ? bestJacketScore * 0.15 : base * 0.15) + (bestShoesScore > 0 ? bestShoesScore * 0.15 : base * 0.15)

      // Body-fit adjustment: nudge the score by how well the cuts suit the wearer
      const fit = bodyFit(outfitItems, bodyProfile)
      const finalScore = Math.max(0, Math.min(100, Math.round(colourScore + fit.delta)))
      const finalTip = fit.reason
        ? `${tip} ${fit.delta >= 0 ? 'The cuts suit your shape — ' : 'Heads up: '}${fit.reason}.`
        : tip

      combos.push({
        items: outfitItems,
        score: finalScore,
        scoreLabel: scoreLabel(finalScore),
        tip: finalTip,
      })
    }
  }

  // Sort by score descending, deduplicate similar combos, return top 8
  return combos
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
}

// ─── Score a hand-picked outfit (interactive builder) ─────────────────────────

/**
 * Score an arbitrary set of items the user has manually combined.
 * Every pair of items is scored and averaged, then nudged by body-fit.
 * Used by the "Build your own" outfit builder so the score and tip update
 * live as the user adds or removes pieces.
 */
export function scoreOutfit(
  outfitItems: UserWardrobeItem[],
  subSeason: SubSeason,
  bodyProfile?: BodyProfile,
): OutfitCombo {
  if (outfitItems.length < 2) {
    return {
      items: outfitItems,
      score: 0,
      scoreLabel: 'Okay',
      tip: 'Add at least two pieces to see how well they work together.',
    }
  }

  // Score every pair of items, track the average and the weakest link
  const pairScores: number[] = []
  let worstPair: { score: number; tip: string } | null = null
  for (let i = 0; i < outfitItems.length; i++) {
    for (let j = i + 1; j < outfitItems.length; j++) {
      const ps = pairScore(outfitItems[i], outfitItems[j], subSeason)
      pairScores.push(ps.score)
      if (!worstPair || ps.score < worstPair.score) worstPair = ps
    }
  }
  const colourScore = pairScores.reduce((s, x) => s + x, 0) / pairScores.length

  // Body-fit adjustment
  const fit = bodyFit(outfitItems, bodyProfile)
  const finalScore = Math.max(0, Math.min(100, Math.round(colourScore + fit.delta)))

  // Tip: lead with the weakest pair (what to improve), append the fit note
  const baseTip = worstPair?.tip ?? ''
  const tip = fit.reason
    ? `${baseTip} ${fit.delta >= 0 ? 'The cuts suit your shape — ' : 'Heads up: '}${fit.reason}.`
    : baseTip

  return {
    items: outfitItems,
    score: finalScore,
    scoreLabel: scoreLabel(finalScore),
    tip,
  }
}

// ─── "What goes with this?" — style one anchor item ───────────────────────────

// Which categories complete an outfit around a given anchor category
const COMPLEMENT_CATEGORIES: Record<ItemCategory, ItemCategory[]> = {
  top:       ['bottom', 'jacket', 'shoes'],
  bottom:    ['top', 'jacket', 'shoes'],
  jacket:    ['top', 'bottom', 'shoes'],
  shoes:     ['top', 'bottom'],
  accessory: ['top', 'bottom'],
}

// Score an anchor item against a bare palette colour (reuses pairScore)
function pairColourScore(anchor: UserWardrobeItem, hex: string, subSeason: SubSeason): number {
  const pseudo = { color_hex: hex } as UserWardrobeItem
  return pairScore(anchor, pseudo, subSeason).score
}

export interface ColourSuggestion {
  colour: PaletteColour
  score: number
}

export interface AnchorStyleResult {
  partners: Partial<Record<ItemCategory, UserWardrobeItem[]>>            // best matches you already own
  suggestions: Partial<Record<ItemCategory, ColourSuggestion[]>>        // season-correct colours to add
}

/**
 * Build a season-correct outfit around one item the user owns.
 * For each complementary category it returns:
 *  - partners: items already in the wardrobe, ranked by how well they pair
 *  - suggestions: palette colours (season + neutrals) that pair best, so the
 *    user knows exactly which colour to buy if they don't own a match.
 * All suggestions come from the user's palette — never random colours.
 */
export function styleAnchorItem(
  anchor: UserWardrobeItem,
  items: UserWardrobeItem[],
  subSeason: SubSeason,
): AnchorStyleResult {
  const targets = COMPLEMENT_CATEGORIES[anchor.category]
  const palette = paletteFor(subSeason)

  const partners: AnchorStyleResult['partners'] = {}
  const suggestions: AnchorStyleResult['suggestions'] = {}

  for (const cat of targets) {
    // Best partners from the user's own wardrobe
    const owned = items
      .filter(i => i.category === cat && i.id !== anchor.id)
      .map(i => ({ item: i, score: pairScore(anchor, i, subSeason).score }))
      .sort((a, b) => b.score - a.score)
    if (owned.length > 0) partners[cat] = owned.map(o => o.item)

    // Season-correct colours to add for this category
    suggestions[cat] = palette
      .map(colour => ({ colour, score: pairColourScore(anchor, colour.hex, subSeason) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
  }

  return { partners, suggestions }
}

// ─── localStorage helpers (guest users) ──────────────────────────────────────

const LS_KEY = 'chromastyle_my_wardrobe'

export function loadLocalWardrobe(): UserWardrobeItem[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as UserWardrobeItem[]
  } catch {
    return []
  }
}

export function saveLocalWardrobe(items: UserWardrobeItem[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LS_KEY, JSON.stringify(items))
}

export function addLocalWardrobeItem(item: UserWardrobeItem): void {
  const items = loadLocalWardrobe()
  saveLocalWardrobe([...items, item])
}

export function removeLocalWardrobeItem(id: string): void {
  const items = loadLocalWardrobe()
  saveLocalWardrobe(items.filter(i => i.id !== id))
}

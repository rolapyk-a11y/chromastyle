// Checks an outfit against the user's own rules, their colour season and their body proportions.
// The rules are written in general terms (brown jacket, black trousers, thick knit) so they
// keep working when new clothes are added to the closet.

import type { Piece } from '@/lib/types'
import { seasonFit } from '@/lib/closet/colors'

export type CheckLevel = 'warn' | 'tip' | 'good'
export interface Check {
  level: CheckLevel
  text: string
}

interface Hsl { h: number; s: number; l: number }

function hsl(hex: string | undefined): Hsl | null {
  const m = hex && /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  h *= 60
  if (h < 0) h += 360
  return { h, s, l }
}

const main = (p: Piece) => hsl(p.colors[0])
const text = (p: Piece) => `${p.name} ${p.subcategory ?? ''} ${p.style_tags.join(' ')}`.toLowerCase()

const isSport = (p: Piece) => /sport|træning|cykel/.test(text(p))
const isJeans = (p: Piece) => /jeans|denim/.test(text(p))
const isTee = (p: Piece) => /t-shirt|tee\b|tanktop/.test(text(p))
const isThickTop = (p: Piece) =>
  p.category === 'top' && /sweat|half-zip|halfzip|hoodie|strik|trøje|cardigan|knit/.test(text(p))

function isBrown(p: Piece) {
  const c = main(p)
  return !!c && c.h >= 5 && c.h <= 45 && c.l < 0.42 && c.s > 0.12
}
function isBlackish(p: Piece) {
  const c = main(p)
  return !!c && c.l < 0.3 && c.s < 0.15
}
const isLight = (p: Piece) => (main(p)?.l ?? 0) > 0.75
const isDark = (p: Piece) => (main(p)?.l ?? 1) < 0.3

export function checkOutfit(
  pieces: Piece[],
  bestColors?: string[],
  avoidColors?: string[],
): Check[] {
  const checks: Check[] = []
  const by = (cat: Piece['category']) => pieces.filter((p) => p.category === cat)
  const outer = by('outerwear'), tops = by('top'), bottoms = by('bottom'), shoes = by('shoes')

  if (!pieces.length) return []

  // --- The user's own rules -------------------------------------------------
  for (const p of pieces.filter(isSport)) {
    checks.push({
      level: 'warn',
      text: bottoms.some(isJeans)
        ? `${p.name} er kun til sport og cykel – aldrig med jeans.`
        : `${p.name} er kun til sport og cykel.`,
    })
  }

  const brownJacket = outer.find(isBrown)
  const blackBottom = bottoms.find(isBlackish)
  if (brownJacket && blackBottom) {
    checks.push({ level: 'warn', text: `${brownJacket.name} med ${blackBottom.name}: brun jakke går ikke med sorte bukser.` })
  }

  const thick = tops.find(isThickTop)
  if (thick && !tops.some(isTee)) {
    checks.push({ level: 'warn', text: `${thick.name} uden t-shirt under. Tilføj en t-shirt.` })
  }

  // --- Colours near the face (Light/Soft Spring) ----------------------------
  if (bestColors?.length) {
    const fit = (p: Piece) => seasonFit(p.colors, bestColors, avoidColors)
    // A good, light jacket on top covers a darker knit; only a t-shirt still shows at the neck.
    const coveredByGoodLayer = outer.some((p) => fit(p) !== 'avoid' && isLight(p))
    const nearFace = [...outer, ...tops].filter(
      (p) => p.category === 'outerwear' || !coveredByGoodLayer || isTee(p),
    )
    const bad = nearFace.filter((p) => fit(p) === 'avoid')
    for (const p of bad) {
      checks.push({
        level: 'tip',
        text: isTee(p) && tops.length > 1
          ? `${p.name} kigger frem i halsen. En lys t-shirt (stengrå, ecru) klæder dig bedre.`
          : p.category === 'outerwear'
            ? `${p.name} er mørk tæt på ansigtet. Lad noget lyst vise sig i halsen.`
            : `${p.name} er mørk tæt på ansigtet. Sæt et lyst lag over.`,
      })
    }
  }

  // --- Body: lengthen the legs ---------------------------------------------
  const lightShoe = shoes.find(isLight)
  const darkBottom = bottoms.find(isDark)
  if (lightShoe && darkBottom) {
    checks.push({ level: 'tip', text: `Lyse sko under mørke bukser skærer benet over. Mørke eller brune sko forlænger benene.` })
  }

  // --- Completeness ---------------------------------------------------------
  if (!bottoms.length) checks.push({ level: 'tip', text: 'Mangler bukser.' })
  if (!shoes.length) checks.push({ level: 'tip', text: 'Mangler sko.' })

  if (!checks.some((c) => c.level === 'warn')) {
    checks.unshift({ level: 'good', text: 'Følger dine regler.' })
  }
  return checks
}

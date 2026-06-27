'use client'

/**
 * Colour Check
 *
 * Snap or upload a photo of ANY garment → extract its real colour in the browser
 * → compare it against the user's seasonal palette → give a coach-voice verdict.
 *
 * This works with no catalog at all: it's pure camera + the user's saved palette,
 * so it adds value the moment someone has done their colour analysis. Reuses the
 * same Lab / delta-E maths as the product matcher (lib/colorMatch.ts).
 */

import type { ColorAnalysis } from './types'
import { hexToLab, deltaE, matchPercent } from './colorMatch'

export type ColourVerdict = 'perfect' | 'good' | 'okay' | 'avoid'

export interface ColourCheckResult {
  hex: string             // the detected garment colour
  verdict: ColourVerdict
  matchPercent: number    // closeness to the nearest colour in the palette (0–100)
  nearestBestHex: string  // closest colour in the user's "best" palette
  headline: string
  message: string         // coach-voice guidance
}

// Extract the dominant garment colour from a photo, in the browser, via canvas.
// Samples the central region (where the garment usually sits) and ignores
// near-white/near-black pixels (background, deep shadow, glare).
export async function extractGarmentColour(imageData: string): Promise<string> {
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = imageData
  })

  const canvas = document.createElement('canvas')
  const scale = Math.min(1, 240 / Math.max(img.naturalWidth, img.naturalHeight, 1))
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return '#888888'
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  const x0 = Math.floor(canvas.width * 0.25)
  const x1 = Math.ceil(canvas.width * 0.75)
  const y0 = Math.floor(canvas.height * 0.25)
  const y1 = Math.ceil(canvas.height * 0.75)
  const { data } = ctx.getImageData(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0))

  const buckets = new Map<string, { n: number; r: number; g: number; b: number }>()
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
    if (a < 200) continue
    if (r > 238 && g > 238 && b > 238) continue   // background white
    if (r < 16 && g < 16 && b < 16) continue       // deep shadow / black backdrop
    const key = `${r >> 4}-${g >> 4}-${b >> 4}`
    const cur = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }
    cur.n++; cur.r += r; cur.g += g; cur.b += b
    buckets.set(key, cur)
  }

  let best = { n: 0, r: 0, g: 0, b: 0 }
  for (const v of buckets.values()) if (v.n > best.n) best = v
  if (best.n === 0) return '#888888'

  const to2 = (v: number) => Math.round(v).toString(16).padStart(2, '0')
  return `#${to2(best.r / best.n)}${to2(best.g / best.n)}${to2(best.b / best.n)}`.toUpperCase()
}

function nearest(garmentLab: ReturnType<typeof hexToLab>, list: string[]): { hex: string; dE: number } {
  return list.reduce<{ hex: string; dE: number }>(
    (acc, hex) => {
      const dE = deltaE(garmentLab, hexToLab(hex))
      return dE < acc.dE ? { hex, dE } : acc
    },
    { hex: list[0] ?? '', dE: Infinity },
  )
}

export function checkColourAgainstPalette(
  garmentHex: string,
  analysis: Pick<ColorAnalysis, 'best_colors' | 'avoid_colors'>,
): ColourCheckResult {
  const garmentLab = hexToLab(garmentHex)
  const best = nearest(garmentLab, analysis.best_colors)
  const avoid = analysis.avoid_colors.length
    ? nearest(garmentLab, analysis.avoid_colors)
    : { hex: '', dE: Infinity }

  let verdict: ColourVerdict
  if (best.dE <= 12) verdict = 'perfect'
  else if (best.dE <= 22 && best.dE <= avoid.dE) verdict = 'good'
  else if (avoid.dE < best.dE) verdict = 'avoid'
  else verdict = 'okay'

  const { headline, message } = coachMessage(verdict)
  return {
    hex: garmentHex,
    verdict,
    matchPercent: matchPercent(best.dE),
    nearestBestHex: best.hex,
    headline,
    message,
  }
}

function coachMessage(verdict: ColourVerdict): { headline: string; message: string } {
  switch (verdict) {
    case 'perfect':
      return {
        headline: 'Made for you',
        message: "This is right in your palette — buy it with confidence. It'll light up your complexion every time you wear it.",
      }
    case 'good':
      return {
        headline: 'A great match',
        message: 'This sits comfortably in your colours. Wear it close to your face and it will do you real favours.',
      }
    case 'okay':
      return {
        headline: 'Wearable, not your best',
        message: "It's not far off, but it isn't one of your strongest shades. If you love it, keep it away from your face — think trousers or a jacket rather than a top.",
      }
    case 'avoid':
      return {
        headline: 'Maybe leave this one',
        message: 'This shade pulls against your colouring and will tend to wash you out. Look for a warmer or cooler take on the same colour — there is a version that suits you better.',
      }
  }
}

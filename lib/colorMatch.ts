/**
 * Colour matching engine
 *
 * Converts colours to CIE Lab space and measures perceptual distance (delta-E)
 * so we can rank real products by how close their actual colour is to a target
 * palette colour. This is what makes "find clothes in MY exact yellow" possible —
 * we compare true colours, not keyword guesses.
 */

export interface Lab {
  L: number
  a: number
  b: number
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

// sRGB (0–255) → CIE Lab (D65)
export function hexToLab(hex: string): Lab {
  let [r, g, b] = hexToRgb(hex).map(v => v / 255) as [number, number, number]

  // Inverse sRGB companding
  const lin = (c: number) => (c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92)
  r = lin(r); g = lin(g); b = lin(b)

  // Linear RGB → XYZ (D65)
  let x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375
  let y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750
  let z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041

  // Normalise by D65 white point
  x /= 0.95047; y /= 1.0; z /= 1.08883

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const fx = f(x), fy = f(y), fz = f(z)

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  }
}

// CIE76 delta-E (Euclidean distance in Lab). Fast and good enough for ranking.
export function deltaE(a: Lab, b: Lab): number {
  return Math.sqrt(
    (a.L - b.L) ** 2 +
    (a.a - b.a) ** 2 +
    (a.b - b.b) ** 2
  )
}

export function deltaEHex(hex1: string, hex2: string): number {
  return deltaE(hexToLab(hex1), hexToLab(hex2))
}

// Turn a delta-E into a friendly 0–100 match score.
// dE 0 ≈ identical (100), dE ~2.3 is "just noticeable", dE >40 is a different colour.
export function matchPercent(dE: number): number {
  return Math.max(0, Math.round(100 - dE * 2.2))
}

export interface ColouredProduct {
  colorHex: string
}

export interface ProductMatch<T extends ColouredProduct> {
  product: T
  deltaE: number
  matchPercent: number
}

/**
 * Rank products by colour closeness to a target hex.
 * @param targetHex   the palette colour we want to match
 * @param products    catalog items, each with a real colorHex
 * @param maxDeltaE   discard anything further than this (default 25 — same colour family)
 * @param topN        return at most this many
 */
export function matchProducts<T extends ColouredProduct>(
  targetHex: string,
  products: T[],
  maxDeltaE = 25,
  topN = 12,
): ProductMatch<T>[] {
  const targetLab = hexToLab(targetHex)

  return products
    .map(product => {
      const dE = deltaE(targetLab, hexToLab(product.colorHex))
      return { product, deltaE: dE, matchPercent: matchPercent(dE) }
    })
    .filter(m => m.deltaE <= maxDeltaE)
    .sort((a, b) => a.deltaE - b.deltaE)
    .slice(0, topN)
}

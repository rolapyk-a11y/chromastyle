// Colour helpers for matching clothes against the user's colour season.

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function colorDistance(a: string, b: string): number {
  const ra = hexToRgb(a)
  const rb = hexToRgb(b)
  if (!ra || !rb) return Infinity
  return Math.hypot(ra[0] - rb[0], ra[1] - rb[1], ra[2] - rb[2])
}

export type SeasonFit = 'great' | 'ok' | 'avoid' | 'unknown'

/**
 * How well an item's colours fit the user's palette.
 * Looks at the item's dominant (first) colour most, since that's what is seen near the face.
 */
export function seasonFit(
  itemColors: string[],
  bestColors: string[] | undefined,
  avoidColors: string[] | undefined,
): SeasonFit {
  if (!itemColors.length || !bestColors?.length) return 'unknown'
  const main = itemColors[0]
  const nearest = (palette: string[] | undefined) =>
    Math.min(...(palette ?? []).map((c) => colorDistance(main, c)), Infinity)

  const toBest = nearest(bestColors)
  const toAvoid = nearest(avoidColors)

  if (toAvoid < 60 && toAvoid < toBest) return 'avoid'
  if (toBest < 80) return 'great'
  return 'ok'
}

export const SEASON_FIT_LABEL: Record<SeasonFit, string> = {
  great: 'Klæder dig',
  ok: 'Neutral',
  avoid: 'Undgå tæt på ansigtet',
  unknown: 'Ingen farveanalyse',
}

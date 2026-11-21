// Step 1: find what an outfit is missing, and what it should look like.

import type { ClosetCategory, Piece } from '@/lib/types'
import { seasonFit } from '@/lib/closet/colors'
import { colourByWord, colourFromTitle, type ColourWord } from '@/lib/shop/colors'

export interface Gap {
  id: string
  category: ClosetCategory
  garment: string            // Danish search term, e.g. "chinos"
  label: string              // shown to the user, e.g. "Bukser i sand"
  reason: string             // why this gap
  colours: ColourWord[]      // target colours, best first
  mode: 'add' | 'replace'    // add to the outfit, or swap the piece in that category
}

const isTee = (p: Piece) => /t-shirt|tee\b/i.test(`${p.name} ${p.subcategory ?? ''}`)

function lightness(hex?: string) {
  const n = hex ? parseInt(hex.replace('#', ''), 16) : NaN
  if (Number.isNaN(n)) return 0.5
  return (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) / 255
}

/** Colours from the shortlist that suit the user's palette, keeping the shortlist's order. */
function suitable(words: string[], best: string[], avoid: string[]): ColourWord[] {
  const list = words.map(colourByWord).filter((c): c is ColourWord => !!c)
  const ok = list.filter((c) => seasonFit([c.hex], best, avoid) !== 'avoid')
  return (ok.length ? ok : list).slice(0, 2)
}

const GARMENT_HINTS: { re: RegExp; category: ClosetCategory; garment: string }[] = [
  { re: /frakke|coat/i, category: 'outerwear', garment: 'frakke' },
  { re: /overshirt|skjortejakke/i, category: 'outerwear', garment: 'overshirt' },
  { re: /jakke|puffer|jacket/i, category: 'outerwear', garment: 'jakke' },
  { re: /chino/i, category: 'bottom', garment: 'chinos' },
  { re: /jeans/i, category: 'bottom', garment: 'jeans' },
  { re: /bukser|trousers|pants/i, category: 'bottom', garment: 'bukser' },
  { re: /støvle|boot/i, category: 'shoes', garment: 'støvler' },
  { re: /loafer/i, category: 'shoes', garment: 'loafers' },
  { re: /sneaker|sko|shoe/i, category: 'shoes', garment: 'sneakers' },
  { re: /half-zip|halfzip|lynlås/i, category: 'top', garment: 'half-zip strik' },
  { re: /cardigan/i, category: 'top', garment: 'cardigan' },
  { re: /strik|trøje|sweater|knit/i, category: 'top', garment: 'strik' },
  { re: /skjorte|shirt/i, category: 'top', garment: 'skjorte' },
  { re: /t-shirt|tee/i, category: 'top', garment: 't-shirt' },
  { re: /bælte|belt/i, category: 'accessory', garment: 'læderbælte' },
  { re: /tørklæde|halstørklæde|scarf/i, category: 'accessory', garment: 'halstørklæde' },
  { re: /hue|beanie/i, category: 'accessory', garment: 'hue' },
]

/** Turns free text like "camel frakke" (from an AI suggestion) into a gap. */
export function gapFromText(text: string, best: string[], avoid: string[]): Gap | null {
  const hint = GARMENT_HINTS.find((h) => h.re.test(text))
  if (!hint) return null
  const named = colourFromTitle(text)
  const colours = named ? [named] : suitable(['camel', 'sand', 'creme'], best, avoid)
  return {
    id: `text:${text.toLowerCase()}`,
    category: hint.category,
    garment: hint.garment,
    label: text.charAt(0).toUpperCase() + text.slice(1),
    reason: 'AI-forslaget nævner det som det, der mangler.',
    colours,
    mode: hint.category === 'top' || hint.category === 'accessory' ? 'add' : 'replace',
  }
}

/** Gaps in an outfit, most useful first. */
export function findGaps(pieces: Piece[], best: string[], avoid: string[]): Gap[] {
  const by = (c: ClosetCategory) => pieces.filter((p) => p.category === c)
  const tops = by('top'), bottoms = by('bottom'), shoes = by('shoes'), outer = by('outerwear')
  const gaps: Gap[] = []
  const add = (g: Omit<Gap, 'colours'> & { words: string[] }) => {
    const { words, ...rest } = g
    gaps.push({ ...rest, colours: suitable(words, best, avoid) })
  }

  if (!bottoms.length) {
    add({ id: 'bottom', category: 'bottom', garment: 'chinos', label: 'Bukser', reason: 'Outfittet mangler bukser.', words: ['sand', 'beige', 'oliven'], mode: 'add' })
  }
  if (!shoes.length) {
    const darkBottom = bottoms.some((b) => lightness(b.colors[0]) < 0.3)
    add({ id: 'shoes', category: 'shoes', garment: 'sneakers', label: 'Sko', reason: 'Outfittet mangler sko.', words: darkBottom ? ['mørkebrun', 'cognac'] : ['creme', 'sand', 'cognac'], mode: 'add' })
  } else {
    const lightShoe = shoes.some((s) => lightness(s.colors[0]) > 0.75)
    const darkBottom = bottoms.some((b) => lightness(b.colors[0]) < 0.3)
    if (lightShoe && darkBottom) {
      add({ id: 'darker-shoes', category: 'shoes', garment: 'læder sneakers', label: 'Mørkere sko', reason: 'Lyse sko under mørke bukser skærer benet over. Brune sko forlænger benene.', words: ['mørkebrun', 'cognac'], mode: 'replace' })
    }
  }

  // Colour at the face: a light, warm layer when the top or jacket is dark and cold
  const faceItems = [...outer, ...tops.filter((t) => !isTee(t) || tops.length === 1)]
  const darkFace = faceItems.length > 0 && faceItems.every((p) => seasonFit(p.colors, best, avoid) === 'avoid')
  if (darkFace) {
    add({ id: 'light-layer', category: 'outerwear', garment: 'overshirt', label: 'Lyst lag ved ansigtet', reason: 'Det, der sidder tættest på ansigtet, er mørkt. Et lyst, varmt lag løfter dine farver.', words: ['creme', 'sand', 'beige'], mode: 'add' })
  }

  if (!outer.length) {
    add({ id: 'coat', category: 'outerwear', garment: 'frakke', label: 'Frakke', reason: 'En lang, rolig frakke binder outfittet sammen og forlænger silhuetten.', words: ['camel', 'sand', 'taupe'], mode: 'add' })
  }

  // Always offer a single muted accent as the last idea
  add({ id: 'accent', category: 'top', garment: 'strik', label: 'Strik med accentfarve', reason: 'Én dæmpet accent til dine neutrale farver.', words: ['salvie', 'oliven', 'fersken', 'bordeaux'], mode: 'add' })

  return gaps.slice(0, 4)
}

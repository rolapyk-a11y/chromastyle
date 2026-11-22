// A personal style guide built from the user's own data instead of one generic text per
// colour season. Cut comes from the body profile (not the season), fabric from the time of
// year, colours from the colour analysis, and the formula from an outfit he has approved.

import type { BodyProfile, Outfit } from '@/lib/types'
import { fitTipsFor } from '@/lib/bodyGuide'

export interface PersonalGuide {
  fits: string[]
  fitTips: string[]
  fabrics: string[]
  fabricAdvice: string
  avoid: string[]
  formula: string
  formulaSource: 'approved' | 'season'
}

type Season = 'winter' | 'transition' | 'summer'

function seasonOf(date: Date): Season {
  const m = date.getMonth() + 1
  if (m === 12 || m <= 2 || m === 11) return 'winter'
  if (m >= 6 && m <= 8) return 'summer'
  return 'transition'
}

const FABRICS: Record<Season, { fabrics: string[]; advice: string }> = {
  winter: {
    fabrics: ['Uld', 'Flannel', 'Fløjl', 'Kraftig bomuld', 'Strik', 'Denim'],
    advice: 'Vinterstoffer med fylde og tekstur. Matte overflader klæder dine bløde farver bedre end blanke.',
  },
  transition: {
    fabrics: ['Bomuld', 'Chambray', 'Let strik', 'Denim', 'Twill'],
    advice: 'Mellemtunge naturstoffer, der kan lægges i lag. Hold overfladerne matte.',
  },
  summer: {
    fabrics: ['Hør', 'Let bomuld', 'Piqué', 'Seersucker'],
    advice: 'Lette naturstoffer, der ånder. Hør og bomuld i lyse, varme toner er dine bedste venner.',
  },
}

const SEASON_FORMULA: Record<Season, string> = {
  winter: 'Creme strik + lys t-shirt under + sand bukser i lige snit + brune læderstøvler + camel frakke',
  transition: 'Lys overshirt + stengrå t-shirt + mørk denim i lige snit + brune lædersneakers',
  summer: 'Elfenbens hørskjorte + camel chinos i lige snit + off-white sneakers',
}

export function buildPersonalGuide(opts: {
  body?: BodyProfile
  approved?: Outfit[]
  now?: Date
}): PersonalGuide {
  const { body } = opts
  const season = seasonOf(opts.now ?? new Date())

  const fits: string[] = []
  const avoid: string[] = []
  if (body?.hips === 'wide') {
    fits.push('Lige ben', 'Relaxed-straight', 'Mellemhøj talje')
    avoid.push('Slim og skinny bukser', 'Stærkt tilspidsede ben')
    if (body.height !== 'tall') avoid.push('Helt vide / baggy ben')
  } else if (body) {
    fits.push('Regular', 'Relaxed')
  }
  if (body?.proportion === 'long-torso') {
    fits.push('Intet eller lille knæk', 'Front-tuck')
    avoid.push('Fulde knæk ved skoen', 'Opslag på bukserne')
  }
  if (body?.shoulders === 'narrow' || body?.hips === 'wide') fits.push('Struktur ved skuldrene')
  if (!body) fits.push('Regular', 'Relaxed')
  avoid.push('Blanke stoffer', 'Lyse sko under mørke bukser')

  const best = [...(opts.approved ?? [])]
    .filter((o) => o.approved)
    .sort((a, b) => b.pieces.length - a.pieces.length)[0]

  return {
    fits: [...new Set(fits)],
    fitTips: body ? fitTipsFor(body).slice(0, 4) : [],
    fabrics: FABRICS[season].fabrics,
    fabricAdvice: FABRICS[season].advice,
    avoid: [...new Set(avoid)],
    formula: best ? best.pieces.map((p) => p.name).join(' + ') : SEASON_FORMULA[season],
    formulaSource: best ? 'approved' : 'season',
  }
}

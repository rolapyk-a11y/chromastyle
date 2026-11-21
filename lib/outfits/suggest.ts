// Outfit suggestions: Google Gemini (free tier) writes them; if Gemini is slow, down or out of
// quota, the rule-based generator in generate.ts takes over. Either way every suggestion is
// checked against the user's rules before it is shown.

import { generateText, Output } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { ESSENCE_INFO, SUB_SEASON_INFO, type ColorAnalysis, type Outfit, type Piece, type StyleEssence } from '@/lib/types'
import { checkOutfit, type Check } from '@/lib/outfits/rules'
import { sortPieces } from '@/lib/outfits/pieces'
import { generateOutfits } from '@/lib/outfits/generate'

export const SUGGEST_MODEL = 'gemini-3.5-flash'
const TIMEOUT_MS = 45_000

const SuggestionSchema = z.object({
  outfits: z
    .array(
      z.object({
        name: z.string().describe('Short Danish outfit name, max 6 words'),
        pieces: z.array(z.string()).describe('Keys of the chosen garments, exactly as given in the lists'),
        why: z.string().describe('2-3 Danish sentences on why this works for his colours, build and the occasion'),
        styling_tip: z.string().describe('One concrete Danish styling tip'),
        missing: z.string().nullable().describe('One piece he does not own that would lift the outfit, in Danish, or null'),
      }),
    )
    .describe('3 outfit suggestions'),
})

export interface Suggestion {
  name: string
  why: string
  styling_tip: string
  missing: string | null
  pieces: Piece[]
  checks: Check[]
}

export interface SuggestResult {
  source: 'ai' | 'rules'
  suggestions: Suggestion[]
}

const OCCASIONS: Record<string, string> = {
  everyday: 'hverdag',
  work: 'arbejde',
  party: 'fest',
  date: 'date',
  outdoor: 'udendørs',
}

function describe(p: Piece) {
  const bits = [
    p.category,
    p.subcategory,
    p.colors.length ? `farver ${p.colors.join(' ')}` : null,
    p.style_tags.length ? `stil ${p.style_tags.join(', ')}` : null,
    p.notes ? `NOTE: ${p.notes}` : null,
  ].filter(Boolean)
  return `- ${p.key} | ${p.name} | ${bits.join(' | ')}`
}

const SYSTEM = `Du er personlig stylist for én mand og sætter outfits sammen af det tøj, han allerede ejer (og evt. tøj han har gemt fra butikker).

Sådan arbejder du:
- Brug kun tøj fra listerne, og angiv det med nøglen præcis som den står (fx "closet:…").
- Et outfit har normalt én overdel eller flere lag (t-shirt under strik), ét par bukser og ét par sko. Overtøj når vejret eller anledningen kalder på det.
- Noterne på tøjet er hans egne regler. De er ufravigelige (fx en jakke der kun er til sport, eller farver der ikke må kombineres).
- Tyk sweatshirt, half-zip eller strik bæres altid med en t-shirt under.
- Hans farvetype bestemmer, hvad der sidder tæt på ansigtet: lyse, varme, dæmpede farver ved ansigtet, mørkere farver længere nede. Hold kontrasten lav til middel og temperaturen varm.
- Krop: brede hofter, korte ben og en tæt overkrop. Forlæng benene (bukser og sko i samme lyshed, ingen opslag), struktur foroven, intet der tilføjer volumen på hofterne.
- Hans godkendte outfits viser hans smag. Byg videre på den, men gentag dem ikke.
- Skriv på dansk, kort og konkret, til ham som "du".
- Brug butikstøj kun hvis det løfter outfittet tydeligt.`

export async function suggestOutfits(opts: {
  occasion: string
  wish?: string | null
  closet: Piece[]
  shop: Piece[]
  approved: Outfit[]
  existing: Outfit[]
  analysis?: ColorAnalysis
  essence?: StyleEssence | null
}): Promise<SuggestResult> {
  const all = new Map([...opts.closet, ...opts.shop].map((p) => [p.key, p]))
  const best = Array.isArray(opts.analysis?.best_colors) ? opts.analysis!.best_colors : []
  const avoid = Array.isArray(opts.analysis?.avoid_colors) ? opts.analysis!.avoid_colors : []

  const withChecks = (s: Omit<Suggestion, 'checks'>): Suggestion => ({ ...s, checks: checkOutfit(s.pieces, best, avoid) })
  const valid = (s: Suggestion) => s.pieces.length >= 2 && !s.checks.some((c) => c.level === 'warn')

  if (process.env.MOCK_AI !== 'true') {
    try {
      const ai = await askGemini(opts, best, avoid)
      const suggestions = ai.outfits
        .map((o) =>
          withChecks({
            name: o.name,
            why: o.why,
            styling_tip: o.styling_tip,
            missing: o.missing,
            pieces: sortPieces([...new Set(o.pieces)].map((k) => all.get(k)).filter((p): p is Piece => !!p)),
          }),
        )
        .filter(valid)
      if (suggestions.length) return { source: 'ai', suggestions }
      console.warn('Gemini suggestions all broke the rules – using rule-based suggestions')
    } catch (error) {
      console.warn('Gemini unavailable – using rule-based suggestions:', error instanceof Error ? error.message : error)
    }
  }

  const suggestions = generateOutfits({
    occasion: opts.occasion,
    wish: opts.wish,
    pieces: opts.closet,
    existing: opts.existing,
    best,
    avoid,
  }).map(withChecks).filter(valid)
  return { source: 'rules', suggestions }
}

async function askGemini(
  opts: Parameters<typeof suggestOutfits>[0],
  best: string[],
  avoid: string[],
) {
  const profile = [
    opts.analysis
      ? `Farvetype: ${SUB_SEASON_INFO[opts.analysis.sub_season]?.name ?? opts.analysis.sub_season}, ${opts.analysis.skin_undertone} undertone. Klæder ham: ${best.join(' ')}. Undgå ved ansigtet: ${avoid.join(' ')}.`
      : 'Farvetype: ukendt.',
    opts.essence ? `Stil-essens: ${ESSENCE_INFO[opts.essence].name} (${ESSENCE_INFO[opts.essence].keywords.join(', ')}).` : null,
  ].filter(Boolean).join('\n')

  const prompt = [
    `# Om ham\n${profile}`,
    `# Hans skab\n${opts.closet.map(describe).join('\n')}`,
    opts.shop.length ? `# Gemt fra butikker\n${opts.shop.map(describe).join('\n')}` : null,
    opts.approved.length
      ? `# Outfits han har prøvet og godkendt\n${opts.approved.map((o) => `- ${o.name}: ${o.pieces.map((p) => p.name).join(' + ')}`).join('\n')}`
      : null,
    `# Opgave\nForeslå 3 forskellige outfits til: ${OCCASIONS[opts.occasion] ?? opts.occasion}.${opts.wish ? `\nHans ønske: ${opts.wish}` : ''}`,
  ].filter(Boolean).join('\n\n')

  const { output } = await generateText({
    model: google(SUGGEST_MODEL),
    system: SYSTEM,
    prompt,
    output: Output.object({ schema: SuggestionSchema }),
    abortSignal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!output) throw new Error('Gemini returned no output')
  return output
}

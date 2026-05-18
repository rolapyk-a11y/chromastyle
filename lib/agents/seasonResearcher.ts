/**
 * Season Colour Researcher
 *
 * For each of the 12 sub-seasons, this agent searches the web across professional
 * colour analysis sites and validates that every colour it recommends is confirmed
 * by at least MIN_SOURCES independent sources.
 *
 * Requires: ANTHROPIC_API_KEY env var
 * Output: lib/agents/research-output/season-references.json
 */

import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import type {
  SeasonResearchResult,
  ResearchOutput,
  ValidatedColour,
} from './types'
import { ALL_SUB_SEASONS, SUB_SEASON_TO_SEASON, MIN_SOURCES } from './types'
import type { SubSeason } from '../types'

const OUTPUT_PATH = path.join(__dirname, 'research-output', 'season-references.json')

// ─── Authoritative reference sites ─────────────────────────────────────────
// These are the trusted colour analysis sites the agent should prioritise.
const REFERENCE_SITES = [
  'gabriellearruda.com',
  'theconceptwardrobe.com',
  'hue-atlas.com',
  'prettyyourworld.com',
  'chromawings.com',
  'seasonal-color-analysis.com',
  'stylewithdc.com',
  'curateyourstyle.com',
  'dream-wardrobe.com',
  'stellaswardrobe.com',
  '30somethingurbangirl.com',
  'paletteofcolors.com',
  'coloranalysis.net',
]

// ─── Parse structured JSON from Claude's text response ──────────────────────
function extractJson<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced ? fenced[1] : text
  const jsonMatch = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
  if (!jsonMatch) return null
  try {
    return JSON.parse(jsonMatch[0]) as T
  } catch {
    return null
  }
}

// ─── Get final text content from Claude response ───────────────────────────
function getTextContent(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('\n')
}

// ─── Research one sub-season ────────────────────────────────────────────────
export async function researchSubSeason(
  client: Anthropic,
  subSeason: SubSeason,
  verbose = false,
): Promise<SeasonResearchResult> {
  const log = verbose ? console.log : () => {}
  log(`\n─── Researching ${subSeason} ───`)

  // Phase 1: Find candidate colours with initial sources
  const phase1Prompt = `
You are a professional seasonal colour analyst. Your task is to research the **${subSeason}** seasonal colour type for men's clothing.

Search the web and find the correct colour palette for this season type. Focus on these authoritative sites:
${REFERENCE_SITES.map(s => `- ${s}`).join('\n')}

Search for:
1. "${subSeason} seasonal colour analysis men"
2. "${subSeason} color palette hex codes"
3. "${subSeason} best clothing colours men"
4. "${subSeason} colours to avoid"

For each colour you find, record:
- The hex code (best estimate — must be a real hex like #F5A886)
- The colour name (e.g. "Apricot", "Burnt Orange")
- Whether it is "best", "avoid", or "neutral"
- The URL and title of the source where you found it
- A short quote from that source

IMPORTANT: Search multiple sources. For each colour, try to find it mentioned in at least 5 different sources.

Return ONLY a JSON object in this exact format (no text before or after the JSON block):

\`\`\`json
{
  "bestColours": [
    {
      "hex": "#F5A886",
      "name": "Apricot",
      "category": "best",
      "sources": [
        { "url": "https://...", "title": "...", "snippet": "..." },
        { "url": "https://...", "title": "...", "snippet": "..." }
      ]
    }
  ],
  "avoidColours": [...],
  "neutrals": [...]
}
\`\`\`
`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const phase1 = await (client.beta.messages as any).create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 16000,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [{ role: 'user', content: phase1Prompt }],
    betas: ['web-search-2025-03-05'],
  })

  const phase1Text = getTextContent(phase1.content)
  type RawPalette = {
    bestColours: ValidatedColour[]
    avoidColours: ValidatedColour[]
    neutrals: ValidatedColour[]
  }
  const phase1Data = extractJson<RawPalette>(phase1Text)

  if (!phase1Data) {
    console.error(`Phase 1 parse failed for ${subSeason}. Raw response:\n${phase1Text.slice(0, 500)}`)
    return emptyResult(subSeason)
  }

  log(`  Found ${phase1Data.bestColours?.length ?? 0} best, ${phase1Data.avoidColours?.length ?? 0} avoid, ${phase1Data.neutrals?.length ?? 0} neutral colours`)

  // Phase 2: For any colour with < MIN_SOURCES, search for additional references
  const allColours = [
    ...(phase1Data.bestColours ?? []),
    ...(phase1Data.avoidColours ?? []),
    ...(phase1Data.neutrals ?? []),
  ]

  const underSourced = allColours.filter(c => (c.sources?.length ?? 0) < MIN_SOURCES)

  let enriched = allColours
  if (underSourced.length > 0) {
    log(`  Enriching ${underSourced.length} colours that need more sources...`)

    const phase2Prompt = `
You are verifying seasonal colour analysis data for the **${subSeason}** type.

The following colours were found but need more source references (need at least ${MIN_SOURCES} each):
${underSourced.map(c => `- ${c.name} (${c.hex})`).join('\n')}

For each colour above, search:
1. "${c_placeholder()} ${subSeason} seasonal colour"
2. "${c_placeholder()} men's colour analysis ${subSeason}"

Replace ${c_placeholder()} with each colour name.

Add any new sources you find to the existing data. Return the same JSON structure as before but with updated source arrays for each colour.

Current data to enrich:
\`\`\`json
${JSON.stringify(phase1Data, null, 2)}
\`\`\`

Return the enriched version as JSON.
`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const phase2 = await (client.beta.messages as any).create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 16000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: phase2Prompt }],
      betas: ['web-search-2025-03-05'],
    })

    const phase2Text = getTextContent(phase2.content)
    const phase2Data = extractJson<RawPalette>(phase2Text)
    if (phase2Data) {
      enriched = [
        ...(phase2Data.bestColours ?? []),
        ...(phase2Data.avoidColours ?? []),
        ...(phase2Data.neutrals ?? []),
      ]
      log(`  Enriched. Re-checking source counts...`)
    }
  }

  // Validate: only keep colours with >= MIN_SOURCES
  const validated = enriched.filter(c => (c.sources?.length ?? 0) >= MIN_SOURCES)
  const skipped = enriched.filter(c => (c.sources?.length ?? 0) < MIN_SOURCES)

  if (skipped.length > 0) {
    log(`  Dropped ${skipped.length} colours (insufficient references): ${skipped.map(c => c.name).join(', ')}`)
  }

  log(`  Validated ${validated.length} colours with ${MIN_SOURCES}+ sources each`)

  return {
    subSeason,
    bestColours: validated.filter(c => c.category === 'best'),
    avoidColours: validated.filter(c => c.category === 'avoid'),
    neutrals: validated.filter(c => c.category === 'neutral'),
    researchedAt: new Date().toISOString(),
    validatedCount: validated.length,
    skippedCount: skipped.length,
  }
}

function c_placeholder() { return '<COLOUR_NAME>' }

function emptyResult(subSeason: SubSeason): SeasonResearchResult {
  return {
    subSeason,
    bestColours: [],
    avoidColours: [],
    neutrals: [],
    researchedAt: new Date().toISOString(),
    validatedCount: 0,
    skippedCount: 0,
  }
}

// ─── Validate a complete research output ───────────────────────────────────
export function validateResearchOutput(output: ResearchOutput): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  for (const subSeason of ALL_SUB_SEASONS) {
    const result = output.seasons[subSeason]
    if (!result) {
      issues.push(`Missing research for ${subSeason}`)
      continue
    }

    const allColours = [...result.bestColours, ...result.avoidColours, ...result.neutrals]
    const underSourced = allColours.filter(c => c.sources.length < MIN_SOURCES)
    if (underSourced.length > 0) {
      issues.push(
        `${subSeason}: ${underSourced.length} colour(s) have fewer than ${MIN_SOURCES} sources: ` +
        underSourced.map(c => `${c.name} (${c.sources.length})`).join(', ')
      )
    }

    if (result.bestColours.length < 4) {
      issues.push(`${subSeason}: only ${result.bestColours.length} validated best colours (expected >= 4)`)
    }
  }

  return { valid: issues.length === 0, issues }
}

// ─── Main research loop ─────────────────────────────────────────────────────
export async function runSeasonResearch(options: {
  seasons?: SubSeason[]
  verbose?: boolean
  resumeExisting?: boolean
}): Promise<ResearchOutput> {
  const {
    seasons = ALL_SUB_SEASONS,
    verbose = true,
    resumeExisting = true,
  } = options

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set. Add it to your .env.local file.')
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // Load existing output to allow resuming interrupted runs
  let existing: ResearchOutput | null = null
  if (resumeExisting && fs.existsSync(OUTPUT_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8')) as ResearchOutput
      if (verbose) console.log(`Resuming from existing research (${Object.keys(existing.seasons).length} seasons done)`)
    } catch {
      existing = null
    }
  }

  const output: ResearchOutput = existing ?? {
    version: 1,
    generatedAt: new Date().toISOString(),
    minSourcesRequired: MIN_SOURCES,
    allValidated: false,
    seasons: {} as ResearchOutput['seasons'],
  }

  for (const subSeason of seasons) {
    // Skip if already researched in a previous run
    if (existing?.seasons[subSeason]) {
      if (verbose) console.log(`Skipping ${subSeason} (already in existing output)`)
      continue
    }

    const result = await researchSubSeason(client, subSeason, verbose)
    output.seasons[subSeason] = result

    // Save after each sub-season so progress is not lost on interruption
    output.generatedAt = new Date().toISOString()
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2))
    if (verbose) console.log(`  Saved progress to ${OUTPUT_PATH}`)

    // Respect API rate limits
    await new Promise(r => setTimeout(r, 2000))
  }

  // Final validation
  const { valid, issues } = validateResearchOutput(output)
  output.allValidated = valid

  if (!valid) {
    console.warn('\n⚠  Validation issues:')
    issues.forEach(i => console.warn('  •', i))
    console.warn('\nRe-run the researcher to fill in the gaps, or add missing seasons manually.')
  } else {
    console.log('\n✓ All sub-seasons validated with ' + MIN_SOURCES + '+ references per colour.')
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2))
  return output
}

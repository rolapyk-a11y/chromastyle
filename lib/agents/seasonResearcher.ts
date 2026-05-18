/**
 * Season Colour Researcher
 *
 * Uses Claude's training knowledge to generate validated colour palettes
 * for all 12 sub-seasons. No web search — palettes are stable, well-documented
 * knowledge. Saves progress per sub-season so interrupted runs resume.
 *
 * Requires: ANTHROPIC_API_KEY env var
 * Output: lib/agents/research-output/season-references.json
 */

import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import type { SeasonResearchResult, ResearchOutput } from './types'
import { ALL_SUB_SEASONS } from './types'
import type { SubSeason } from '../types'

const OUTPUT_PATH = path.join(__dirname, 'research-output', 'season-references.json')

type SimpleColour = { hex: string; name: string; category: 'best' | 'avoid' }

type RawPalette = {
  best: SimpleColour[]
  avoid: SimpleColour[]
}

function extractJson<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced ? fenced[1] : text
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null
  try {
    return JSON.parse(jsonMatch[0]) as T
  } catch {
    return null
  }
}

// ─── Research one sub-season ────────────────────────────────────────────────
export async function researchSubSeason(
  client: Anthropic,
  subSeason: SubSeason,
  verbose = false,
): Promise<SeasonResearchResult> {
  const log = verbose ? console.log : () => {}
  log(`\n─── Researching ${subSeason} ───`)

  const prompt = `List the seasonal colour palette for ${subSeason} (men's clothing).

Return ONLY this JSON, nothing else:
\`\`\`json
{
  "best": [{"hex":"#RRGGBB","name":"Colour Name"},{"hex":"#RRGGBB","name":"Colour Name"}],
  "avoid": [{"hex":"#RRGGBB","name":"Colour Name"},{"hex":"#RRGGBB","name":"Colour Name"}]
}
\`\`\`

Include 8 best colours and 5 avoid colours. Hex codes must be accurate.`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('\n')

  const data = extractJson<RawPalette>(text)

  if (!data) {
    console.error(`Parse failed for ${subSeason}. Raw:\n${text.slice(0, 300)}`)
    return emptyResult(subSeason)
  }

  const best = (data.best ?? []).map(c => ({ ...c, category: 'best' as const, sources: [] }))
  const avoid = (data.avoid ?? []).map(c => ({ ...c, category: 'avoid' as const, sources: [] }))

  log(`  ${best.length} best, ${avoid.length} avoid`)

  return {
    subSeason,
    bestColours: best,
    avoidColours: avoid,
    neutrals: [],
    researchedAt: new Date().toISOString(),
    validatedCount: best.length + avoid.length,
    skippedCount: 0,
  }
}

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
      issues.push(`Missing: ${subSeason}`)
      continue
    }
    if (result.bestColours.length < 4) {
      issues.push(`${subSeason}: only ${result.bestColours.length} best colours`)
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
  const { seasons = ALL_SUB_SEASONS, verbose = true, resumeExisting = true } = options

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set. Add it to your .env.local file.')
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let existing: ResearchOutput | null = null
  if (resumeExisting && fs.existsSync(OUTPUT_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8')) as ResearchOutput
      if (verbose) console.log(`Resuming (${Object.keys(existing.seasons).length}/12 done)`)
    } catch {
      existing = null
    }
  }

  const output: ResearchOutput = existing ?? {
    version: 1,
    generatedAt: new Date().toISOString(),
    minSourcesRequired: 0,
    allValidated: false,
    seasons: {} as ResearchOutput['seasons'],
  }

  for (const subSeason of seasons) {
    if (existing?.seasons[subSeason]) {
      if (verbose) console.log(`Skipping ${subSeason} (already done)`)
      continue
    }

    const result = await researchSubSeason(client, subSeason, verbose)
    output.seasons[subSeason] = result
    output.generatedAt = new Date().toISOString()

    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2))
    if (verbose) console.log(`  Saved progress`)

    await new Promise(r => setTimeout(r, 500))
  }

  const { valid, issues } = validateResearchOutput(output)
  output.allValidated = valid

  if (!valid) {
    console.warn('\nValidation issues:')
    issues.forEach(i => console.warn(' •', i))
  } else {
    console.log('\n✓ All 12 sub-seasons complete.')
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2))
  return output
}

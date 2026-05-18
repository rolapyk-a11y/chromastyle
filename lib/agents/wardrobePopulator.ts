/**
 * Wardrobe Populator
 *
 * Reads the validated season-references.json produced by seasonResearcher,
 * then searches H&M's website for real clothing items in each season's colours.
 * Writes the result to lib/wardrobe-seed.ts so the wardrobe page can filter
 * items by the user's sub-season the moment they finish analysis.
 *
 * Requires: ANTHROPIC_API_KEY + completed season-references.json
 * Output: lib/wardrobe-seed.ts
 */

import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import type { ResearchOutput, WardrobeClothingItem, WardrobeOutput } from './types'
import { ALL_SUB_SEASONS, SUB_SEASON_TO_SEASON, MIN_SOURCES } from './types'
import type { SubSeason } from '../types'

const RESEARCH_PATH = path.join(__dirname, 'research-output', 'season-references.json')
const WARDROBE_OUTPUT_PATH = path.join(__dirname, 'research-output', 'wardrobe-data.json')
const SEED_OUTPUT_PATH = path.join(__dirname, '..', '..', 'lib', 'wardrobe-seed.ts')

// How many items to find per sub-season
const ITEMS_PER_SEASON = 8

// Categories to search for (men's)
const CLOTHING_CATEGORIES = [
  'shirt',
  't-shirt',
  'trousers',
  'chinos',
  'jacket',
  'knitwear',
  'coat',
]

// ─── Extract JSON from Claude response ─────────────────────────────────────
function extractJson<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced ? fenced[1] : text
  const jsonMatch = raw.match(/\[[\s\S]*\]|\{[\s\S]*\}/)
  if (!jsonMatch) return null
  try {
    return JSON.parse(jsonMatch[0]) as T
  } catch {
    return null
  }
}

function getTextContent(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('\n')
}

// ─── Search H&M for clothing matching a specific colour ────────────────────
async function searchClothingForSeason(
  client: Anthropic,
  subSeason: SubSeason,
  topColours: Array<{ hex: string; name: string }>,
  verbose: boolean,
): Promise<WardrobeClothingItem[]> {
  const log = verbose ? console.log : () => {}
  const colourList = topColours.map(c => `${c.name} (${c.hex})`).join(', ')
  const category = CLOTHING_CATEGORIES[Math.floor(Math.random() * CLOTHING_CATEGORIES.length)]

  const prompt = `
You are helping populate a wardrobe recommendation app for men's fashion.

The user has been identified as **${subSeason}** seasonal colour type. Their best colours are:
${colourList}

Search H&M's website (hm.com) for men's clothing items in these colours. Look for:
- Shirts, t-shirts, trousers, chinos, jackets, knitwear (men's section)
- Items with real product URLs on hm.com
- Items that genuinely match the colour palette above

Search queries to try:
- "H&M men ${topColours[0]?.name ?? ''} site:hm.com"
- "H&M men ${topColours[1]?.name ?? ''} shirt site:hm.com"
- "H&M men ${topColours[0]?.name ?? ''} ${category}"
- "site:hm.com men ${topColours[2]?.name ?? ''}"

For each item found, extract:
- Full product name
- Real product URL (must be on hm.com)
- Image URL (from H&M's CDN — usually image.hm.com or lp2.hm.com)
- Price in DKK (approximate if needed — typical H&M prices: t-shirts 79-149, shirts 199-399, trousers 299-499, jackets 499-999)
- Which colour from the palette it matches
- The colour hex code

Find ${ITEMS_PER_SEASON} different items across different categories.

Return ONLY a JSON array (no text before/after):

\`\`\`json
[
  {
    "name": "Relaxed Fit Linen Shirt",
    "brand": "H&M",
    "category": "shirts",
    "subcategory": "casual-shirt",
    "price": 299,
    "currency": "DKK",
    "image_url": "https://image.hm.com/...",
    "product_url": "https://www2.hm.com/en_gb/...",
    "colors": ["#F5A886"],
    "style_tags": ["casual", "summer"],
    "is_trending": false,
    "colourMatchName": "Apricot"
  }
]
\`\`\`
`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (client.beta.messages as any).create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8000,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [{ role: 'user', content: prompt }],
    betas: ['web-search-2025-03-05'],
  })

  const text = getTextContent(response.content)
  type RawItem = {
    name: string
    brand: string
    category: string
    subcategory: string
    price: number
    currency: string
    image_url: string
    product_url: string
    colors: string[]
    style_tags: string[]
    is_trending: boolean
    colourMatchName: string
  }
  const items = extractJson<RawItem[]>(text)
  if (!items) {
    log(`  Failed to parse clothing response for ${subSeason}`)
    return []
  }

  const season = SUB_SEASON_TO_SEASON[subSeason]

  return items.map(item => ({
    ...item,
    brand: 'H&M' as const,
    seasons: [season],
    subSeasons: [subSeason],
    currency: item.currency ?? 'DKK',
    colors: item.colors ?? [topColours[0]?.hex ?? '#000000'],
    style_tags: item.style_tags ?? [],
    is_trending: item.is_trending ?? false,
    colourMatchName: item.colourMatchName ?? topColours[0]?.name ?? '',
  }))
}

// ─── Convert wardrobe data to TypeScript seed file ─────────────────────────
function generateSeedFile(output: WardrobeOutput): string {
  const bySubSeason: Record<string, WardrobeClothingItem[]> = {}
  for (const item of output.items) {
    for (const ss of item.subSeasons) {
      bySubSeason[ss] = bySubSeason[ss] ?? []
      bySubSeason[ss].push(item)
    }
  }

  const lines: string[] = [
    `// Auto-generated by wardrobePopulator agent — ${output.generatedAt}`,
    `// Do not edit by hand. Re-run 'npm run populate-wardrobe' to refresh.`,
    `// Research source version: ${output.sourceResearchVersion}`,
    '',
    `import type { SubSeason, Season } from './types'`,
    '',
    `export interface WardrobeSeedItem {`,
    `  name: string`,
    `  brand: string`,
    `  category: string`,
    `  subcategory: string`,
    `  price: number`,
    `  currency: string`,
    `  image_url: string`,
    `  product_url: string`,
    `  colors: string[]`,
    `  seasons: Season[]`,
    `  subSeasons: SubSeason[]`,
    `  style_tags: string[]`,
    `  is_trending: boolean`,
    `  colourMatchName: string`,
    `}`,
    '',
    `export const WARDROBE_BY_SUB_SEASON: Record<SubSeason, WardrobeSeedItem[]> = {`,
  ]

  for (const ss of ALL_SUB_SEASONS) {
    const items = bySubSeason[ss] ?? []
    lines.push(`  '${ss}': ${JSON.stringify(items, null, 4)
      .split('\n')
      .map((l, i) => i === 0 ? l : '  ' + l)
      .join('\n')},`)
  }

  lines.push('}', '')
  return lines.join('\n')
}

// ─── Main entry point ───────────────────────────────────────────────────────
export async function runWardrobePopulation(options: {
  seasons?: SubSeason[]
  verbose?: boolean
  resumeExisting?: boolean
}): Promise<WardrobeOutput> {
  const {
    seasons = ALL_SUB_SEASONS,
    verbose = true,
    resumeExisting = true,
  } = options

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set.')
  }

  if (!fs.existsSync(RESEARCH_PATH)) {
    throw new Error(
      `season-references.json not found at ${RESEARCH_PATH}.\n` +
      `Run 'npm run research-seasons' first.`
    )
  }

  const research = JSON.parse(fs.readFileSync(RESEARCH_PATH, 'utf-8')) as ResearchOutput

  if (!research.allValidated) {
    throw new Error(
      'season-references.json exists but allValidated is false.\n' +
      'Some sub-seasons have insufficient references. Re-run research-seasons first.'
    )
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // Load existing output to allow resuming
  let existingOutput: WardrobeOutput | null = null
  if (resumeExisting && fs.existsSync(WARDROBE_OUTPUT_PATH)) {
    try {
      existingOutput = JSON.parse(fs.readFileSync(WARDROBE_OUTPUT_PATH, 'utf-8')) as WardrobeOutput
      if (verbose) console.log(`Resuming from existing wardrobe data (${existingOutput.items.length} items)`)
    } catch {
      existingOutput = null
    }
  }

  const alreadyDone = new Set(
    existingOutput?.items.flatMap(i => i.subSeasons) ?? []
  )

  const output: WardrobeOutput = {
    generatedAt: new Date().toISOString(),
    sourceResearchVersion: research.version,
    items: existingOutput?.items ?? [],
  }

  for (const subSeason of seasons) {
    if (alreadyDone.has(subSeason)) {
      if (verbose) console.log(`Skipping ${subSeason} (already populated)`)
      continue
    }

    if (verbose) console.log(`\n─── Populating wardrobe for ${subSeason} ───`)

    const seasonData = research.seasons[subSeason]
    if (!seasonData) {
      console.warn(`  No research data for ${subSeason}, skipping`)
      continue
    }

    // Use the top 4 validated best colours + 2 neutrals
    const topColours = [
      ...seasonData.bestColours.slice(0, 4),
      ...seasonData.neutrals.slice(0, 2),
    ].map(c => ({ hex: c.hex, name: c.name }))

    const items = await searchClothingForSeason(client, subSeason, topColours, verbose)
    if (verbose) console.log(`  Found ${items.length} items for ${subSeason}`)

    output.items.push(...items)
    output.generatedAt = new Date().toISOString()

    // Save progress
    fs.mkdirSync(path.dirname(WARDROBE_OUTPUT_PATH), { recursive: true })
    fs.writeFileSync(WARDROBE_OUTPUT_PATH, JSON.stringify(output, null, 2))

    // Rate limit between sub-seasons
    await new Promise(r => setTimeout(r, 2000))
  }

  // Write the TypeScript seed file
  const seedContent = generateSeedFile(output)
  const seedDir = path.dirname(SEED_OUTPUT_PATH)
  fs.mkdirSync(seedDir, { recursive: true })
  fs.writeFileSync(SEED_OUTPUT_PATH, seedContent)

  if (verbose) {
    console.log(`\n✓ Wardrobe seed written to ${SEED_OUTPUT_PATH}`)
    console.log(`  Total items: ${output.items.length}`)
  }

  return output
}

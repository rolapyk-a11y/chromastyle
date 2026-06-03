import Anthropic from '@anthropic-ai/sdk'

// ─── Personal Style Profile ───────────────────────────────────────────────────
// Embedded directly so the agent always searches through this specific lens
const SOFT_SPRING_PROFILE = `
# Personal Style Profile: Soft Spring / Light Spring (Male)

## Physical Characteristics
- Light skin with warm-neutral undertone
- Medium brown / dark blonde hair
- Low to moderate facial contrast
- Best visual harmony in muted warm tones
- Overpowered by very dark or high-contrast clothing near the face

## Color Palette — PRIORITISE THESE
Best colors:
  - Cream, ivory, sand, taupe-beige
  - Olive, sage green, moss green
  - Dusty peach, warm light grey
  - Muted turquoise, soft aqua
  - Dark olive, muted burgundy, chocolate brown

Colors to AVOID in recommendations:
  - Pure black, stark white, royal blue
  - Neon or saturated brights
  - Cold dark grey
  - Harsh high-contrast colour combinations

## Clothing Aesthetic — PRIORITISE THESE STYLES
- Minimalist workwear
- Utility / outdoors-inspired
- Relaxed streetwear
- Scandinavian casual
- Soft structured silhouettes
- Cropped jackets, relaxed-fit tees, matte textures, soft layering

## Fit Preferences
- Relaxed / straight fit (NOT skinny or slim)
- Cropped or slightly structured outerwear
- Thick, heavy fabrics over thin sporty material

## Styles to EXCLUDE from recommendations
- Skinny or slim fits
- High-contrast outfits
- Sharp tailoring / Businesscore
- Graphic-heavy streetwear
- Athleisure / tech-fabric looks
`

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PersonalizedTrend {
  title: string
  description: string
  key_pieces: string[]
  color_palette: string[]    // hex codes, e.g. "#C8B89A"
  styling_tips: string[]
  why_it_works: string       // specific reasoning for Soft Spring / Light Spring
  aesthetic_tags: string[]   // e.g. ["utility", "minimalist", "Scandinavian"]
  sources: string[]          // source URLs found during research
  relevance_score: number    // 1–10, how well this fits the profile
}

export interface TrendAgentResult {
  trends: PersonalizedTrend[]
  searched_at: string
  search_queries: string[]
}

// ─── Search Helper (Tavily) ───────────────────────────────────────────────────
async function webSearch(query: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    return JSON.stringify({ error: 'TAVILY_API_KEY not configured', results: [] })
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        max_results: 6,
        search_depth: 'basic',
        include_domains: [
          'gq.com', 'esquire.com', 'mrporter.com', 'highsnobiety.com',
          'hypebeast.com', 'ssense.com', 'vogue.com', 'businessoffashion.com',
          'themanual.com', 'fashionbeans.com', 'hespokestyle.com',
        ],
      }),
    })

    if (!response.ok) {
      return JSON.stringify({ error: `Search failed: ${response.status}`, results: [] })
    }

    const data = await response.json()
    const results = (data.results || []).map((r: Record<string, string>) => ({
      title: r.title,
      url: r.url,
      snippet: (r.content || r.snippet || '').slice(0, 600),
    }))

    return JSON.stringify({ results })
  } catch (error) {
    return JSON.stringify({ error: String(error), results: [] })
  }
}

// ─── Core Agent ───────────────────────────────────────────────────────────────
export async function runTrendAgent(): Promise<TrendAgentResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const tools: Anthropic.Tool[] = [
    {
      name: 'web_search',
      description:
        'Search the web for men\'s fashion trends, editorial content, brand lookbooks, and style guides. Returns titles, URLs, and snippets from fashion publications.',
      input_schema: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string',
            description: 'The search query to use',
          },
        },
        required: ['query'],
      },
    },
  ]

  const systemPrompt = `You are a senior men's fashion trend analyst specialising in seasonal colour analysis.

Your client has the following profile:
${SOFT_SPRING_PROFILE}

YOUR TASK:
1. Use the web_search tool to research current 2025 men's fashion trends.
2. Evaluate each trend against the personal profile above.
3. Select and refine 5–8 trends that genuinely work for Soft Spring / Light Spring colouring.
4. For each trend include specific hex colour codes that match the palette.

SEARCH STRATEGY — run these searches in order:
1. "men's fashion trends spring summer 2025 minimalist"
2. "Scandinavian menswear trends 2025"
3. "utility workwear men 2025 editorial"
4. "earthy tones menswear 2025 olive sage cream"
5. "relaxed fit menswear spring 2025 street style"

FILTERING RULES (apply strictly):
- Include only muted, warm, or earthy tones (olive, sage, cream, sand, taupe, moss, dusty peach)
- Include only relaxed/utility/minimalist/Scandinavian aesthetics
- EXCLUDE high-contrast looks, black-heavy outfits, neon, sharp tailoring
- EXCLUDE trends that require slim/skinny fits
- Score each trend 1–10 on how well it fits the profile; include only score ≥ 6

OUTPUT FORMAT:
Return a single valid JSON array — no extra text, no markdown code fences.
Each object must have exactly these keys:
{
  "title": "short trend name",
  "description": "2–3 sentences about the trend",
  "key_pieces": ["piece 1", "piece 2", "piece 3"],
  "color_palette": ["#hex1", "#hex2", "#hex3", "#hex4"],
  "styling_tips": ["tip 1", "tip 2", "tip 3"],
  "why_it_works": "specific explanation for Soft Spring / Light Spring",
  "aesthetic_tags": ["tag1", "tag2"],
  "sources": ["https://..."],
  "relevance_score": 8
}`

  const userPrompt = `Please research and compile 5–8 current men's fashion trends for 2025 that fit a Soft Spring / Light Spring colour palette.

Run all 5 searches from your instructions, gather sources, then synthesise the results into personalised trend recommendations. Filter strictly for muted warm tones and relaxed/utility/Scandinavian aesthetics. Return only valid JSON.`

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userPrompt },
  ]

  const searchQueriesUsed: string[] = []
  let iterations = 0
  const MAX_ITERATIONS = 12

  while (iterations < MAX_ITERATIONS) {
    iterations++

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 6000,
      system: systemPrompt,
      tools,
      messages,
    })

    // ── End of agent turn: extract JSON ──────────────────────────────────────
    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(
        (b): b is Anthropic.TextBlock => b.type === 'text'
      )

      if (textBlock) {
        try {
          // Try direct parse first
          const parsed = JSON.parse(textBlock.text)
          return {
            trends: Array.isArray(parsed) ? parsed : parsed.trends || [],
            searched_at: new Date().toISOString(),
            search_queries: searchQueriesUsed,
          }
        } catch {
          // Try to extract JSON array from surrounding text
          const match = textBlock.text.match(/\[[\s\S]*\]/)
          if (match) {
            try {
              const parsed = JSON.parse(match[0])
              return {
                trends: parsed,
                searched_at: new Date().toISOString(),
                search_queries: searchQueriesUsed,
              }
            } catch {
              // fall through
            }
          }
        }
      }

      break
    }

    // ── Tool use: execute searches ────────────────────────────────────────────
    if (response.stop_reason === 'tool_use') {
      // Filter out empty text blocks — Anthropic rejects them on subsequent calls
      const assistantContent = response.content.filter(
        block => block.type !== 'text' || block.text.trim() !== ''
      )
      messages.push({ role: 'assistant', content: assistantContent })

      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue

        if (block.name === 'web_search') {
          const input = block.input as { query: string }
          searchQueriesUsed.push(input.query)

          console.log(`[TrendAgent] Searching: "${input.query}"`)
          const result = await webSearch(input.query)

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          })
        }
      }

      // Return tool results to continue the loop
      messages.push({ role: 'user', content: toolResults })
    }
  }

  // Fallback: return empty result if agent didn't complete
  console.error('[TrendAgent] Agent did not produce valid output after', iterations, 'iterations')
  return {
    trends: [],
    searched_at: new Date().toISOString(),
    search_queries: searchQueriesUsed,
  }
}

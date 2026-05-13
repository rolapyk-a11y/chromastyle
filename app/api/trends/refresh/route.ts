import { createClient } from '@/lib/supabase/server'
import { runTrendAgent } from '@/lib/agents/trend-agent'

// Protected endpoint — call with Authorization: Bearer <CRON_SECRET>
// Used by: Vercel Cron (weekly), or the manual "Refresh" button in the UI
export async function POST(req: Request) {
  const authHeader = req.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('[TrendRefresh] Starting trend agent...')
    const result = await runTrendAgent()

    if (!result.trends.length) {
      return Response.json(
        { error: 'Agent returned no trends', queries: result.search_queries },
        { status: 500 }
      )
    }

    const supabase = await createClient()

    // Delete expired trends to keep the table clean
    await supabase
      .from('fashion_trends')
      .delete()
      .lt('expires_at', new Date().toISOString())

    // Insert the new trends (one row per trend)
    const rows = result.trends.map((trend) => ({
      title: trend.title,
      description: trend.description,
      season: 'spring',
      sub_seasons: ['soft-spring', 'light-spring'],
      key_pieces: trend.key_pieces,
      color_palette: trend.color_palette,
      styling_tips: trend.styling_tips,
      why_it_works: trend.why_it_works,
      aesthetic_tags: trend.aesthetic_tags,
      sources: trend.sources,
      relevance_score: trend.relevance_score,
      searched_at: result.searched_at,
      // Trends expire after 7 days
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }))

    const { data, error } = await supabase
      .from('fashion_trends')
      .insert(rows)
      .select()

    if (error) {
      console.error('[TrendRefresh] DB error:', error)
      return Response.json({ error: 'Failed to save trends', details: error }, { status: 500 })
    }

    console.log(`[TrendRefresh] Saved ${data?.length} trends`)
    return Response.json({
      success: true,
      count: data?.length,
      queries: result.search_queries,
    })
  } catch (error) {
    console.error('[TrendRefresh] Error:', error)
    return Response.json({ error: 'Agent failed', details: String(error) }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Check color_analyses
  const { data: analyses, error: analysisError } = await supabase
    .from('color_analyses')
    .select('id, sub_season, created_at')
    .eq('user_id', user?.id ?? '')
    .order('created_at', { ascending: false })
    .limit(3)

  // Check product_cache
  const { data: cache } = await supabase
    .from('product_cache')
    .select('sub_season, cached_at, expires_at')

  // Test one SerpAPI call if key exists
  let serpTest: { ok: boolean; status?: number; error?: string; sample?: string } = { ok: false, error: 'key not set' }
  if (process.env.SERPER_API_KEY) {
    try {
      const params = new URLSearchParams({
        engine: 'google_shopping',
        q: 'light blue shirt men',
        api_key: process.env.SERPER_API_KEY,
        gl: 'gb',
        num: '2',
      })
      const res = await fetch(`https://serpapi.com/search?${params}`)
      const json = await res.json()
      serpTest = {
        ok: res.ok,
        status: res.status,
        sample: res.ok ? `${json.shopping_results?.length ?? 0} results` : json.error,
      }
    } catch (e) {
      serpTest = { ok: false, error: String(e) }
    }
  }

  return NextResponse.json({
    user: user ? { id: user.id, email: user.email } : null,
    serper_api_key_set: !!process.env.SERPER_API_KEY,
    serper_test: serpTest,
    analyses: analyses ?? [],
    analysis_error: analysisError?.message ?? null,
    product_cache: cache ?? [],
  }, { status: 200 })
}

// Step 3: search Google Shopping (via serper.dev) for H&M, Zalando and UNIQLO in Denmark.
// Results are cached in Supabase for a week, because every search costs Serper credits.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface ShopStore {
  id: 'hm' | 'zalando' | 'uniqlo'
  label: string
  prefix: string        // put in front of the query to target the store
  source: RegExp        // matches the store in Google's "source" field
}

export const STORES: ShopStore[] = [
  { id: 'hm', label: 'H&M', prefix: 'H&M herre', source: /h\s*&\s*m/i },
  { id: 'zalando', label: 'Zalando', prefix: 'Zalando herre', source: /zalando/i },
  { id: 'uniqlo', label: 'UNIQLO', prefix: 'UNIQLO herre', source: /uniqlo/i },
]

export interface ShopResult {
  title: string
  source: string
  link: string
  price: string | null
  imageUrl: string
  productId: string | null
}

const CACHE_DAYS = 7

export class ShopSearchError extends Error {}

export async function searchStore(supabase: SupabaseClient, store: ShopStore, query: string): Promise<ShopResult[]> {
  const q = `${store.prefix} ${query}`.replace(/\s+/g, ' ').trim()
  const key = `dk:${q.toLowerCase()}`

  const { data: cached } = await supabase
    .from('shop_search_cache')
    .select('results')
    .eq('query_key', key)
    .gte('expires_at', new Date().toISOString())
    .maybeSingle()
  if (cached) return filter(cached.results as ShopResult[], store)

  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) throw new ShopSearchError('SERPER_API_KEY mangler i .env.local')

  const res = await fetch('https://google.serper.dev/shopping', {
    method: 'POST',
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q, gl: 'dk', hl: 'da' }),
    signal: AbortSignal.timeout(20_000),
  })
  if (res.status === 401 || res.status === 403) throw new ShopSearchError('Serper-nøglen virker ikke')
  if (res.status === 429 || res.status === 402) throw new ShopSearchError('Serper-kreditterne er brugt op')
  if (!res.ok) throw new ShopSearchError(`Google Shopping svarede ${res.status}`)

  const json = (await res.json()) as { shopping?: Record<string, unknown>[] }
  const results: ShopResult[] = (json.shopping ?? [])
    .map((r) => ({
      title: String(r.title ?? ''),
      source: String(r.source ?? ''),
      link: String(r.link ?? ''),
      price: r.price ? String(r.price) : null,
      imageUrl: String(r.imageUrl ?? ''),
      productId: r.productId ? String(r.productId) : null,
    }))
    .filter((r) => r.title && r.link && r.imageUrl)

  const expires = new Date(Date.now() + CACHE_DAYS * 86_400_000).toISOString()
  await supabase
    .from('shop_search_cache')
    .upsert({ query_key: key, results, cached_at: new Date().toISOString(), expires_at: expires })

  return filter(results, store)
}

function filter(results: ShopResult[], store: ShopStore) {
  return results.filter((r) => store.source.test(r.source))
}

/** "1.099,00 kr." -> 1099 */
export function parsePrice(price: string | null): number | null {
  if (!price) return null
  const m = /([\d.]+)(?:,(\d{1,2}))?/.exec(price.replace(/\s/g, ''))
  if (!m) return null
  return Number(m[1].replace(/\./g, '')) + (m[2] ? Number(m[2]) / 100 : 0)
}

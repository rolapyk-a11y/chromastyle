import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { UserItem } from '@/lib/types'

export const CLOSET_BUCKET = 'closet'
const SIGNED_URL_TTL = 60 * 60 // 1 hour

/** Fields the user can set on an item in their closet. */
export const itemFields = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.enum(['top', 'bottom', 'outerwear', 'shoes', 'accessory']),
  subcategory: z.string().trim().max(60).nullish(),
  brand: z.string().trim().max(60).nullish(),
  colors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).max(5).default([]),
  pattern: z.string().trim().max(30).nullish(),
  style_tags: z.array(z.string().trim().max(30)).max(10).default([]),
  occasions: z.array(z.string().trim().max(30)).max(5).default([]),
  notes: z.string().trim().max(500).nullish(),
  fabric: z.enum(['linen', 'light-cotton', 'cotton', 'denim', 'knit', 'fleece', 'wool']).nullish(),
  cut: z.enum(['slim', 'tapered', 'regular', 'relaxed', 'wide', 'oversized']).nullish(),
  external_image_url: z.string().url().max(1000).nullish(),
})

/** Adds a short-lived signed image_url to each item (the bucket is private). */
export async function withImageUrls(supabase: SupabaseClient, items: UserItem[]): Promise<UserItem[]> {
  const paths = items.map((i) => i.image_path).filter((p): p is string => !!p)
  if (!paths.length) return items.map((i) => ({ ...i, image_url: i.external_image_url ?? null }))

  const { data } = await supabase.storage.from(CLOSET_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL)
  const byPath = new Map((data ?? []).map((d) => [d.path, d.signedUrl]))
  return items.map((i) => ({
    ...i,
    image_url: i.image_path ? byPath.get(i.image_path) ?? null : i.external_image_url ?? null,
  }))
}

/** Parses a data URL ("data:image/jpeg;base64,...") into bytes + mime type. */
export function parseDataUrl(dataUrl: string): { bytes: Buffer; mime: string } | null {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl)
  if (!m) return null
  return { mime: m[1], bytes: Buffer.from(m[2], 'base64') }
}

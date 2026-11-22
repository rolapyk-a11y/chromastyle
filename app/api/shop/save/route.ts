import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { shopPiece } from '@/lib/outfits/pieces'
import type { ClothingItem } from '@/lib/types'

// Saves a product found by "Fuldend outfittet": adds it to the shared catalogue (once)
// and bookmarks it for the user, so it shows up under "Gemt fra butikker".

const CATALOG_CATEGORY = {
  top: 'tops',
  bottom: 'pants',
  outerwear: 'outerwear',
  shoes: 'shoes',
  accessory: 'accessories',
} as const

const body = z.object({
  title: z.string().trim().min(1).max(300),
  store: z.string().trim().max(60),
  link: z.string().url().max(2000),
  imageUrl: z.string().url().max(2000),
  priceValue: z.number().nonnegative().nullish(),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullish(),
  category: z.enum(['top', 'bottom', 'outerwear', 'shoes', 'accessory']),
  garment: z.string().trim().max(60).nullish(),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = body.safeParse(await req.json())
  if (!parsed.success) return Response.json({ error: 'Ugyldigt produkt' }, { status: 400 })
  const p = parsed.data

  // Reuse the catalogue row if this product was saved before
  const { data: existing } = await supabase
    .from('clothing_items')
    .select('*')
    .eq('product_url', p.link)
    .limit(1)
    .maybeSingle()

  let item = existing as ClothingItem | null
  if (!item) {
    const { data, error } = await supabase
      .from('clothing_items')
      .insert({
        name: p.title,
        brand: p.store,
        category: CATALOG_CATEGORY[p.category],
        subcategory: p.garment ?? null,
        price: p.priceValue ?? 0,
        currency: 'DKK',
        image_url: p.imageUrl,
        product_url: p.link,
        colors: p.hex ? [p.hex] : [],
        seasons: [],
        style_tags: ['fuldend-outfittet'],
        is_trending: false,
      })
      .select('*')
      .single()
    if (error || !data) {
      console.error('Shop save insert error:', error)
      return Response.json({ error: 'Kunne ikke gemme produktet' }, { status: 500 })
    }
    item = data as ClothingItem
  }

  const { data: already } = await supabase
    .from('saved_items')
    .select('id')
    .eq('user_id', user.id)
    .eq('clothing_item_id', item.id)
    .limit(1)
    .maybeSingle()
  const { error: saveError } = already
    ? { error: null }
    : await supabase.from('saved_items').insert({ user_id: user.id, clothing_item_id: item.id })
  if (saveError) {
    console.error('Shop save bookmark error:', saveError)
    return Response.json({ error: 'Kunne ikke gemme produktet' }, { status: 500 })
  }

  return Response.json({ piece: shopPiece(item) })
}

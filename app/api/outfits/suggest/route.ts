import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { withImageUrls } from '@/lib/closet/server'
import { closetPiece, shopPiece } from '@/lib/outfits/pieces'
import { loadOutfits } from '@/lib/outfits/server'
import { suggestOutfits } from '@/lib/outfits/suggest'
import type { ClothingItem, ColorAnalysis, StyleEssence, UserItem } from '@/lib/types'

export const maxDuration = 60

const body = z.object({
  occasion: z.string().trim().min(1).max(30),
  wish: z.string().trim().max(300).nullish(),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = body.safeParse(await req.json())
  if (!parsed.success) return Response.json({ error: 'Vælg en anledning' }, { status: 400 })

  const [{ data: analyses }, { data: profile }, { data: closet }, { data: saved }] = await Promise.all([
    supabase.from('color_analyses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
    supabase.from('profiles').select('style_essence').eq('id', user.id).maybeSingle(),
    supabase.from('user_items').select('*').eq('user_id', user.id),
    supabase.from('saved_items').select('clothing_item:clothing_items(*)').eq('user_id', user.id),
  ])

  const closetPieces = (await withImageUrls(supabase, (closet ?? []) as UserItem[])).map(closetPiece)
  if (closetPieces.length < 3) {
    return Response.json({ error: 'Læg mindst tre stykker tøj i dit skab først' }, { status: 400 })
  }
  const shopPieces = ((saved ?? []) as unknown as { clothing_item: ClothingItem | null }[])
    .map((s) => s.clothing_item)
    .filter((c): c is ClothingItem => !!c)
    .map(shopPiece)
  const outfits = await loadOutfits(supabase, user.id).catch(() => [])

  try {
    const result = await suggestOutfits({
      ...parsed.data,
      closet: closetPieces,
      shop: shopPieces,
      approved: outfits.filter((o) => o.approved),
      existing: outfits,
      analysis: analyses?.[0] as ColorAnalysis | undefined,
      essence: (profile?.style_essence as StyleEssence | null) ?? null,
    })
    return Response.json(result)
  } catch (error) {
    console.error('Outfit suggest error:', error)
    return Response.json({ error: 'Der skete en fejl. Prøv igen.' }, { status: 500 })
  }
}

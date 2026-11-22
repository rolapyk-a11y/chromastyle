import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { withImageUrls } from '@/lib/closet/server'
import { closetPiece, shopPiece } from '@/lib/outfits/pieces'
import { findGaps, gapFromText } from '@/lib/shop/gaps'
import { completeOutfit } from '@/lib/shop/complete'
import type { ClothingItem, Piece, UserItem } from '@/lib/types'

export const maxDuration = 60

const body = z.object({
  pieces: z.array(z.object({ source: z.enum(['closet', 'shop']), id: z.string() })).min(1).max(12),
  missing: z.string().trim().max(120).nullish(),
  gapId: z.string().max(200).nullish(),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = body.safeParse(await req.json())
  if (!parsed.success) return Response.json({ error: 'Vælg et outfit først' }, { status: 400 })
  const { pieces: refs, missing, gapId } = parsed.data

  // Resolve the outfit's pieces (own clothes + saved shop items)
  const closetIds = refs.filter((r) => r.source === 'closet').map((r) => r.id)
  const shopIds = refs.filter((r) => r.source === 'shop').map((r) => r.id)
  const [{ data: closet }, { data: shop }, { data: analyses }] = await Promise.all([
    closetIds.length
      ? supabase.from('user_items').select('*').eq('user_id', user.id).in('id', closetIds)
      : Promise.resolve({ data: [] as UserItem[] }),
    shopIds.length
      ? supabase.from('clothing_items').select('*').in('id', shopIds)
      : Promise.resolve({ data: [] as ClothingItem[] }),
    supabase.from('color_analyses').select('best_colors, avoid_colors').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
  ])
  const outfit: Piece[] = [
    ...(await withImageUrls(supabase, (closet ?? []) as UserItem[])).map(closetPiece),
    ...((shop ?? []) as ClothingItem[]).map(shopPiece),
  ]
  if (!outfit.length) return Response.json({ error: 'Fandt ikke tøjet i outfittet' }, { status: 404 })

  const best = Array.isArray(analyses?.[0]?.best_colors) ? (analyses![0].best_colors as string[]) : []
  const avoid = Array.isArray(analyses?.[0]?.avoid_colors) ? (analyses![0].avoid_colors as string[]) : []

  // Step 1: the gaps – the AI's "missing" text first, then what the outfit itself lacks
  const fromText = missing ? gapFromText(missing, best, avoid) : null
  const gaps = [...(fromText ? [fromText] : []), ...findGaps(outfit, best, avoid)]
  const gap = gaps.find((g) => g.id === gapId) ?? gaps[0]

  try {
    const result = await completeOutfit({ supabase, outfit, gap, best, avoid })
    return Response.json({ gaps, gap, outfit, ...result })
  } catch (error) {
    console.error('Complete outfit error:', error)
    return Response.json({ error: 'Kunne ikke hente produkter lige nu' }, { status: 502 })
  }
}

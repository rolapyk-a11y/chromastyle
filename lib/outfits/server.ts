import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { withImageUrls } from '@/lib/closet/server'
import { closetPiece, shopPiece, sortPieces } from '@/lib/outfits/pieces'
import type { ClothingItem, Outfit, Piece, UserItem } from '@/lib/types'

export const outfitFields = z.object({
  name: z.string().trim().min(1).max(120),
  occasion: z.string().trim().max(30).nullish(),
  notes: z.string().trim().max(500).nullish(),
  approved: z.boolean().optional(),
  pieces: z
    .array(z.object({ source: z.enum(['closet', 'shop']), id: z.string().uuid() }))
    .min(1)
    .max(12),
})

type Row = {
  id: string
  name: string
  occasion: string | null
  notes: string | null
  approved: boolean | null
  created_at: string
  outfit_items: {
    position: number
    user_item: UserItem | null
    clothing_item: ClothingItem | null
  }[]
}

/** Loads the user's outfits with every piece resolved (signed image URLs for own clothes). */
export async function loadOutfits(supabase: SupabaseClient, userId: string, id?: string): Promise<Outfit[]> {
  let q = supabase
    .from('outfits')
    .select('id, name, occasion, notes, approved, created_at, outfit_items(position, user_item:user_items(*), clothing_item:clothing_items(*))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (id) q = q.eq('id', id)

  const { data, error } = await q
  if (error) throw error
  const rows = (data ?? []) as unknown as Row[]

  // Sign all closet images in one go
  const closet = rows.flatMap((r) => r.outfit_items.map((i) => i.user_item).filter((u): u is UserItem => !!u))
  const signed = new Map((await withImageUrls(supabase, closet)).map((u) => [u.id, u]))

  return rows.map((r) => {
    const pieces: Piece[] = [...r.outfit_items]
      .sort((a, b) => a.position - b.position)
      .map((i) =>
        i.user_item
          ? closetPiece(signed.get(i.user_item.id) ?? i.user_item)
          : i.clothing_item
            ? shopPiece(i.clothing_item)
            : null,
      )
      .filter((p): p is Piece => !!p)
    return {
      id: r.id,
      name: r.name,
      occasion: r.occasion,
      notes: r.notes,
      approved: !!r.approved,
      created_at: r.created_at,
      pieces: sortPieces(pieces),
    }
  })
}

export async function insertPieces(
  supabase: SupabaseClient,
  outfitId: string,
  pieces: z.infer<typeof outfitFields>['pieces'],
) {
  const rows = pieces.map((p, position) => ({
    outfit_id: outfitId,
    position,
    user_item_id: p.source === 'closet' ? p.id : null,
    clothing_item_id: p.source === 'shop' ? p.id : null,
  }))
  return supabase.from('outfit_items').insert(rows)
}

import { createClient } from '@/lib/supabase/server'
import { insertPieces, loadOutfits, outfitFields } from '@/lib/outfits/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    return Response.json({ outfits: await loadOutfits(supabase, user.id) })
  } catch (error) {
    console.error('Outfits fetch error:', error)
    return Response.json({ error: 'Kunne ikke hente dine outfits' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = outfitFields.safeParse(await req.json())
  if (!parsed.success) return Response.json({ error: 'Vælg mindst ét stykke tøj og giv outfittet et navn' }, { status: 400 })
  const { pieces, ...fields } = parsed.data

  const { data: outfit, error } = await supabase
    .from('outfits')
    .insert({ ...fields, user_id: user.id })
    .select('id')
    .single()
  if (error || !outfit) {
    console.error('Outfit insert error:', error)
    return Response.json({ error: 'Kunne ikke gemme outfittet' }, { status: 500 })
  }

  const { error: itemsError } = await insertPieces(supabase, outfit.id, pieces)
  if (itemsError) {
    console.error('Outfit items insert error:', itemsError)
    await supabase.from('outfits').delete().eq('id', outfit.id)
    return Response.json({ error: 'Kunne ikke gemme tøjet i outfittet' }, { status: 500 })
  }

  const [saved] = await loadOutfits(supabase, user.id, outfit.id)
  return Response.json({ outfit: saved })
}

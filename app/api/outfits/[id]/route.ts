import { createClient } from '@/lib/supabase/server'
import { insertPieces, loadOutfits, outfitFields } from '@/lib/outfits/server'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = outfitFields.partial().safeParse(await req.json())
  if (!parsed.success) return Response.json({ error: 'Ugyldige felter' }, { status: 400 })
  const { pieces, ...fields } = parsed.data

  const { data: outfit, error } = await supabase
    .from('outfits')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .single()
  if (error || !outfit) {
    console.error('Outfit update error:', error)
    return Response.json({ error: 'Kunne ikke opdatere outfittet' }, { status: 500 })
  }

  if (pieces) {
    await supabase.from('outfit_items').delete().eq('outfit_id', id)
    const { error: itemsError } = await insertPieces(supabase, id, pieces)
    if (itemsError) {
      console.error('Outfit items update error:', itemsError)
      return Response.json({ error: 'Kunne ikke opdatere tøjet i outfittet' }, { status: 500 })
    }
  }

  const [saved] = await loadOutfits(supabase, user.id, id)
  return Response.json({ outfit: saved })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('outfits').delete().eq('id', id).eq('user_id', user.id)
  if (error) {
    console.error('Outfit delete error:', error)
    return Response.json({ error: 'Kunne ikke slette outfittet' }, { status: 500 })
  }
  return Response.json({ success: true })
}

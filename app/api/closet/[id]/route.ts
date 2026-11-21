import { createClient } from '@/lib/supabase/server'
import { CLOSET_BUCKET, itemFields, withImageUrls } from '@/lib/closet/server'
import type { UserItem } from '@/lib/types'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = itemFields.partial().safeParse(await req.json())
  if (!parsed.success) return Response.json({ error: 'Ugyldige felter' }, { status: 400 })

  const { data, error } = await supabase
    .from('user_items')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error || !data) {
    console.error('Closet update error:', error)
    return Response.json({ error: 'Kunne ikke opdatere tøjet' }, { status: 500 })
  }
  const [item] = await withImageUrls(supabase, [data as UserItem])
  return Response.json({ item })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('user_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('image_path')
    .single()

  if (error) {
    console.error('Closet delete error:', error)
    return Response.json({ error: 'Kunne ikke slette tøjet' }, { status: 500 })
  }
  if (data?.image_path) await supabase.storage.from(CLOSET_BUCKET).remove([data.image_path])
  return Response.json({ success: true })
}

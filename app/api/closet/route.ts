import { createClient } from '@/lib/supabase/server'
import { CLOSET_BUCKET, itemFields, parseDataUrl, withImageUrls } from '@/lib/closet/server'
import type { UserItem } from '@/lib/types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('user_items')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Closet fetch error:', error)
    return Response.json({ error: 'Kunne ikke hente dit skab' }, { status: 500 })
  }
  return Response.json({ items: await withImageUrls(supabase, data as UserItem[]) })
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = itemFields.safeParse(body)
    if (!parsed.success) return Response.json({ error: 'Ugyldige felter' }, { status: 400 })

    // Upload the photo first (optional)
    let image_path: string | null = null
    if (body.imageData) {
      const img = parseDataUrl(body.imageData)
      if (!img) return Response.json({ error: 'Ugyldigt billede' }, { status: 400 })
      const ext = img.mime === 'image/jpeg' ? 'jpg' : img.mime.split('/')[1]
      image_path = `${user.id}/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from(CLOSET_BUCKET)
        .upload(image_path, img.bytes, { contentType: img.mime })
      if (upErr) {
        console.error('Closet upload error:', upErr)
        return Response.json({ error: 'Kunne ikke uploade billedet' }, { status: 500 })
      }
    }

    const { data, error } = await supabase
      .from('user_items')
      .insert({ ...parsed.data, user_id: user.id, image_path })
      .select()
      .single()

    if (error) {
      console.error('Closet insert error:', error)
      if (image_path) await supabase.storage.from(CLOSET_BUCKET).remove([image_path])
      return Response.json({ error: 'Kunne ikke gemme tøjet' }, { status: 500 })
    }

    const [item] = await withImageUrls(supabase, [data as UserItem])
    return Response.json({ item })
  } catch (error) {
    console.error('Closet create error:', error)
    return Response.json({ error: 'Der skete en fejl' }, { status: 500 })
  }
}

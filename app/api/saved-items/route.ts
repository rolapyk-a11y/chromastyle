import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clothing_item_id } = await req.json()

    if (!clothing_item_id) {
      return Response.json({ error: 'Missing clothing_item_id' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('saved_items')
      .insert({
        user_id: user.id,
        clothing_item_id,
      })
      .select()
      .single()

    if (error) {
      // Handle duplicate
      if (error.code === '23505') {
        return Response.json({ message: 'Item already saved' }, { status: 200 })
      }
      console.error('Save error:', error)
      return Response.json({ error: 'Failed to save item' }, { status: 500 })
    }

    return Response.json({ data })
  } catch (error) {
    console.error('Save error:', error)
    return Response.json({ error: 'An error occurred' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clothing_item_id } = await req.json()

    if (!clothing_item_id) {
      return Response.json({ error: 'Missing clothing_item_id' }, { status: 400 })
    }

    const { error } = await supabase
      .from('saved_items')
      .delete()
      .eq('user_id', user.id)
      .eq('clothing_item_id', clothing_item_id)

    if (error) {
      console.error('Delete error:', error)
      return Response.json({ error: 'Failed to remove item' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return Response.json({ error: 'An error occurred' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('saved_items')
      .select(`
        *,
        clothing_item:clothing_items(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch error:', error)
      return Response.json({ error: 'Failed to fetch saved items' }, { status: 500 })
    }

    return Response.json({ data })
  } catch (error) {
    console.error('Fetch error:', error)
    return Response.json({ error: 'An error occurred' }, { status: 500 })
  }
}

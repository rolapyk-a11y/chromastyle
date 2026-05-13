import { createClient } from '@/lib/supabase/server'
import { seedClothingItems } from '@/lib/seed-clothing'

export async function POST() {
  try {
    const supabase = await createClient()

    // Check if items already exist
    const { count } = await supabase
      .from('clothing_items')
      .select('*', { count: 'exact', head: true })

    if (count && count > 0) {
      return Response.json({ message: 'Clothing items already seeded', count })
    }

    // Insert seed data
    const { data, error } = await supabase
      .from('clothing_items')
      .insert(seedClothingItems)
      .select()

    if (error) {
      console.error('Seed error:', error)
      return Response.json({ error: 'Failed to seed clothing items' }, { status: 500 })
    }

    return Response.json({ message: 'Successfully seeded clothing items', count: data.length })
  } catch (error) {
    console.error('Seed error:', error)
    return Response.json({ error: 'An error occurred' }, { status: 500 })
  }
}

export async function GET() {
  // Trigger seeding on GET as well for easy testing
  return POST()
}

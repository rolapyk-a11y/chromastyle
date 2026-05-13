import { createClient } from '@/lib/supabase/server'
import { WardrobeClient } from '@/components/dashboard/wardrobe-client'
import { ColorAnalysis, ClothingItem } from '@/lib/types'

export default async function WardrobePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user's latest color analysis
  const { data: analyses } = await supabase
    .from('color_analyses')
    .select('*')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const colorAnalysis = analyses?.[0] as ColorAnalysis | undefined

  // Get all clothing items
  let { data: clothingItems } = await supabase
    .from('clothing_items')
    .select('*')
    .order('created_at', { ascending: false })

  // If no items exist, try to seed them
  if (!clothingItems || clothingItems.length === 0) {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/seed-clothing`, {
      method: 'POST'
    }).catch(() => {})
    
    // Refetch
    const { data: refetched } = await supabase
      .from('clothing_items')
      .select('*')
      .order('created_at', { ascending: false })
    
    clothingItems = refetched
  }

  // Get user's saved items
  const { data: savedItems } = await supabase
    .from('saved_items')
    .select('clothing_item_id')
    .eq('user_id', user?.id)

  const savedItemIds = savedItems?.map(item => item.clothing_item_id) || []

  return (
    <WardrobeClient
      colorAnalysis={colorAnalysis}
      clothingItems={(clothingItems || []) as ClothingItem[]}
      savedItemIds={savedItemIds}
    />
  )
}

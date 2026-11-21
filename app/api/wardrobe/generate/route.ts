import { createClient } from '@/lib/supabase/server'

// Maps hex codes to human-readable color names for search queries
const HEX_COLOR_NAMES: [string, string][] = [
  ['#FFDAB9', 'peach'], ['#FFA07A', 'salmon'], ['#FA8072', 'coral'],
  ['#FF7F50', 'coral'], ['#F4A460', 'sandy'], ['#DEB887', 'beige'],
  ['#D2B48C', 'tan'], ['#C8A96E', 'camel'], ['#FFD700', 'gold'],
  ['#DAA520', 'golden'], ['#F5DEB3', 'wheat'], ['#FAEBD7', 'cream'],
  ['#87CEEB', 'sky blue'], ['#B0E0E6', 'powder blue'], ['#ADD8E6', 'light blue'],
  ['#6495ED', 'cornflower blue'], ['#4682B4', 'steel blue'],
  ['#90EE90', 'light green'], ['#98FF98', 'mint'], ['#2E8B57', 'forest green'],
  ['#556B2F', 'olive'], ['#E6B800', 'amber'], ['#CD853F', 'peru'],
  ['#8B7355', 'brown'], ['#FFFFF0', 'ivory'], ['#FAF0E6', 'linen'],
  ['#F5F5DC', 'beige'], ['#FBCEB1', 'apricot'], ['#E2725B', 'terracotta'],
  ['#722F37', 'wine'], ['#800020', 'burgundy'], ['#4169E1', 'royal blue'],
  ['#000080', 'navy'], ['#191970', 'midnight blue'], ['#2F4F4F', 'dark teal'],
  ['#36454F', 'charcoal'], ['#696969', 'grey'], ['#808080', 'grey'],
  ['#FFFFFF', 'white'], ['#000000', 'black'], ['#1C1C1C', 'black'],
]

function hexToColorName(hex: string): string {
  const upper = hex.toUpperCase()
  for (const [h, name] of HEX_COLOR_NAMES) {
    if (h.toUpperCase() === upper) return name
  }
  return ''
}

const STYLE_TERMS: Record<string, string> = {
  relaxed:        'casual relaxed comfortable',
  business:       'office formal business',
  baggy:          'oversized streetwear baggy',
  'smart-casual': 'smart casual everyday',
  outdoor:        'outdoor functional casual',
  elegant:        'elegant luxury premium',
}

const STYLE_TAGS: Record<string, string[]> = {
  relaxed:        ['casual', 'comfort', 'weekend', 'fresh'],
  business:       ['office', 'formal', 'smart', 'elegant'],
  baggy:          ['streetwear', 'bold', 'casual'],
  'smart-casual': ['smart-casual', 'versatile', 'classic'],
  outdoor:        ['outdoor', 'layering', 'casual'],
  elegant:        ['elegant', 'luxury', 'formal'],
}

interface SerperShoppingItem {
  title: string
  source: string
  link: string
  price?: string
  imageUrl?: string
  rating?: number
  position?: number
}

async function searchShopping(query: string): Promise<SerperShoppingItem[]> {
  const res = await fetch('https://google.serper.dev/shopping', {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.SERPER_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, gl: 'dk', hl: 'en', num: 6 }),
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.shopping ?? []
}

function parsePrice(priceStr?: string): number {
  if (!priceStr) return 0
  const cleaned = priceStr.replace(/[^\d.,]/g, '').replace(',', '.')
  return Math.round(parseFloat(cleaned)) || 0
}

function inferCategory(title: string, queryCategory: string): string {
  const t = title.toLowerCase()
  if (t.includes('shirt') || t.includes('skjorte')) return 'shirts'
  if (t.includes('jacket') || t.includes('blazer') || t.includes('coat') || t.includes('jakke') || t.includes('frakke')) return 'outerwear'
  if (t.includes('pant') || t.includes('trouser') || t.includes('jean') || t.includes('chino') || t.includes('bukser')) return 'pants'
  if (t.includes('hoodie') || t.includes('sweater') || t.includes('sweatshirt') || t.includes('polo') || t.includes('tee') || t.includes('top')) return 'tops'
  return queryCategory
}

// Curated Unsplash fallback images by category (used when product has no image)
const FALLBACK_IMAGES: Record<string, string[]> = {
  shirts:    ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=500&fit=crop', 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=400&h=500&fit=crop'],
  tops:      ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=500&fit=crop', 'https://images.unsplash.com/photo-1614975059251-992f11792b9f?w=400&h=500&fit=crop'],
  outerwear: ['https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&h=500&fit=crop', 'https://images.unsplash.com/photo-1544923246-77307dd628b5?w=400&h=500&fit=crop'],
  pants:     ['https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&h=500&fit=crop', 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=500&fit=crop'],
}

function fallbackImage(category: string, index: number): string {
  const pool = FALLBACK_IMAGES[category] ?? FALLBACK_IMAGES.tops
  return pool[index % pool.length]
}

const MOCK_ITEMS = [
  { name: 'Peach Linen Shirt', brand: 'H&M', category: 'shirts', price: 279, colors: ['#FFDAB9', '#FFA07A'], seasons: ['spring', 'summer'], style_tags: ['casual', 'fresh', 'weekend'], is_trending: true, image_url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=400&h=500&fit=crop', product_url: 'https://www2.hm.com/da_dk/search-results.html?q=peach+linen+shirt' },
  { name: 'Warm Camel Overshirt', brand: 'Zara', category: 'outerwear', price: 549, colors: ['#C8A96E', '#D2B48C'], seasons: ['spring', 'autumn'], style_tags: ['smart-casual', 'layering', 'versatile'], is_trending: true, image_url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=500&fit=crop', product_url: 'https://www.zara.com/dk/da/search?searchTerm=camel+overshirt' },
  { name: 'Sky Blue Oxford Shirt', brand: 'H&M', category: 'shirts', price: 249, colors: ['#87CEEB', '#B0E0E6'], seasons: ['spring', 'summer'], style_tags: ['office', 'classic', 'smart'], is_trending: false, image_url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=500&fit=crop', product_url: 'https://www2.hm.com/da_dk/search-results.html?q=sky+blue+oxford+shirt' },
  { name: 'Golden Tan Chinos', brand: 'Zara', category: 'pants', price: 449, colors: ['#D2B48C', '#F4A460'], seasons: ['spring', 'summer', 'autumn'], style_tags: ['smart-casual', 'versatile', 'office'], is_trending: false, image_url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&h=500&fit=crop', product_url: 'https://www.zara.com/dk/da/search?searchTerm=tan+chinos' },
  { name: 'Warm Coral Polo', brand: 'H&M', category: 'tops', price: 199, colors: ['#FF7F50', '#FFA07A'], seasons: ['spring', 'summer'], style_tags: ['casual', 'vibrant', 'weekend'], is_trending: true, image_url: 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=400&h=500&fit=crop', product_url: 'https://www2.hm.com/da_dk/search-results.html?q=coral+polo' },
  { name: 'Light Spring Linen Blazer', brand: 'Toj Eksperten', category: 'outerwear', price: 1099, colors: ['#FAEBD7', '#F5DEB3'], seasons: ['spring', 'summer'], style_tags: ['smart', 'elegant', 'office'], is_trending: false, image_url: 'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=400&h=500&fit=crop', product_url: 'https://www.tojeksperten.dk/search?q=linen+blazer' },
  { name: 'Ivory Cotton T-Shirt', brand: 'H&M', category: 'tops', price: 79, colors: ['#FFFFF0', '#FAF0E6'], seasons: ['spring', 'summer'], style_tags: ['basic', 'casual', 'layering'], is_trending: false, image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=500&fit=crop', product_url: 'https://www2.hm.com/da_dk/search-results.html?q=ivory+t-shirt' },
  { name: 'Warm Beige Trousers', brand: 'Toj Eksperten', category: 'pants', price: 799, colors: ['#F5F5DC', '#EDE0C4'], seasons: ['spring', 'summer'], style_tags: ['formal', 'office', 'smart'], is_trending: false, image_url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=500&fit=crop', product_url: 'https://www.tojeksperten.dk/search?q=beige+trousers' },
  { name: 'Soft Gold Merino Sweater', brand: 'Zara', category: 'tops', price: 599, colors: ['#FFD700', '#DAA520'], seasons: ['spring', 'autumn'], style_tags: ['smart-casual', 'warm', 'weekend'], is_trending: true, image_url: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&h=500&fit=crop', product_url: 'https://www.zara.com/dk/da/search?searchTerm=gold+merino+sweater' },
  { name: 'Terracotta Casual Shirt', brand: 'Zara', category: 'shirts', price: 399, colors: ['#E2725B', '#CD5C5C'], seasons: ['spring', 'autumn'], style_tags: ['casual', 'bold', 'weekend'], is_trending: true, image_url: 'https://images.unsplash.com/photo-1603251578711-3290ca1a0187?w=400&h=500&fit=crop', product_url: 'https://www.zara.com/dk/da/search?searchTerm=terracotta+shirt' },
  { name: 'Mint Cardigan', brand: 'Toj Eksperten', category: 'tops', price: 699, colors: ['#98FF98', '#90EE90'], seasons: ['spring', 'summer'], style_tags: ['casual', 'fresh', 'layering'], is_trending: false, image_url: 'https://images.unsplash.com/photo-1638718852706-8c5c3f4a6e4a?w=400&h=500&fit=crop', product_url: 'https://www.tojeksperten.dk/search?q=mint+cardigan' },
  { name: 'Sand Slim Chinos', brand: 'H&M', category: 'pants', price: 299, colors: ['#F4A460', '#DEB887'], seasons: ['spring', 'summer'], style_tags: ['casual', 'smart-casual', 'versatile'], is_trending: false, image_url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&h=500&fit=crop', product_url: 'https://www2.hm.com/da_dk/search-results.html?q=sand+chinos' },
  { name: 'Light Denim Overshirt', brand: 'H&M', category: 'outerwear', price: 449, colors: ['#ADD8E6', '#87CEEB'], seasons: ['spring', 'summer'], style_tags: ['casual', 'layering', 'streetwear'], is_trending: true, image_url: 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=400&h=500&fit=crop', product_url: 'https://www2.hm.com/da_dk/search-results.html?q=light+denim+overshirt' },
  { name: 'Apricot Dress Shirt', brand: 'Toj Eksperten', category: 'shirts', price: 599, colors: ['#FBCEB1', '#FFDAB9'], seasons: ['spring', 'summer'], style_tags: ['office', 'elegant', 'smart'], is_trending: false, image_url: 'https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?w=400&h=500&fit=crop', product_url: 'https://www.tojeksperten.dk/search?q=apricot+dress+shirt' },
  { name: 'Warm White Linen Trousers', brand: 'Zara', category: 'pants', price: 499, colors: ['#FFFAF0', '#FAF0E6'], seasons: ['spring', 'summer'], style_tags: ['casual', 'summer', 'fresh'], is_trending: true, image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=500&fit=crop', product_url: 'https://www.zara.com/dk/da/search?searchTerm=white+linen+trousers' },
]

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const style: string | null = body.style ?? null

    const [{ data: analyses }, { data: profile }] = await Promise.all([
      supabase.from('color_analyses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
      supabase.from('profiles').select('style_essence').eq('id', user.id).single(),
    ])

    const analysis = analyses?.[0]
    if (!analysis) {
      return Response.json({ error: 'No color analysis found. Please analyze your colors first.' }, { status: 400 })
    }

    const essence = profile?.style_essence ?? null

    // Mock mode
    if (process.env.MOCK_AI === 'true') {
      const mockItems = style
        ? MOCK_ITEMS.filter(i => i.style_tags.some(t => STYLE_TAGS[style]?.includes(t)))
        : MOCK_ITEMS
      const toInsert = (mockItems.length > 0 ? mockItems : MOCK_ITEMS).map(i => ({ ...i, currency: 'DKK' }))
      const { data: inserted, error } = await supabase.from('clothing_items').insert(toInsert).select()
      if (error) return Response.json({ error: 'Failed to save items' }, { status: 500 })
      return Response.json({ count: inserted.length, season: analysis.season, sub_season: analysis.sub_season, style: style ?? 'all', source: 'mock' })
    }

    // Build search queries from user's palette + style
    const colorNames = (analysis.best_colors ?? [])
      .slice(0, 4)
      .map(hexToColorName)
      .filter(Boolean)
    const colorStr = colorNames.slice(0, 2).join(' ')
    const styleTerm = style ? STYLE_TERMS[style] ?? 'casual' : 'casual'
    const seasonTerm = analysis.season

    // Essence search terms — adds silhouette/texture keywords to queries
    const ESSENCE_SEARCH: Record<string, string> = {
      dramatic:     'bold oversized structured statement',
      gamine:       'eclectic streetwear playful contrast',
      natural:      'relaxed earthy layered casual',
      classic:      'tailored timeless clean neutral',
      romantic:     'fitted luxury rich texture',
      ingenue:      'soft delicate light gentle',
      angelic:      'flowing minimal fine draped',
    }
    const essenceTerm = essence ? ESSENCE_SEARCH[essence] ?? '' : ''

    const queries: { q: string; category: string }[] = [
      { q: `men ${styleTerm} ${essenceTerm} shirt ${colorStr} ${seasonTerm}`.trim(), category: 'shirts' },
      { q: `men ${styleTerm} ${essenceTerm} t-shirt ${colorStr}`.trim(), category: 'tops' },
      { q: `men ${styleTerm} ${essenceTerm} sweater ${colorStr}`.trim(), category: 'tops' },
      { q: `men ${styleTerm} ${essenceTerm} jacket blazer ${colorStr} ${seasonTerm}`.trim(), category: 'outerwear' },
      { q: `men ${styleTerm} ${essenceTerm} trousers chinos ${colorStr}`.trim(), category: 'pants' },
      { q: `men ${styleTerm} ${essenceTerm} hoodie ${colorStr}`.trim(), category: 'tops' },
    ]

    // Fetch all queries in parallel
    const results = await Promise.all(
      queries.map(async ({ q, category }) => {
        const items = await searchShopping(q)
        return items.map((item, i) => ({
          name: item.title,
          brand: item.source ?? 'Unknown',
          category: inferCategory(item.title, category),
          subcategory: null,
          price: parsePrice(item.price),
          currency: 'DKK',
          image_url: item.imageUrl ?? fallbackImage(category, i),
          product_url: item.link ?? null,
          colors: colorNames.slice(0, 2).map(n => {
            const found = HEX_COLOR_NAMES.find(([, name]) => name === n)
            return found ? found[0] : '#D2B48C'
          }),
          seasons: [analysis.season],
          style_tags: [
            ...(style ? STYLE_TAGS[style] ?? [] : ['casual', 'versatile']),
            ...(essence ? [essence] : []),
          ],
          is_trending: (item.position ?? 99) <= 3,
        }))
      })
    )

    const allItems = results.flat().filter(i => i.name && i.price > 0)

    if (allItems.length === 0) {
      return Response.json({ error: 'No products found. Try a different style.' }, { status: 404 })
    }

    const { data: inserted, error } = await supabase
      .from('clothing_items')
      .insert(allItems)
      .select()

    if (error) {
      console.error('Insert error:', error)
      return Response.json({ error: 'Failed to save items' }, { status: 500 })
    }

    return Response.json({
      count: inserted.length,
      season: analysis.season,
      sub_season: analysis.sub_season,
      style: style ?? 'all',
      essence: essence ?? null,
      source: 'google_shopping',
    })
  } catch (error) {
    console.error('Wardrobe generate error:', error)
    return Response.json({ error: 'Failed to generate wardrobe' }, { status: 500 })
  }
}

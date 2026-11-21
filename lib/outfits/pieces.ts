import type { ClosetCategory, ClothingItem, Piece, UserItem } from '@/lib/types'

/** Order pieces are shown in: outermost layer first, shoes last. */
export const CATEGORY_ORDER: ClosetCategory[] = ['outerwear', 'top', 'bottom', 'shoes', 'accessory']

const SHOP_CATEGORY: Record<string, ClosetCategory> = {
  outerwear: 'outerwear',
  tops: 'top',
  shirts: 'top',
  pants: 'bottom',
  shoes: 'shoes',
  accessories: 'accessory',
}

function asArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string')
  return []
}

export function closetPiece(item: UserItem): Piece {
  return {
    key: `closet:${item.id}`,
    source: 'closet',
    id: item.id,
    name: item.name,
    category: item.category,
    subcategory: item.subcategory,
    brand: item.brand,
    colors: asArray(item.colors),
    style_tags: asArray(item.style_tags),
    occasions: asArray(item.occasions),
    notes: item.notes,
    image_url: item.image_url ?? null,
  }
}

export function shopPiece(item: ClothingItem): Piece {
  return {
    key: `shop:${item.id}`,
    source: 'shop',
    id: item.id,
    name: item.name,
    category: SHOP_CATEGORY[item.category] ?? 'top',
    subcategory: item.subcategory,
    brand: item.brand,
    colors: asArray(item.colors),
    style_tags: asArray(item.style_tags),
    notes: null,
    image_url: item.image_url,
    product_url: item.product_url,
    price: item.price,
  }
}

export function sortPieces(pieces: Piece[]): Piece[] {
  return [...pieces].sort(
    (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
  )
}

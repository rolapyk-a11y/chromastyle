import uniqloProducts from './uniqlo-men-cache.json'
import type { ClothingItem, SubSeason } from '@/lib/types'

interface CachedUniqloProduct {
  id: string
  name: string
  brand: string
  category: string
  price: number
  currency: string
  image_url: string
  product_url: string
  colour_name: string
  colour_hex: string
  sub_seasons: SubSeason[]
  fit?: string | null
  fabric?: string | null
  scraped_at: string
}

export function fetchUniqloProductsForSeason(subSeason: SubSeason): ClothingItem[] {
  return (uniqloProducts as CachedUniqloProduct[])
    .filter(product => product.sub_seasons.includes(subSeason))
    .map(product => ({
      id: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      subcategory: product.colour_name,
      price: product.price,
      currency: product.currency,
      image_url: product.image_url,
      product_url: product.product_url,
      colors: [product.colour_hex],
      seasons: [],
      style_tags: [
        product.colour_name,
        product.category,
        product.fit,
        product.fabric,
        'Uniqlo',
      ].filter(Boolean) as string[],
      is_trending: false,
      created_at: product.scraped_at,
      updated_at: product.scraped_at,
    }))
}

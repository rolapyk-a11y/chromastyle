import { Season } from './types'

// Mock clothing data from H&M, Zara, and Toj Eksperten
// In production, this would come from real API integrations or web scraping

export interface SeedClothingItem {
  name: string
  brand: 'H&M' | 'Zara' | 'Toj Eksperten'
  category: string
  subcategory: string
  price: number
  currency: string
  image_url: string
  product_url: string
  colors: string[]
  seasons: Season[]
  style_tags: string[]
  is_trending: boolean
}

export const seedClothingItems: SeedClothingItem[] = [
  // H&M Items
  {
    name: 'Regular Fit Oxford Shirt',
    brand: 'H&M',
    category: 'shirts',
    subcategory: 'dress-shirt',
    price: 249,
    currency: 'DKK',
    image_url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=500&fit=crop',
    product_url: 'https://www2.hm.com',
    colors: ['#FFFFFF', '#87CEEB'],
    seasons: ['summer', 'winter'],
    style_tags: ['classic', 'office', 'smart-casual'],
    is_trending: false
  },
  {
    name: 'Slim Fit Linen Shirt',
    brand: 'H&M',
    category: 'shirts',
    subcategory: 'casual-shirt',
    price: 299,
    currency: 'DKK',
    image_url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=400&h=500&fit=crop',
    product_url: 'https://www2.hm.com',
    colors: ['#F5DEB3', '#DEB887'],
    seasons: ['spring', 'autumn'],
    style_tags: ['casual', 'summer', 'beach'],
    is_trending: true
  },
  {
    name: 'Cotton T-Shirt',
    brand: 'H&M',
    category: 'tops',
    subcategory: 't-shirt',
    price: 79,
    currency: 'DKK',
    image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=500&fit=crop',
    product_url: 'https://www2.hm.com',
    colors: ['#2F4F4F'],
    seasons: ['autumn', 'winter'],
    style_tags: ['casual', 'basic', 'layering'],
    is_trending: false
  },
  {
    name: 'Relaxed Fit Hoodie',
    brand: 'H&M',
    category: 'tops',
    subcategory: 'hoodie',
    price: 349,
    currency: 'DKK',
    image_url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=500&fit=crop',
    product_url: 'https://www2.hm.com',
    colors: ['#4A4A4A', '#1C1C1C'],
    seasons: ['autumn', 'winter'],
    style_tags: ['casual', 'streetwear', 'comfort'],
    is_trending: true
  },
  {
    name: 'Wool-blend Coat',
    brand: 'H&M',
    category: 'outerwear',
    subcategory: 'coat',
    price: 999,
    currency: 'DKK',
    image_url: 'https://images.unsplash.com/photo-1544923246-77307dd628b5?w=400&h=500&fit=crop',
    product_url: 'https://www2.hm.com',
    colors: ['#36454F', '#2F4F4F'],
    seasons: ['autumn', 'winter'],
    style_tags: ['formal', 'smart', 'winter'],
    is_trending: false
  },
  {
    name: 'Slim Fit Chinos',
    brand: 'H&M',
    category: 'pants',
    subcategory: 'chinos',
    price: 299,
    currency: 'DKK',
    image_url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&h=500&fit=crop',
    product_url: 'https://www2.hm.com',
    colors: ['#D2B48C', '#8B7355'],
    seasons: ['spring', 'autumn'],
    style_tags: ['smart-casual', 'office', 'versatile'],
    is_trending: false
  },

  // Zara Items
  {
    name: 'Textured Weave Blazer',
    brand: 'Zara',
    category: 'outerwear',
    subcategory: 'blazer',
    price: 799,
    currency: 'DKK',
    image_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&h=500&fit=crop',
    product_url: 'https://www.zara.com',
    colors: ['#4169E1', '#000080'],
    seasons: ['summer', 'winter'],
    style_tags: ['formal', 'smart', 'office'],
    is_trending: true
  },
  {
    name: 'Structured Overshirt',
    brand: 'Zara',
    category: 'outerwear',
    subcategory: 'overshirt',
    price: 549,
    currency: 'DKK',
    image_url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=500&fit=crop',
    product_url: 'https://www.zara.com',
    colors: ['#556B2F', '#6B8E23'],
    seasons: ['spring', 'autumn'],
    style_tags: ['casual', 'layering', 'versatile'],
    is_trending: true
  },
  {
    name: 'Knit Polo Shirt',
    brand: 'Zara',
    category: 'tops',
    subcategory: 'polo',
    price: 349,
    currency: 'DKK',
    image_url: 'https://images.unsplash.com/photo-1625910513413-5fc29c037db1?w=400&h=500&fit=crop',
    product_url: 'https://www.zara.com',
    colors: ['#800020', '#8B0000'],
    seasons: ['autumn', 'winter'],
    style_tags: ['smart-casual', 'elegant', 'classic'],
    is_trending: false
  },
  {
    name: 'Wide Fit Jeans',
    brand: 'Zara',
    category: 'pants',
    subcategory: 'jeans',
    price: 449,
    currency: 'DKK',
    image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=500&fit=crop',
    product_url: 'https://www.zara.com',
    colors: ['#4682B4', '#1E90FF'],
    seasons: ['spring', 'summer', 'autumn', 'winter'],
    style_tags: ['casual', 'trendy', 'streetwear'],
    is_trending: true
  },
  {
    name: 'Merino Wool Sweater',
    brand: 'Zara',
    category: 'tops',
    subcategory: 'sweater',
    price: 599,
    currency: 'DKK',
    image_url: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&h=500&fit=crop',
    product_url: 'https://www.zara.com',
    colors: ['#228B22', '#006400'],
    seasons: ['autumn', 'winter'],
    style_tags: ['smart-casual', 'warm', 'layering'],
    is_trending: false
  },
  {
    name: 'Tailored Trousers',
    brand: 'Zara',
    category: 'pants',
    subcategory: 'trousers',
    price: 499,
    currency: 'DKK',
    image_url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=500&fit=crop',
    product_url: 'https://www.zara.com',
    colors: ['#2F2F2F', '#1A1A1A'],
    seasons: ['spring', 'summer', 'autumn', 'winter'],
    style_tags: ['formal', 'office', 'smart'],
    is_trending: false
  },

  // Toj Eksperten Items
  {
    name: 'Classic Navy Blazer',
    brand: 'Toj Eksperten',
    category: 'outerwear',
    subcategory: 'blazer',
    price: 1299,
    currency: 'DKK',
    image_url: 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=400&h=500&fit=crop',
    product_url: 'https://www.tojeksperten.dk',
    colors: ['#000080', '#191970'],
    seasons: ['summer', 'winter'],
    style_tags: ['formal', 'classic', 'timeless'],
    is_trending: false
  },
  {
    name: 'Casual Cotton Cardigan',
    brand: 'Toj Eksperten',
    category: 'tops',
    subcategory: 'cardigan',
    price: 699,
    currency: 'DKK',
    image_url: 'https://images.unsplash.com/photo-1638718852706-8c5c3f4a6e4a?w=400&h=500&fit=crop',
    product_url: 'https://www.tojeksperten.dk',
    colors: ['#D2691E', '#CD853F'],
    seasons: ['spring', 'autumn'],
    style_tags: ['casual', 'layering', 'smart-casual'],
    is_trending: false
  },
  {
    name: 'Premium Dress Shirt',
    brand: 'Toj Eksperten',
    category: 'shirts',
    subcategory: 'dress-shirt',
    price: 599,
    currency: 'DKK',
    image_url: 'https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?w=400&h=500&fit=crop',
    product_url: 'https://www.tojeksperten.dk',
    colors: ['#E6E6FA', '#B0C4DE'],
    seasons: ['summer', 'winter'],
    style_tags: ['formal', 'office', 'elegant'],
    is_trending: false
  },
  {
    name: 'Quilted Vest',
    brand: 'Toj Eksperten',
    category: 'outerwear',
    subcategory: 'vest',
    price: 899,
    currency: 'DKK',
    image_url: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=400&h=500&fit=crop',
    product_url: 'https://www.tojeksperten.dk',
    colors: ['#2E8B57', '#3CB371'],
    seasons: ['spring', 'autumn'],
    style_tags: ['outdoor', 'casual', 'layering'],
    is_trending: true
  },
  {
    name: 'Slim Fit Dress Pants',
    brand: 'Toj Eksperten',
    category: 'pants',
    subcategory: 'dress-pants',
    price: 799,
    currency: 'DKK',
    image_url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&h=500&fit=crop',
    product_url: 'https://www.tojeksperten.dk',
    colors: ['#696969', '#808080'],
    seasons: ['spring', 'summer', 'autumn', 'winter'],
    style_tags: ['formal', 'office', 'versatile'],
    is_trending: false
  },
  {
    name: 'Casual Linen Blazer',
    brand: 'Toj Eksperten',
    category: 'outerwear',
    subcategory: 'blazer',
    price: 1099,
    currency: 'DKK',
    image_url: 'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=400&h=500&fit=crop',
    product_url: 'https://www.tojeksperten.dk',
    colors: ['#F5F5DC', '#FAEBD7'],
    seasons: ['spring', 'summer'],
    style_tags: ['smart-casual', 'summer', 'elegant'],
    is_trending: true
  },
  
  // More variety in colors for different seasons
  {
    name: 'Coral Cotton Polo',
    brand: 'H&M',
    category: 'tops',
    subcategory: 'polo',
    price: 199,
    currency: 'DKK',
    image_url: 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=400&h=500&fit=crop',
    product_url: 'https://www2.hm.com',
    colors: ['#FF7F50', '#FA8072'],
    seasons: ['spring', 'summer'],
    style_tags: ['casual', 'vibrant', 'summer'],
    is_trending: true
  },
  {
    name: 'Ice Blue Linen Shirt',
    brand: 'Zara',
    category: 'shirts',
    subcategory: 'casual-shirt',
    price: 399,
    currency: 'DKK',
    image_url: 'https://images.unsplash.com/photo-1603251578711-3290ca1a0187?w=400&h=500&fit=crop',
    product_url: 'https://www.zara.com',
    colors: ['#ADD8E6', '#B0E0E6'],
    seasons: ['summer'],
    style_tags: ['casual', 'summer', 'fresh'],
    is_trending: false
  },
  {
    name: 'Burgundy Cashmere Sweater',
    brand: 'Toj Eksperten',
    category: 'tops',
    subcategory: 'sweater',
    price: 1499,
    currency: 'DKK',
    image_url: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=400&h=500&fit=crop',
    product_url: 'https://www.tojeksperten.dk',
    colors: ['#722F37', '#800020'],
    seasons: ['autumn', 'winter'],
    style_tags: ['luxury', 'warm', 'elegant'],
    is_trending: false
  },
  {
    name: 'Mustard Yellow Bomber',
    brand: 'H&M',
    category: 'outerwear',
    subcategory: 'jacket',
    price: 599,
    currency: 'DKK',
    image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=500&fit=crop',
    product_url: 'https://www2.hm.com',
    colors: ['#FFDB58', '#FFD700'],
    seasons: ['spring', 'autumn'],
    style_tags: ['streetwear', 'bold', 'casual'],
    is_trending: true
  },
  {
    name: 'Charcoal Turtleneck',
    brand: 'Zara',
    category: 'tops',
    subcategory: 'sweater',
    price: 449,
    currency: 'DKK',
    image_url: 'https://images.unsplash.com/photo-1614975059251-992f11792b9f?w=400&h=500&fit=crop',
    product_url: 'https://www.zara.com',
    colors: ['#36454F', '#2F4F4F'],
    seasons: ['autumn', 'winter'],
    style_tags: ['smart', 'minimalist', 'layering'],
    is_trending: true
  },
]

import { NextRequest, NextResponse } from 'next/server'
import { scrapeCatalogs } from '@/lib/products/firecrawl'
import type { SubSeason } from '@/lib/types'

const SUB_SEASONS: SubSeason[] = [
  'light-spring', 'true-spring', 'warm-spring',
  'light-summer', 'true-summer', 'soft-summer',
  'soft-autumn', 'true-autumn', 'dark-autumn',
  'dark-winter', 'true-winter', 'clear-winter',
]

function isSubSeason(value: unknown): value is SubSeason {
  return typeof value === 'string' && SUB_SEASONS.includes(value as SubSeason)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!process.env.FIRECRAWL_API_KEY) {
      return NextResponse.json(
        { error: 'FIRECRAWL_API_KEY is not configured. Add it to .env.local.' },
        { status: 500 },
      )
    }

    if (!Array.isArray(body.urls) || body.urls.length === 0) {
      return NextResponse.json({ error: 'urls must be a non-empty array' }, { status: 400 })
    }

    const urls = body.urls
      .filter((url: unknown): url is string => typeof url === 'string' && /^https?:\/\//.test(url))
      .slice(0, 10)

    if (urls.length === 0) {
      return NextResponse.json({ error: 'urls must contain valid http(s) URLs' }, { status: 400 })
    }

    if (!isSubSeason(body.sub_season)) {
      return NextResponse.json({ error: 'sub_season is required and must be valid' }, { status: 400 })
    }

    if (typeof body.colour_name !== 'string' || typeof body.colour_hex !== 'string') {
      return NextResponse.json({ error: 'colour_name and colour_hex are required' }, { status: 400 })
    }

    const result = await scrapeCatalogs({
      urls,
      subSeason: body.sub_season,
      colourName: body.colour_name,
      colourHex: body.colour_hex,
      category: typeof body.category === 'string' ? body.category : undefined,
      brand: typeof body.brand === 'string' ? body.brand : undefined,
      limit: typeof body.limit === 'number' ? body.limit : undefined,
    })

    return NextResponse.json({
      scraped: result.products.length,
      products: result.products,
      errors: result.errors,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Catalog scrape failed' },
      { status: 500 },
    )
  }
}

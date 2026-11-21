#!/usr/bin/env tsx
import { config } from 'dotenv'
import { scrapeCatalogs } from '../lib/products/firecrawl'
import type { SubSeason } from '../lib/types'

config({ path: '.env.local' })

function arg(name: string): string | undefined {
  const prefix = `--${name}=`
  return process.argv.find(value => value.startsWith(prefix))?.slice(prefix.length)
}

const urls = process.argv
  .slice(2)
  .filter(value => !value.startsWith('--'))

const subSeason = arg('sub-season') as SubSeason | undefined
const colourName = arg('colour')
const colourHex = arg('hex')
const category = arg('category')
const brand = arg('brand')
const limit = Number(arg('limit') ?? 24)

if (!urls.length || !subSeason || !colourName || !colourHex) {
  console.error([
    'Usage:',
    '  npm run scrape-catalog -- <url> [more urls...] -- --sub-season=light-spring --colour=Peach --hex=#F4C4A4 --category=shirt --brand=Zara',
    '',
    'Required:',
    '  FIRECRAWL_API_KEY in .env.local',
    '  Existing Supabase product_cache table',
  ].join('\n'))
  process.exit(1)
}

scrapeCatalogs({
  urls,
  subSeason,
  colourName,
  colourHex,
  category,
  brand,
  limit,
}).then(result => {
  console.log(`Scraped ${result.products.length} products`)
  if (result.errors.length) {
    console.log('\nErrors:')
    for (const error of result.errors) {
      console.log(`- ${error.url}: ${error.error}`)
    }
  }
}).catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})

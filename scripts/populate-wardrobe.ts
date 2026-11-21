#!/usr/bin/env tsx
/**
 * Run: npm run populate-wardrobe
 *
 * Reads the validated season-references.json produced by research-seasons,
 * then searches H&M for real clothing items in each season's colour palette.
 * Writes lib/wardrobe-seed.ts which the wardrobe page uses for pre-populated
 * recommendations — so the wardrobe is ready the moment a user finishes
 * their colour analysis.
 *
 * Prerequisites:
 *   1. npm run research-seasons must have completed with allValidated: true
 *   2. ANTHROPIC_API_KEY must be set in .env.local
 */

import { config } from 'dotenv'
import { runWardrobePopulation } from '../lib/agents/wardrobePopulator'
import type { SubSeason } from '../lib/agents/types'

config({ path: '.env.local' })

const args = process.argv.slice(2)
const targetSeasons = args.length > 0 ? (args as SubSeason[]) : undefined

console.log('ChromaStyle — Wardrobe Population Agent')
console.log('========================================')
if (targetSeasons) {
  console.log(`Populating wardrobe for: ${targetSeasons.join(', ')}`)
} else {
  console.log('Populating wardrobe for all 12 sub-seasons')
}
console.log()

runWardrobePopulation({
  seasons: targetSeasons,
  verbose: true,
  resumeExisting: true,
}).then(output => {
  console.log('\n═══════════════════════════════════════════')
  console.log(`Wardrobe population complete.`)
  console.log(`  Total items: ${output.items.length}`)
  const byBrand = output.items.reduce<Record<string, number>>((acc, item) => {
    acc[item.brand] = (acc[item.brand] ?? 0) + 1
    return acc
  }, {})
  Object.entries(byBrand).forEach(([brand, count]) => {
    console.log(`  ${brand}: ${count} items`)
  })
  console.log('\nWardrobe is ready at lib/wardrobe-seed.ts')
}).catch(err => {
  console.error('\nFatal error:', err.message)
  process.exit(1)
})

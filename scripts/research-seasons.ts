#!/usr/bin/env tsx
/**
 * Run: npm run research-seasons
 *
 * Searches the web for validated colour palettes for all 12 sub-seasons.
 * Each colour must be confirmed by at least 5 independent sources before
 * it is included. Progress is saved after each sub-season so the run can
 * be resumed if interrupted.
 *
 * Results → lib/agents/research-output/season-references.json
 */

import { config } from 'dotenv'
import { runSeasonResearch } from '../lib/agents/seasonResearcher'
import type { SubSeason } from '../lib/agents/types'

config({ path: '.env.local' })

const args = process.argv.slice(2)

// Allow targeting specific sub-seasons: npm run research-seasons -- light-spring true-spring
const targetSeasons = args.length > 0 ? (args as SubSeason[]) : undefined

console.log('ChromaStyle — Season Colour Research Agent')
console.log('===========================================')
if (targetSeasons) {
  console.log(`Researching: ${targetSeasons.join(', ')}`)
} else {
  console.log('Researching all 12 sub-seasons')
}
console.log('Minimum sources per colour:', 5)
console.log()

runSeasonResearch({
  seasons: targetSeasons,
  verbose: true,
  resumeExisting: true,
}).then(output => {
  const total = Object.values(output.seasons).reduce(
    (n, s) => n + s.validatedCount, 0
  )
  const skipped = Object.values(output.seasons).reduce(
    (n, s) => n + s.skippedCount, 0
  )
  console.log('\n═══════════════════════════════════════════')
  console.log(`Research complete.`)
  console.log(`  Validated colours: ${total}`)
  console.log(`  Dropped (< 5 sources): ${skipped}`)
  console.log(`  All validated: ${output.allValidated}`)
  if (!output.allValidated) {
    console.log('\nNext step: re-run to fill any gaps, then run populate-wardrobe.')
  } else {
    console.log('\nNext step: npm run populate-wardrobe')
  }
}).catch(err => {
  console.error('\nFatal error:', err.message)
  process.exit(1)
})

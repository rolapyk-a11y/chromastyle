#!/usr/bin/env node
/**
 * Pre-write hook: validate season reference coverage
 *
 * Blocks writes to season colour data files unless:
 *   1. lib/agents/research-output/season-references.json exists
 *   2. Every sub-season has at least MIN_SOURCES references per colour
 *   3. output.allValidated === true
 *
 * Exit codes:
 *   0 — allow (validation passed or file not a season data file)
 *   2 — block (validation failed, message explains what to fix)
 */

const fs = require('fs')
const path = require('path')
const readline = require('readline')

const MIN_SOURCES = 5

// Files that must pass validation before writes are allowed
const GUARDED_FILES = [
  'lib/clientColorAnalysis.ts',
  'lib/wardrobe-seed.ts',
  'lib/agents/research-output/season-references.json',
]

const ALL_SUB_SEASONS = [
  'light-spring', 'true-spring', 'warm-spring',
  'light-summer', 'true-summer', 'soft-summer',
  'soft-autumn', 'true-autumn', 'dark-autumn',
  'dark-winter', 'true-winter', 'clear-winter',
]

async function readStdin() {
  return new Promise((resolve) => {
    let data = ''
    const rl = readline.createInterface({ input: process.stdin })
    rl.on('line', line => { data += line + '\n' })
    rl.on('close', () => resolve(data.trim()))
  })
}

async function main() {
  let hookData
  try {
    const raw = await readStdin()
    hookData = raw ? JSON.parse(raw) : {}
  } catch {
    // If stdin is not valid JSON, allow the tool call to proceed
    process.exit(0)
  }

  const toolInput = hookData.tool_input ?? {}
  const filePath = toolInput.file_path ?? toolInput.path ?? ''

  // Normalise to a relative path for comparison
  const relative = filePath
    .replace(/\\/g, '/')
    .replace(/^.*chromastyle\//, '')
    .replace(/^\//, '')

  // Only guard the specific files that contain season colour data
  const isGuarded = GUARDED_FILES.some(f => relative.endsWith(f) || relative === f)
  if (!isGuarded) {
    process.exit(0)
  }

  // wardrobe-seed.ts writes are done by the agent itself — allow them
  // (the agent already validated research before calling writeFile)
  if (relative.includes('wardrobe-seed')) {
    process.exit(0)
  }

  // season-references.json writes are done by the researcher — allow them
  if (relative.includes('season-references.json')) {
    process.exit(0)
  }

  // ── Validate research output for writes to clientColorAnalysis.ts ──────────
  const researchPath = path.join(
    path.dirname(path.dirname(path.dirname(__filename))),
    'lib', 'agents', 'research-output', 'season-references.json'
  )

  if (!fs.existsSync(researchPath)) {
    const msg = [
      '╔═══════════════════════════════════════════════════════════════╗',
      '║  BLOCKED: Season colour research not found                    ║',
      '╚═══════════════════════════════════════════════════════════════╝',
      '',
      `You are trying to write to ${relative} but no validated colour`,
      'research exists yet.',
      '',
      'Run the season researcher first:',
      '  npm run research-seasons',
      '',
      'This will search the web for each sub-season\'s colour palette',
      `and verify each colour against ${MIN_SOURCES}+ independent sources.`,
    ].join('\n')

    process.stderr.write(msg + '\n')
    process.exit(2)
  }

  let research
  try {
    research = JSON.parse(fs.readFileSync(researchPath, 'utf-8'))
  } catch (e) {
    process.stderr.write(`Failed to parse season-references.json: ${e.message}\n`)
    process.exit(2)
  }

  // Check allValidated flag
  if (!research.allValidated) {
    const issues = []
    for (const ss of ALL_SUB_SEASONS) {
      const result = research.seasons?.[ss]
      if (!result) {
        issues.push(`  • ${ss}: not yet researched`)
        continue
      }
      const allColours = [
        ...(result.bestColours ?? []),
        ...(result.avoidColours ?? []),
        ...(result.neutrals ?? []),
      ]
      const under = allColours.filter(c => (c.sources?.length ?? 0) < MIN_SOURCES)
      if (under.length > 0) {
        issues.push(`  • ${ss}: ${under.length} colour(s) with fewer than ${MIN_SOURCES} sources`)
      }
    }

    const msg = [
      '╔═══════════════════════════════════════════════════════════════╗',
      '║  BLOCKED: Season research validation failed                   ║',
      '╚═══════════════════════════════════════════════════════════════╝',
      '',
      `Writing to ${relative} requires all 12 sub-seasons to have`,
      `${MIN_SOURCES}+ references for every colour. Issues found:`,
      '',
      ...issues,
      '',
      'Fix: re-run npm run research-seasons to fill the gaps.',
      'The researcher will skip already-completed seasons and only',
      'fill in what is missing.',
    ].join('\n')

    process.stderr.write(msg + '\n')
    process.exit(2)
  }

  // All good — allow the write
  process.exit(0)
}

main().catch(err => {
  process.stderr.write(`Hook error: ${err.message}\n`)
  process.exit(0)  // Don't block on hook crash
})

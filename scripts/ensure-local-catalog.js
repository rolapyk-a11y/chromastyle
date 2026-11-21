/**
 * Ensures lib/product-catalog.local.json exists before dev/build.
 *
 * That file is gitignored (local-only scraped/experimental products), so it's
 * absent on Vercel and in fresh clones. productCatalog.ts imports it, so the
 * build would fail if it were missing — this creates an empty [] placeholder.
 *
 * Runs automatically via the "predev" and "prebuild" npm lifecycle scripts.
 */

const fs = require('fs')
const path = require('path')

const target = path.join(__dirname, '..', 'lib', 'product-catalog.local.json')

if (!fs.existsSync(target)) {
  fs.writeFileSync(target, '[]\n')
  console.log('[ensure-local-catalog] created empty', path.relative(process.cwd(), target))
}

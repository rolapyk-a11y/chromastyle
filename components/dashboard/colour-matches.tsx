'use client'

/**
 * Shop My Colours
 *
 * For each of the user's best palette colours, shows real products from the
 * ingested catalog whose ACTUAL colour is closest (lowest delta-E). This is the
 * nuance-accurate recommendation — "my exact yellow", not "any yellow".
 */

import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Palette, ExternalLink, Info, Plus, Check } from 'lucide-react'
import type { ColorAnalysis, Season, BodyProfile, GarmentType } from '@/lib/types'
import { PRODUCT_CATALOG, catalogIsEmpty, type CatalogProduct } from '@/lib/productCatalog'
import { matchProducts, type ProductMatch } from '@/lib/colorMatch'

const FABRIC_LABEL: Record<string, string> = {
  'linen': 'Hør',
  'light-cotton': 'Let bomuld',
  'cotton': 'Bomuld',
  'denim': 'Denim',
  'knit': 'Strik',
  'fleece': 'Fleece',
  'wool': 'Uld',
}

// Filter chips, shown in this order when present in the catalog.
const GARMENT_TYPE_LABELS: Record<GarmentType, string> = {
  shirt:     'Skjorter',
  tshirt:    'T-shirts',
  sweater:   'Strik',
  trousers:  'Bukser',
  shorts:    'Shorts',
  jacket:    'Jakker',
  shoes:     'Sko',
  socks:     'Strømper',
  accessory: 'Tilbehør',
}
const GARMENT_TYPE_ORDER: GarmentType[] = [
  'shirt', 'tshirt', 'sweater', 'trousers', 'shorts', 'jacket', 'shoes', 'socks', 'accessory',
]

function subSeasonToSeason(sub: string): Season {
  if (sub.includes('spring')) return 'spring'
  if (sub.includes('summer')) return 'summer'
  if (sub.includes('autumn')) return 'autumn'
  return 'winter'
}

interface ColourMatchesProps {
  colorAnalysis: ColorAnalysis | undefined
  bodyProfile?: BodyProfile
  onAddToInventory: (product: CatalogProduct) => void
}

export function ColourMatches({ colorAnalysis, bodyProfile, onAddToInventory }: ColourMatchesProps) {
  const palette = colorAnalysis?.best_colors ?? []
  const season = colorAnalysis?.sub_season ? subSeasonToSeason(colorAnalysis.sub_season) : undefined
  const [typeFilter, setTypeFilter] = useState<GarmentType | 'all'>('all')

  // Which garment-type chips to show: only those actually present in the catalog.
  const availableTypes = useMemo(() => {
    const present = new Set(PRODUCT_CATALOG.map(p => p.garmentType).filter(Boolean) as GarmentType[])
    return GARMENT_TYPE_ORDER.filter(t => present.has(t))
  }, [])

  // One entry per product: feeds often list the same item once per size or colour code
  const uniqueCatalog = useMemo(() => {
    const seen = new Set<string>()
    return PRODUCT_CATALOG.filter(p => {
      if (/\b(women|woman|womens|dame|kvinde|girls?|kids?|børn|junior)\b/i.test(p.name)) return false
      const key = `${p.brand ?? ''}|${p.name}|${p.colorHex}`.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [])

  const filteredCatalog = useMemo(
    () => typeFilter === 'all'
      ? uniqueCatalog
      : uniqueCatalog.filter(p => p.garmentType === typeFilter),
    [typeFilter, uniqueCatalog],
  )

  const matchesByColour = useMemo(() => {
    if (catalogIsEmpty()) return []
    const groups = palette
      .map(hex => ({
        hex,
        matches: matchProducts(hex, filteredCatalog, 25, 16, season, bodyProfile),
      }))
    // Show each product once, under the palette colour it matches best
    const bestFor = new Map<string, { hex: string; pct: number }>()
    for (const g of groups) for (const m of g.matches) {
      const k = `${m.product.brand ?? ''}|${m.product.name}`.toLowerCase()
      const cur = bestFor.get(k)
      if (!cur || m.matchPercent > cur.pct) bestFor.set(k, { hex: g.hex, pct: m.matchPercent })
    }
    return groups
      .map(g => ({
        hex: g.hex,
        matches: g.matches
          .filter(m => bestFor.get(`${m.product.brand ?? ''}|${m.product.name}`.toLowerCase())?.hex === g.hex)
          .slice(0, 8),
      }))
      .sort((a, b) => (b.matches[0]?.matchPercent ?? 0) - (a.matches[0]?.matchPercent ?? 0))
  }, [palette, season, bodyProfile, filteredCatalog])

  if (catalogIsEmpty()) {
    return (
      <Card className="border-dashed border-border/60">
        <CardContent className="p-6 space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 text-foreground font-medium">
            <Info className="w-4 h-4" /> Intet produktkatalog endnu
          </div>
          <p>
            The colour-matching engine is ready, but there are no products to match against.
            Build the catalog from a retailer feed:
          </p>
          <pre className="bg-secondary/50 rounded-lg p-3 text-xs overflow-x-auto">npm run ingest-feed -- path/to/feed.csv</pre>
          <p className="text-xs">
            The script reads each product&apos;s image, extracts its true colour, and tags it —
            then this page ranks them by closeness to your palette.
          </p>
        </CardContent>
      </Card>
    )
  }

  const noResults = matchesByColour.every(({ matches }) => matches.length === 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Palette className="w-4 h-4" />
        <span>Rigtige produkter i dine farver, sorteret efter farve og pasform. Snit, der ikke klæder din krop, er sorteret fra.</span>
      </div>

      {/* ── Garment-type filter chips ── */}
      {availableTypes.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
              typeFilter === 'all'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border/60 text-muted-foreground hover:border-border'
            }`}
          >
            Alle
          </button>
          {availableTypes.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                typeFilter === t
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border/60 text-muted-foreground hover:border-border'
              }`}
            >
              {GARMENT_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      )}

      {noResults && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No {typeFilter === 'all' ? 'products' : GARMENT_TYPE_LABELS[typeFilter].toLowerCase()} close to your palette yet.
          {typeFilter !== 'all' && ' Try another category.'}
        </p>
      )}

      {matchesByColour.filter(({ matches }) => matches.length > 0).map(({ hex, matches }) => (
        <div key={hex} className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md border border-border/40" style={{ backgroundColor: hex }} />
            <span className="text-sm font-medium">{hex}</span>
            <span className="text-xs text-muted-foreground">
              {matches.length} {matches.length !== 1 ? 'fund' : 'fund'}
            </span>
          </div>

          {matches.length === 0 ? (
            <p className="text-xs text-muted-foreground pl-7">Ingen produkter tæt på denne farve endnu.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {matches.map(m => (
                <ProductMatchCard key={m.product.id} match={m} onAdd={onAddToInventory} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ProductMatchCard({
  match,
  onAdd,
}: {
  match: ProductMatch<CatalogProduct>
  onAdd: (product: CatalogProduct) => void
}) {
  const { product, matchPercent, fitReason } = match
  const [added, setAdded] = useState(false)

  // A positive fit signal: matchPercent (colour+fabric+fit) landed above the
  // colour-only score, meaning the cut suits the body.
  const fitsBody = match.matchPercent > match.colourPercent

  return (
    <div className="group rounded-xl border border-border/50 overflow-hidden hover:border-primary transition-colors">
      <a href={product.product_url} target="_blank" rel="noopener noreferrer" className="block">
        <div className="relative aspect-[3/4] bg-secondary/30">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full" style={{ backgroundColor: product.colorHex }} />
          )}
          <span className="absolute top-1.5 right-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-background/90 text-primary">
            {matchPercent}% match
          </span>
          <span
            className="absolute bottom-1.5 left-1.5 w-5 h-5 rounded-full border-2 border-background shadow"
            style={{ backgroundColor: product.colorHex }}
            title={`Farve ${product.colorHex}`}
          />
        </div>
      </a>
      <div className="p-2 space-y-1.5">
        <div>
          <p className="text-xs font-medium truncate">{product.name}</p>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-xs text-muted-foreground">{product.brand}</span>
            {product.price > 0 && (
              <span className="text-xs font-medium">{product.price} {product.currency}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1 mt-1">
            {product.fabric && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
                {FABRIC_LABEL[product.fabric] ?? product.fabric}
              </span>
            )}
            {fitsBody && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400"
                title={fitReason || 'Passer til dine proportioner'}
              >
                ✓ Klæder din krop
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { onAdd(product); setAdded(true) }}
            disabled={added}
            className={`flex-1 inline-flex items-center justify-center gap-1 text-[10px] px-1.5 py-1 rounded border transition-colors ${
              added
                ? 'border-green-500/50 text-green-600 dark:text-green-400'
                : 'border-border/60 hover:border-primary hover:text-primary'
            }`}
          >
            {added ? <><Check className="w-2.5 h-2.5" /> I skabet</> : <><Plus className="w-2.5 h-2.5" /> Jeg har den</>}
          </button>
          <a
            href={product.product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1 text-[10px] px-1.5 py-1 rounded border border-border/60 hover:border-primary hover:text-primary transition-colors"
          >
            <ExternalLink className="w-2.5 h-2.5" /> Se
          </a>
        </div>
      </div>
    </div>
  )
}

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
import type { ColorAnalysis } from '@/lib/types'
import { PRODUCT_CATALOG, catalogIsEmpty, type CatalogProduct } from '@/lib/productCatalog'
import { matchProducts, type ProductMatch } from '@/lib/colorMatch'

interface ColourMatchesProps {
  colorAnalysis: ColorAnalysis | undefined
  onAddToInventory: (product: CatalogProduct) => void
}

export function ColourMatches({ colorAnalysis, onAddToInventory }: ColourMatchesProps) {
  const palette = colorAnalysis?.best_colors ?? []

  const matchesByColour = useMemo(() => {
    if (catalogIsEmpty()) return []
    return palette.map(hex => ({
      hex,
      matches: matchProducts(hex, PRODUCT_CATALOG, 25, 8),
    }))
  }, [palette])

  if (catalogIsEmpty()) {
    return (
      <Card className="border-dashed border-border/60">
        <CardContent className="p-6 space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 text-foreground font-medium">
            <Info className="w-4 h-4" /> No product catalog yet
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Palette className="w-4 h-4" />
        <span>Real products matched to your exact palette colours, closest first.</span>
      </div>

      {matchesByColour.map(({ hex, matches }) => (
        <div key={hex} className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md border border-border/40" style={{ backgroundColor: hex }} />
            <span className="text-sm font-medium">{hex}</span>
            <span className="text-xs text-muted-foreground">
              {matches.length} match{matches.length !== 1 ? 'es' : ''}
            </span>
          </div>

          {matches.length === 0 ? (
            <p className="text-xs text-muted-foreground pl-7">No close products in the catalog yet.</p>
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
  const { product, matchPercent } = match
  const [added, setAdded] = useState(false)

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
            title={`Actual colour ${product.colorHex}`}
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
            {added ? <><Check className="w-2.5 h-2.5" /> Added</> : <><Plus className="w-2.5 h-2.5" /> Add to inventory</>}
          </button>
          <a
            href={product.product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1 text-[10px] px-1.5 py-1 rounded border border-border/60 hover:border-primary hover:text-primary transition-colors"
          >
            <ExternalLink className="w-2.5 h-2.5" /> View
          </a>
        </div>
      </div>
    </div>
  )
}

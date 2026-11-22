'use client'

import { useEffect, useState } from 'react'
import type { Piece } from '@/lib/types'
import type { Check } from '@/lib/outfits/rules'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Check as CheckIcon, ExternalLink, Lightbulb, Loader2, Shirt, ShoppingBag } from 'lucide-react'

interface Gap {
  id: string
  label: string
  reason: string
  garment: string
  category: Piece['category']
  colours: { word: string; hex: string }[]
}

interface Product {
  id: string
  title: string
  store: string
  link: string
  imageUrl: string
  price: string | null
  priceValue: number | null
  hex: string | null
  colourSource: 'photo' | 'title' | null
  reasons: string[]
  checks: Check[]
  outfit: Piece[]
}

interface Result {
  gaps: Gap[]
  gap: Gap
  products: Product[]
  errors: string[]
}

interface CompleteOutfitProps {
  pieces: Piece[] | null
  missing?: string | null
  onClose: () => void
  onSaved: (piece: Piece) => void
  onUseInBuilder: (keys: string[]) => void
}

export function CompleteOutfit({ pieces, missing, onClose, onSaved, onUseInBuilder }: CompleteOutfitProps) {
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<Record<string, string>>({}) // product id -> saved piece key
  const [saving, setSaving] = useState<string | null>(null)

  async function load(gapId?: string) {
    if (!pieces?.length) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/shop/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pieces: pieces.map((p) => ({ source: p.source, id: p.id })),
          missing: missing ?? null,
          gapId: gapId ?? null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setResult(json)
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Kunne ikke hente produkter')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setResult(null)
    setSaved({})
    if (pieces?.length) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieces, missing])

  async function save(p: Product): Promise<string | null> {
    if (saved[p.id]) return saved[p.id]
    if (!result) return null
    setSaving(p.id)
    try {
      const res = await fetch('/api/shop/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: p.title,
          store: p.store,
          link: p.link,
          imageUrl: p.imageUrl,
          priceValue: p.priceValue,
          hex: p.hex,
          category: result.gap.category,
          garment: result.gap.garment,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      const piece: Piece = json.piece
      onSaved(piece)
      setSaved((s) => ({ ...s, [p.id]: piece.key }))
      return piece.key
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Kunne ikke gemme')
      return null
    } finally {
      setSaving(null)
    }
  }

  async function useInBuilder(p: Product) {
    const key = await save(p)
    if (!key || !result) return
    const keys = p.outfit.map((x) => (x.source === 'shop' && x.key.startsWith('shop-new:') ? key : x.key))
    onUseInBuilder(keys)
  }

  return (
    <Dialog open={!!pieces} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" /> Fuldend outfittet
          </DialogTitle>
          <DialogDescription>
            Produkter fra H&amp;M, Zalando og UNIQLO, tjekket mod dine farver, dine regler og din pasform.
          </DialogDescription>
        </DialogHeader>

        {pieces && (
          <div className="flex gap-1.5">
            {pieces.map((p) => <Thumb key={p.key} piece={p} className="w-12 h-12 rounded-md" />)}
          </div>
        )}

        {result && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {result.gaps.map((g) => (
                <button
                  key={g.id}
                  onClick={() => load(g.id)}
                  disabled={loading}
                  className={cn(
                    'px-3 py-1 rounded-full text-sm border transition-colors',
                    g.id === result.gap.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground flex items-start gap-2">
              <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                {result.gap.reason} Søger efter <b className="text-foreground">{result.gap.garment}</b>
                {result.gap.colours[0] && <> i <b className="text-foreground">{result.gap.colours[0].word}</b></>}.
              </span>
            </p>
          </div>
        )}

        {loading && (
          <p className="text-sm text-muted-foreground flex items-center gap-2 py-6 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Søger hos H&amp;M, Zalando og UNIQLO og tjekker farverne…
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!loading && result?.errors.length ? (
          <p className="text-xs text-muted-foreground">Nogle butikker svarede ikke: {result.errors.join(', ')}</p>
        ) : null}

        {!loading && result && result.products.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Ingen produkter passede til dine farver og regler. Prøv et andet forslag ovenfor.
          </p>
        )}

        {!loading && result && result.products.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {result.products.map((p) => (
              <div key={p.id} className="rounded-lg border border-border overflow-hidden flex flex-col">
                <div className="relative aspect-square bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.imageUrl} alt={p.title} className="w-full h-full object-contain" loading="lazy" />
                  <span className="absolute top-1.5 left-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-background/90">
                    {p.store}
                  </span>
                </div>
                <div className="p-2.5 flex flex-col gap-1.5 flex-1">
                  <p className="text-sm font-medium line-clamp-2">{p.title}</p>
                  <div className="flex items-center gap-2 text-sm">
                    {p.price && <span className="font-semibold">{p.price}</span>}
                    {p.hex && (
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-border"
                        style={{ backgroundColor: p.hex }}
                        title={p.colourSource === 'photo' ? 'Farve aflæst fra billedet' : 'Farve fra produktnavnet'}
                      />
                    )}
                  </div>
                  {p.reasons.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {p.reasons.map((r) => (
                        <span key={r} className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">{r}</span>
                      ))}
                    </div>
                  )}
                  {p.checks.filter((c) => c.level === 'tip').map((c, i) => (
                    <p key={i} className="text-xs text-muted-foreground">{c.text}</p>
                  ))}
                  <div className="flex gap-1 mt-1">
                    {p.outfit.map((x) => <Thumb key={x.key} piece={x} className="w-7 h-7 rounded" />)}
                  </div>
                  <div className="flex flex-col gap-1.5 mt-auto pt-1.5">
                    <div className="flex gap-1.5">
                      <Button size="sm" className="flex-1 gap-1" disabled={saving === p.id || !!saved[p.id]} onClick={() => save(p)}>
                        {saving === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved[p.id] ? <><CheckIcon className="w-3.5 h-3.5" /> Gemt</> : 'Gem'}
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" disabled={saving === p.id} onClick={() => useInBuilder(p)}>
                        Brug i outfit
                      </Button>
                    </div>
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 justify-center"
                    >
                      Se i butik <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Priser fra Google Shopping. Lager og din størrelse ser du først hos butikken.
        </p>
      </DialogContent>
    </Dialog>
  )
}

function Thumb({ piece, className }: { piece: Piece; className?: string }) {
  return (
    <div className={cn('relative bg-secondary overflow-hidden shrink-0', className)} title={piece.name}>
      {piece.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={piece.image_url} alt={piece.name} className="w-full h-full object-cover" />
      ) : piece.colors[0] ? (
        <div className="w-full h-full" style={{ backgroundColor: piece.colors[0] }} />
      ) : (
        <Shirt className="w-1/2 h-1/2 text-muted-foreground absolute inset-0 m-auto" />
      )}
    </div>
  )
}

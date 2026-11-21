'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CLOSET_CATEGORIES,
  CLOSET_OCCASIONS,
  type ClosetCategory,
  type ColorAnalysis,
  type Outfit,
  type Piece,
} from '@/lib/types'
import { sortPieces } from '@/lib/outfits/pieces'
import { checkOutfit, type Check } from '@/lib/outfits/rules'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  AlertCircle,
  AlertTriangle,
  Check as CheckIcon,
  CheckCircle2,
  Lightbulb,
  Loader2,
  Pencil,
  Plus,
  Shirt,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'

interface Suggestion {
  name: string
  why: string
  styling_tip: string
  missing: string | null
  pieces: Piece[]
  checks: Check[]
}

interface OutfitsClientProps {
  colorAnalysis: ColorAnalysis | undefined
  closet: Piece[]
  shop: Piece[]
  initialOutfits: Outfit[]
  setupMissing: boolean
}

type Draft = {
  id?: string
  name: string
  occasion: string
  approved: boolean
  keys: string[]
}

const EMPTY: Draft = { name: '', occasion: 'everyday', approved: false, keys: [] }
const OCCASION_LABEL = Object.fromEntries(CLOSET_OCCASIONS.map((o) => [o.id, o.label]))

function asArray(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : []
}

export function OutfitsClient({ colorAnalysis, closet, shop, initialOutfits, setupMissing }: OutfitsClientProps) {
  const [outfits, setOutfits] = useState(initialOutfits)
  const [draft, setDraft] = useState<Draft | null>(initialOutfits.length ? null : { ...EMPTY })
  const [source, setSource] = useState<'closet' | 'shop'>('closet')
  const [category, setCategory] = useState<ClosetCategory | 'all'>('all')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [aiOccasion, setAiOccasion] = useState('everyday')
  const [aiWish, setAiWish] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [suggestSource, setSuggestSource] = useState<'ai' | 'rules' | null>(null)
  const [savedSuggestions, setSavedSuggestions] = useState<number[]>([])

  async function suggest() {
    setAiLoading(true)
    setAiError(null)
    setSuggestions([])
    setSavedSuggestions([])
    try {
      const res = await fetch('/api/outfits/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ occasion: aiOccasion, wish: aiWish || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      if (!json.suggestions.length) throw new Error('Der er ingen nye outfits, der overholder dine regler. Prøv en anden anledning eller tilføj mere tøj.')
      setSuggestions(json.suggestions)
      setSuggestSource(json.source)
    } catch (e) {
      setAiError(e instanceof Error && e.message ? e.message : 'Kunne ikke hente forslag')
    } finally {
      setAiLoading(false)
    }
  }

  async function saveSuggestion(s: Suggestion, i: number) {
    const res = await fetch('/api/outfits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: s.name,
        occasion: aiOccasion,
        notes: s.styling_tip,
        approved: false,
        pieces: s.pieces.map((p) => ({ source: p.source, id: p.id })),
      }),
    })
    const json = await res.json()
    if (!res.ok) return setAiError(json.error ?? 'Kunne ikke gemme')
    setOutfits((prev) => [json.outfit, ...prev])
    setSavedSuggestions((prev) => [...prev, i])
  }

  function adjustSuggestion(s: Suggestion) {
    setError(null)
    setDraft({ name: s.name, occasion: aiOccasion, approved: false, keys: s.pieces.map((p) => p.key) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const best = asArray(colorAnalysis?.best_colors)
  const avoid = asArray(colorAnalysis?.avoid_colors)
  const check = (pieces: Piece[]) => checkOutfit(pieces, best, avoid)

  const all = useMemo(() => new Map([...closet, ...shop].map((p) => [p.key, p])), [closet, shop])
  const selected = sortPieces((draft?.keys ?? []).map((k) => all.get(k)).filter((p): p is Piece => !!p))
  const pool = (source === 'closet' ? closet : shop).filter((p) => category === 'all' || p.category === category)

  function toggle(key: string) {
    if (!draft) return
    setDraft({
      ...draft,
      keys: draft.keys.includes(key) ? draft.keys.filter((k) => k !== key) : [...draft.keys, key],
    })
  }

  function edit(o: Outfit) {
    setError(null)
    setDraft({ id: o.id, name: o.name, occasion: o.occasion ?? 'everyday', approved: o.approved, keys: o.pieces.map((p) => p.key) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function save() {
    if (!draft || !draft.name.trim() || !selected.length) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(draft.id ? `/api/outfits/${draft.id}` : '/api/outfits', {
        method: draft.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          occasion: draft.occasion,
          approved: draft.approved,
          pieces: selected.map((p) => ({ source: p.source, id: p.id })),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      const saved: Outfit = json.outfit
      setOutfits((prev) => (draft.id ? prev.map((o) => (o.id === saved.id ? saved : o)) : [saved, ...prev]))
      setDraft(null)
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Kunne ikke gemme')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    setConfirmDelete(null)
    const res = await fetch(`/api/outfits/${id}`, { method: 'DELETE' })
    if (res.ok) setOutfits((prev) => prev.filter((o) => o.id !== id))
    else setError('Kunne ikke slette outfittet')
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Outfits</h1>
          <p className="text-muted-foreground mt-1">
            Sæt dit tøj sammen. Appen tjekker dine regler, dine farver og din pasform undervejs.
          </p>
        </div>
        {!draft && !setupMissing && (
          <Button className="gap-2" onClick={() => { setError(null); setDraft({ ...EMPTY }) }}>
            <Plus className="w-4 h-4" /> Nyt outfit
          </Button>
        )}
      </div>

      {setupMissing && (
        <Notice>
          Databasen til outfits er ikke sat op endnu. Kør <code>supabase/migrations/004_create_outfits.sql</code> i Supabase.
        </Notice>
      )}
      {!setupMissing && closet.length === 0 && (
        <Notice>
          Dit skab er tomt. <Link href="/dashboard/closet" className="underline">Tilføj tøj</Link> først.
        </Notice>
      )}
      {error && !draft && <Notice>{error}</Notice>}

      {/* AI suggestions */}
      {!setupMissing && closet.length >= 3 && (
        <Card className="mb-8 p-4 sm:p-5 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold">AI-forslag</h2>
              <p className="text-sm text-muted-foreground">
                Nye kombinationer af dit tøj ud fra dine farver, din krop, dine regler og de outfits, du har godkendt.
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-[180px_minmax(0,1fr)_auto] gap-2">
            <Select value={aiOccasion} onValueChange={setAiOccasion}>
              <SelectTrigger className="w-full" aria-label="Anledning"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CLOSET_OCCASIONS.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              id="ai-wish"
              value={aiWish}
              onChange={(e) => setAiWish(e.target.value)}
              placeholder="Ønske (valgfrit), fx koldt vejr eller brug de brune sko"
              onKeyDown={(e) => e.key === 'Enter' && !aiLoading && suggest()}
            />
            <Button onClick={suggest} disabled={aiLoading} className="gap-2">
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {aiLoading ? 'Tænker…' : 'Foreslå outfits'}
            </Button>
          </div>
          {aiLoading && <p className="text-sm text-muted-foreground">Det tager typisk 5-20 sekunder.</p>}
          {!aiLoading && suggestSource === 'rules' && suggestions.length > 0 && (
            <p className="text-sm text-muted-foreground">
              AI svarede ikke lige nu, så disse forslag er sat sammen ud fra dine regler og farver uden AI.
            </p>
          )}
          {aiError && <p className="text-sm text-destructive">{aiError}</p>}

          {suggestions.length > 0 && (
            <div className="grid md:grid-cols-3 gap-4">
              {suggestions.map((s, i) => (
                <div key={i} className="rounded-lg border border-border overflow-hidden flex flex-col">
                  <div className="flex h-28 bg-secondary">
                    {s.pieces.slice(0, 5).map((p) => (
                      <Thumb key={p.key} piece={p} className="flex-1 min-w-0 h-full border-r border-background last:border-r-0" />
                    ))}
                  </div>
                  <div className="p-3 flex flex-col gap-2 flex-1">
                    <h3 className="font-semibold">{s.name}</h3>
                    <p className="text-xs text-muted-foreground">{s.pieces.map((p) => p.name).join(' · ')}</p>
                    <p className="text-sm">{s.why}</p>
                    <p className="text-sm"><span className="font-medium">Tip:</span> {s.styling_tip}</p>
                    {s.missing && (
                      <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Mangler:</span> {s.missing}</p>
                    )}
                    <Checks checks={s.checks.filter((c) => c.level !== 'good')} />
                    <div className="flex gap-2 mt-auto pt-1">
                      <Button size="sm" className="flex-1 gap-1.5" disabled={savedSuggestions.includes(i)} onClick={() => saveSuggestion(s, i)}>
                        {savedSuggestions.includes(i) ? <><CheckIcon className="w-4 h-4" /> Gemt</> : 'Gem'}
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => adjustSuggestion(s)}>
                        Tilpas
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Builder */}
      {draft && (
        <Card className="mb-10 p-0 gap-0 overflow-hidden">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* Picker */}
            <div className="p-4 sm:p-5 border-b lg:border-b-0 lg:border-r border-border min-w-0">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="inline-flex rounded-lg bg-secondary p-1 text-sm">
                  {(['closet', 'shop'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSource(s)}
                      className={cn(
                        'px-3 py-1 rounded-md font-medium transition-colors',
                        source === s ? 'bg-background shadow-sm' : 'text-muted-foreground',
                      )}
                    >
                      {s === 'closet' ? `Mit skab (${closet.length})` : `Gemt fra butikker (${shop.length})`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1">
                {[{ id: 'all' as const, label: 'Alt' }, ...CLOSET_CATEGORIES].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className={cn(
                      'shrink-0 px-3 py-1 rounded-full text-sm border transition-colors',
                      category === c.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {pool.length === 0 ? (
                <p className="text-sm text-muted-foreground py-10 text-center">
                  {source === 'shop'
                    ? 'Du har ikke gemt noget fra butikkerne endnu. Gem tøj under Wardrobe.'
                    : 'Intet i denne kategori.'}
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-2">
                  {pool.map((p) => {
                    const on = draft.keys.includes(p.key)
                    return (
                      <button
                        key={p.key}
                        onClick={() => toggle(p.key)}
                        className={cn(
                          'relative text-left rounded-lg overflow-hidden border-2 transition-colors',
                          on ? 'border-primary' : 'border-transparent hover:border-border',
                        )}
                        aria-pressed={on}
                      >
                        <Thumb piece={p} className="aspect-square" />
                        <span className="block text-xs p-1.5 truncate">{p.name}</span>
                        {on && (
                          <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                            <CheckIcon className="w-3 h-3" />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Selected + checks */}
            <div className="p-4 sm:p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{draft.id ? 'Redigér outfit' : 'Nyt outfit'}</h2>
                <Button variant="ghost" size="icon" onClick={() => setDraft(null)} aria-label="Luk">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {selected.length === 0 ? (
                <p className="text-sm text-muted-foreground">Vælg tøj til venstre – overtøj, overdel, bukser og sko.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {selected.map((p) => (
                    <li key={p.key} className="flex items-center gap-3">
                      <Thumb piece={p} className="w-11 h-11 rounded-md shrink-0" />
                      <span className="text-sm flex-1 min-w-0 truncate">{p.name}</span>
                      <button onClick={() => toggle(p.key)} className="text-muted-foreground hover:text-foreground" aria-label={`Fjern ${p.name}`}>
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {selected.length > 0 && <Checks checks={check(selected)} />}

              <div className="space-y-1.5">
                <Label htmlFor="outfit-name" className="text-xs text-muted-foreground">Navn</Label>
                <Input
                  id="outfit-name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Fx Hverdag med beige puffer"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Anledning</Label>
                <Select value={draft.occasion} onValueChange={(v) => setDraft({ ...draft, occasion: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLOSET_OCCASIONS.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.approved}
                  onChange={(e) => setDraft({ ...draft, approved: e.target.checked })}
                  className="w-4 h-4 accent-[var(--primary)]"
                />
                Jeg har prøvet det, og det virker
              </label>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button onClick={save} disabled={saving || !draft.name.trim() || !selected.length} className="gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Gem outfit
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Saved outfits */}
      {outfits.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-3">Dine outfits <span className="text-muted-foreground font-normal">({outfits.length})</span></h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {outfits.map((o) => {
              const checks = check(o.pieces)
              const warns = checks.filter((c) => c.level === 'warn').length
              return (
                <Card key={o.id} className="p-0 gap-0 overflow-hidden">
                  <div className="flex h-36 bg-secondary">
                    {o.pieces.slice(0, 5).map((p) => (
                      <Thumb key={p.key} piece={p} className="flex-1 min-w-0 h-full border-r border-background last:border-r-0" />
                    ))}
                  </div>
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{o.name}</h3>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {o.occasion && (
                            <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{OCCASION_LABEL[o.occasion] ?? o.occasion}</span>
                          )}
                          {o.approved && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Virker på dig</span>
                          )}
                          {warns > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                              {warns} brud på regler
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => edit(o)} aria-label={`Redigér ${o.name}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(o.id)} aria-label={`Slet ${o.name}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{o.pieces.map((p) => p.name).join(' · ')}</p>
                    <Checks checks={checks} compact />
                    {confirmDelete === o.id && (
                      <div className="flex items-center justify-between gap-2 rounded-md bg-destructive/10 p-2 text-sm">
                        <span>Slet outfittet?</span>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>Nej</Button>
                          <Button size="sm" variant="destructive" onClick={() => remove(o.id)}>Slet</Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function Thumb({ piece, className }: { piece: Piece; className?: string }) {
  return (
    <div className={cn('relative bg-secondary overflow-hidden', className)}>
      {piece.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={piece.image_url} alt={piece.name} className="w-full h-full object-cover" />
      ) : piece.colors[0] ? (
        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: piece.colors[0] }}>
          <Shirt className="w-1/3 h-1/3 text-white/60 mix-blend-difference" />
        </div>
      ) : (
        <Shirt className="w-6 h-6 text-muted-foreground absolute inset-0 m-auto" />
      )}
    </div>
  )
}

const CHECK_STYLE = {
  warn: { icon: AlertTriangle, className: 'text-amber-700 dark:text-amber-300' },
  tip: { icon: Lightbulb, className: 'text-muted-foreground' },
  good: { icon: CheckCircle2, className: 'text-emerald-700 dark:text-emerald-300' },
} as const

function Checks({ checks, compact }: { checks: Check[]; compact?: boolean }) {
  const shown = compact ? checks.filter((c) => c.level !== 'tip' || checks.length <= 2) : checks
  return (
    <ul className="flex flex-col gap-1.5">
      {shown.map((c, i) => {
        const { icon: Icon, className } = CHECK_STYLE[c.level]
        return (
          <li key={i} className={cn('flex items-start gap-2 text-sm', className)}>
            <Icon className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{c.text}</span>
          </li>
        )
      })}
    </ul>
  )
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/50 p-3 mb-6 text-sm">
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
      <p>{children}</p>
    </div>
  )
}

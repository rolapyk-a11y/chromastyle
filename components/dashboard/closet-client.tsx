'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  CLOSET_CATEGORIES,
  CLOSET_OCCASIONS,
  type ClosetCategory,
  type ColorAnalysis,
  type UserItem,
} from '@/lib/types'
import { seasonFit, SEASON_FIT_LABEL, type SeasonFit } from '@/lib/closet/colors'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Camera,
  Loader2,
  Plus,
  Shirt,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'

interface ClosetClientProps {
  colorAnalysis: ColorAnalysis | undefined
  initialItems: UserItem[]
  setupMissing: boolean
}

type Draft = {
  id?: string
  imageData?: string          // new photo (data URL), only when adding
  previewUrl?: string | null  // what to show in the form
  name: string
  category: ClosetCategory
  subcategory: string
  brand: string
  colors: string[]
  pattern: string
  style_tags: string[]
  occasions: string[]
  notes: string
  fabric: string
  cut: string
}

const EMPTY_DRAFT: Draft = {
  name: '',
  category: 'top',
  subcategory: '',
  brand: '',
  colors: [],
  pattern: '',
  style_tags: [],
  occasions: [],
  notes: '',
  fabric: '',
  cut: '',
}

const FABRICS = [
  { id: 'linen', label: 'Hør' },
  { id: 'light-cotton', label: 'Let bomuld' },
  { id: 'cotton', label: 'Bomuld' },
  { id: 'denim', label: 'Denim' },
  { id: 'knit', label: 'Strik' },
  { id: 'fleece', label: 'Fleece / sweat' },
  { id: 'wool', label: 'Uld' },
]
const CUTS = [
  { id: 'slim', label: 'Slim' },
  { id: 'tapered', label: 'Tapered' },
  { id: 'regular', label: 'Regular' },
  { id: 'relaxed', label: 'Relaxed' },
  { id: 'wide', label: 'Wide' },
  { id: 'oversized', label: 'Oversized' },
]

const FIT_STYLE: Record<SeasonFit, string> = {
  great: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  ok: 'bg-secondary text-muted-foreground',
  avoid: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  unknown: 'hidden',
}

/** Shrinks a photo to max 1024px JPEG so uploads are fast from a phone. */
async function resizeImage(file: File, max = 1024): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.85)
}

function itemToDraft(item: UserItem): Draft {
  return {
    id: item.id,
    previewUrl: item.image_url,
    name: item.name,
    category: item.category,
    subcategory: item.subcategory ?? '',
    brand: item.brand ?? '',
    colors: item.colors ?? [],
    pattern: item.pattern ?? '',
    style_tags: item.style_tags ?? [],
    occasions: item.occasions ?? [],
    notes: item.notes ?? '',
    fabric: item.fabric ?? '',
    cut: item.cut ?? '',
  }
}

export function ClosetClient({ colorAnalysis, initialItems, setupMissing }: ClosetClientProps) {
  const [items, setItems] = useState(initialItems)
  const [filter, setFilter] = useState<ClosetCategory | 'all'>('all')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const fitFor = (colors: string[]) =>
    seasonFit(colors, colorAnalysis?.best_colors, colorAnalysis?.avoid_colors)

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length }
    for (const i of items) c[i.category] = (c[i.category] ?? 0) + 1
    return c
  }, [items])

  const visible = filter === 'all' ? items : items.filter((i) => i.category === filter)

  // --- Adding ---------------------------------------------------------------
  async function onPhotoChosen(file: File | undefined) {
    if (!file) return
    setError(null)
    const imageData = await resizeImage(file)
    setDraft({ ...EMPTY_DRAFT, imageData, previewUrl: imageData })
    setAnalyzing(true)
    try {
      const res = await fetch('/api/closet/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      const s = json.suggestion
      setDraft((d) =>
        d && {
          ...d,
          name: s.name ?? d.name,
          category: s.category ?? d.category,
          subcategory: s.subcategory ?? '',
          colors: s.colors ?? [],
          pattern: s.pattern ?? '',
          style_tags: s.style_tags ?? [],
          occasions: s.occasions ?? [],
          fabric: s.fabric ?? '',
          cut: s.cut ?? '',
        },
      )
    } catch {
      setError('AI kunne ikke genkende tøjet – udfyld felterne selv.')
    } finally {
      setAnalyzing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // --- Saving / deleting ----------------------------------------------------
  async function save() {
    if (!draft || !draft.name.trim()) return
    setSaving(true)
    setError(null)
    const fields = {
      name: draft.name,
      category: draft.category,
      subcategory: draft.subcategory || null,
      brand: draft.brand || null,
      colors: draft.colors,
      pattern: draft.pattern || null,
      style_tags: draft.style_tags,
      occasions: draft.occasions,
      notes: draft.notes || null,
      fabric: draft.fabric || null,
      cut: draft.cut || null,
    }
    try {
      const res = await fetch(draft.id ? `/api/closet/${draft.id}` : '/api/closet', {
        method: draft.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft.id ? fields : { ...fields, imageData: draft.imageData }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      const saved: UserItem = json.item
      setItems((prev) =>
        draft.id ? prev.map((i) => (i.id === saved.id ? saved : i)) : [saved, ...prev],
      )
      setDraft(null)
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Kunne ikke gemme')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Fjern dette stykke tøj fra dit skab?')) return
    setSaving(true)
    const res = await fetch(`/api/closet/${id}`, { method: 'DELETE' })
    setSaving(false)
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id))
      setDraft(null)
    } else {
      setError('Kunne ikke slette')
    }
  }

  // --- Render ---------------------------------------------------------------
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mit skab</h1>
          <p className="text-muted-foreground mt-1">
            Tag et billede af dit tøj – AI udfylder resten, og du kan se hvad der klæder dig.
          </p>
        </div>
        <Button onClick={() => fileRef.current?.click()} disabled={setupMissing} className="gap-2">
          <Camera className="w-4 h-4" />
          Tilføj tøj
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => onPhotoChosen(e.target.files?.[0])}
        />
      </div>

      {setupMissing && (
        <Notice>
          Databasen til skabet er ikke sat op endnu. Kør <code>supabase/migrations/005_create_closet.sql</code> i
          Supabase.
        </Notice>
      )}
      {!colorAnalysis && !setupMissing && (
        <Notice>
          Lav en <Link href="/dashboard/analyze" className="underline">farveanalyse</Link> for at se, hvilket
          tøj der klæder dig.
        </Notice>
      )}
      {error && !draft && <Notice>{error}</Notice>}

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4">
        {[{ id: 'all' as const, label: 'Alt' }, ...CLOSET_CATEGORIES].map((c) => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id)}
            className={cn(
              'shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors',
              filter === c.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {c.label}
            <span className="ml-1.5 opacity-60">{counts[c.id] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center text-center gap-3">
            <Shirt className="w-10 h-10 text-muted-foreground" />
            <p className="font-medium">{items.length ? 'Intet i denne kategori' : 'Dit skab er tomt'}</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Læg tøjet fladt på en rolig baggrund og tag et billede – så genkender AI det bedst.
            </p>
            {!setupMissing && (
              <Button variant="outline" className="mt-2 gap-2" onClick={() => fileRef.current?.click()}>
                <Plus className="w-4 h-4" /> Tilføj dit første stykke
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {visible.map((item) => {
            const fit = fitFor(item.colors)
            return (
              <button
                key={item.id}
                onClick={() => {
                  setError(null)
                  setDraft(itemToDraft(item))
                }}
                className="text-left group"
              >
                <Card className="overflow-hidden p-0 gap-0 transition-shadow group-hover:shadow-md">
                  <div className="aspect-square bg-secondary relative">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <Shirt className="w-10 h-10 text-muted-foreground absolute inset-0 m-auto" />
                    )}
                    <span
                      className={cn(
                        'absolute top-2 left-2 text-[11px] font-medium px-2 py-0.5 rounded-full backdrop-blur',
                        FIT_STYLE[fit],
                      )}
                    >
                      {SEASON_FIT_LABEL[fit]}
                    </span>
                  </div>
                  <CardContent className="p-3">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      {item.colors.map((c) => (
                        <span
                          key={c}
                          className="w-3.5 h-3.5 rounded-full border border-border"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <span className="text-xs text-muted-foreground ml-1 truncate">
                        {item.subcategory}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </button>
            )
          })}
        </div>
      )}

      {/* Add / edit dialog */}
      <Dialog open={!!draft} onOpenChange={(o) => !o && !saving && setDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle>{draft.id ? 'Redigér tøj' : 'Nyt stykke tøj'}</DialogTitle>
                <DialogDescription>
                  {analyzing ? 'AI kigger på billedet…' : 'Ret gerne det, AI har gættet.'}
                </DialogDescription>
              </DialogHeader>

              <div className="flex gap-4">
                <div className="w-28 h-28 shrink-0 rounded-lg bg-secondary overflow-hidden relative">
                  {draft.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={draft.previewUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Shirt className="w-8 h-8 text-muted-foreground absolute inset-0 m-auto" />
                  )}
                  {analyzing && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-3 min-w-0">
                  <Field label="Navn">
                    <Input
                      value={draft.name}
                      disabled={analyzing}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      placeholder="Fx lyseblå oxfordskjorte"
                    />
                  </Field>
                  <Field label="Kategori">
                    <Select
                      value={draft.category}
                      disabled={analyzing}
                      onValueChange={(v) => setDraft({ ...draft, category: v as ClosetCategory })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CLOSET_CATEGORIES.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Type">
                  <Input
                    value={draft.subcategory}
                    disabled={analyzing}
                    onChange={(e) => setDraft({ ...draft, subcategory: e.target.value })}
                    placeholder="Fx skjorte"
                  />
                </Field>
                <Field label="Mærke">
                  <Input
                    value={draft.brand}
                    onChange={(e) => setDraft({ ...draft, brand: e.target.value })}
                    placeholder="Valgfrit"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Stof">
                  <Select value={draft.fabric || 'none'} onValueChange={(v) => setDraft({ ...draft, fabric: v === 'none' ? '' : v })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ved ikke</SelectItem>
                      {FABRICS.map((f) => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Pasform">
                  <Select value={draft.cut || 'none'} onValueChange={(v) => setDraft({ ...draft, cut: v === 'none' ? '' : v })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ved ikke</SelectItem>
                      {CUTS.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="Farver">
                <div className="flex items-center gap-2 flex-wrap">
                  {draft.colors.map((c, idx) => (
                    <span key={idx} className="relative">
                      <input
                        type="color"
                        value={c}
                        onChange={(e) => {
                          const colors = [...draft.colors]
                          colors[idx] = e.target.value.toUpperCase()
                          setDraft({ ...draft, colors })
                        }}
                        className="w-9 h-9 rounded-full cursor-pointer border border-border p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0"
                      />
                      <button
                        type="button"
                        onClick={() => setDraft({ ...draft, colors: draft.colors.filter((_, i) => i !== idx) })}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-background border border-border flex items-center justify-center"
                        aria-label="Fjern farve"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  {draft.colors.length < 3 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="rounded-full w-9 h-9"
                      onClick={() => setDraft({ ...draft, colors: [...draft.colors, '#808080'] })}
                      aria-label="Tilføj farve"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                  {colorAnalysis && draft.colors.length > 0 && (
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', FIT_STYLE[fitFor(draft.colors)])}>
                      {SEASON_FIT_LABEL[fitFor(draft.colors)]}
                    </span>
                  )}
                </div>
              </Field>

              <Field label="Anledninger">
                <div className="flex flex-wrap gap-2">
                  {CLOSET_OCCASIONS.map((o) => {
                    const on = draft.occasions.includes(o.id)
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            occasions: on
                              ? draft.occasions.filter((x) => x !== o.id)
                              : [...draft.occasions, o.id],
                          })
                        }
                        className={cn(
                          'px-3 py-1 rounded-full text-sm border transition-colors',
                          on ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground',
                        )}
                      >
                        {o.label}
                      </button>
                    )
                  })}
                </div>
              </Field>

              <Field label="Noter">
                <Textarea
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  placeholder="Fx pasform, størrelse, skal til skrædder…"
                  rows={2}
                />
              </Field>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <DialogFooter className="gap-2 sm:justify-between">
                {draft.id ? (
                  <Button variant="ghost" className="text-destructive gap-2" disabled={saving} onClick={() => remove(draft.id!)}>
                    <Trash2 className="w-4 h-4" /> Slet
                  </Button>
                ) : (
                  <span />
                )}
                <Button onClick={save} disabled={saving || analyzing || !draft.name.trim()} className="gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Gem i skabet
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
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

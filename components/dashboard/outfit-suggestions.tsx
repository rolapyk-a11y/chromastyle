'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Plus, TrendingUp } from 'lucide-react'
import type { OutfitCombo, ItemCategory, SubSeason } from '@/lib/types'
import { SUB_SEASON_INFO } from '@/lib/types'

const SCORE_COLOURS: Record<OutfitCombo['scoreLabel'], string> = {
  Great: 'text-green-600 dark:text-green-400 bg-green-500/10',
  Good:  'text-blue-600 dark:text-blue-400 bg-blue-500/10',
  Okay:  'text-amber-600 dark:text-amber-400 bg-amber-500/10',
  Clash: 'text-red-600 dark:text-red-400 bg-red-500/10',
}

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  top: 'Top', bottom: 'Bottom', jacket: 'Jacket', shoes: 'Shoes', accessory: 'Accessory',
}

interface OutfitSuggestionsProps {
  outfits: OutfitCombo[]
  subSeason: SubSeason | undefined
  onAddItem: () => void
  hasItems: boolean
}

export function OutfitSuggestions({ outfits, subSeason, onAddItem, hasItems }: OutfitSuggestionsProps) {
  if (!hasItems) {
    return (
      <div className="text-center py-12 text-muted-foreground space-y-3">
        <Sparkles className="w-8 h-8 mx-auto opacity-30" />
        <p className="text-sm">No items yet</p>
        <Button size="sm" variant="outline" onClick={onAddItem}>
          <Plus className="w-4 h-4 mr-1" /> Add items to get outfits
        </Button>
      </div>
    )
  }

  if (outfits.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground space-y-3">
        <Sparkles className="w-8 h-8 mx-auto opacity-30" />
        <p className="text-sm">Add at least one top and one bottom to generate outfits.</p>
        <Button size="sm" variant="outline" onClick={onAddItem}>
          <Plus className="w-4 h-4 mr-1" /> Add item
        </Button>
      </div>
    )
  }

  const subSeasonName = subSeason ? SUB_SEASON_INFO[subSeason]?.name : undefined

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <TrendingUp className="w-4 h-4" />
        <span>
          {outfits.length} outfit{outfits.length !== 1 ? 's' : ''} generated
          {subSeasonName ? ` for ${subSeasonName}` : ''}
          , ranked best first
        </span>
      </div>

      {outfits.map((outfit, i) => (
        <OutfitCard key={i} outfit={outfit} rank={i + 1} />
      ))}

      <Button variant="outline" size="sm" className="w-full" onClick={onAddItem}>
        <Plus className="w-4 h-4 mr-1" /> Add more items for more combinations
      </Button>
    </div>
  )
}

function OutfitCard({ outfit, rank }: { outfit: OutfitCombo; rank: number }) {
  const labelClass = SCORE_COLOURS[outfit.scoreLabel]

  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-3">

        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">Outfit #{rank}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${labelClass}`}>
            {outfit.scoreLabel} — {outfit.score}/100
          </span>
        </div>

        {/* Colour swatches row */}
        <div className="flex items-center gap-2 flex-wrap">
          {outfit.items.map((item, j) => (
            <div key={j} className="flex flex-col items-center gap-1">
              <div
                className="w-12 h-12 rounded-xl border border-border/40 shadow-sm"
                style={{ backgroundColor: item.color_hex }}
                title={item.color_name}
              />
              <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[item.category]}</span>
            </div>
          ))}
        </div>

        {/* Item list */}
        <div className="space-y-1">
          {outfit.items.map((item, j) => (
            <div key={j} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-sm shrink-0 border border-border/40"
                style={{ backgroundColor: item.color_hex }}
              />
              <span className="font-medium">{item.name}</span>
              <span className="text-muted-foreground text-xs">· {item.color_name}</span>
            </div>
          ))}
        </div>

        {/* Styling tip */}
        <div className="flex items-start gap-2 bg-secondary/40 rounded-lg px-3 py-2">
          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">{outfit.tip}</p>
        </div>

      </CardContent>
    </Card>
  )
}

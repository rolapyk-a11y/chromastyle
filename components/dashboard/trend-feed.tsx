'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TrendingUp, RefreshCw, ExternalLink, Sparkles, CheckCircle2
} from 'lucide-react'

export interface TrendRow {
  id: string
  title: string
  description: string
  season: string
  sub_seasons: string[]
  key_pieces: string[]
  color_palette: string[]
  styling_tips: string[]
  why_it_works: string
  aesthetic_tags: string[]
  sources: string[]
  relevance_score: number
  searched_at: string
  created_at: string
  expires_at: string
}

interface TrendFeedProps {
  initialTrends: TrendRow[]
  cronSecret?: string  // only passed for admin/owner view
}

export function TrendFeed({ initialTrends, cronSecret }: TrendFeedProps) {
  const [trends, setTrends] = useState<TrendRow[]>(initialTrends)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function handleRefresh() {
    if (!cronSecret) return
    setIsRefreshing(true)
    setRefreshStatus('idle')

    try {
      const res = await fetch('/api/trends/refresh', {
        method: 'POST',
        headers: { Authorization: `Bearer ${cronSecret}` },
      })

      if (!res.ok) throw new Error('Refresh failed')

      // Re-fetch updated trends
      const trendsRes = await fetch('/api/trends')
      const { trends: updated } = await trendsRes.json()
      setTrends(updated || [])
      setRefreshStatus('success')
    } catch {
      setRefreshStatus('error')
    } finally {
      setIsRefreshing(false)
    }
  }

  const lastSearched = trends[0]?.searched_at
    ? new Date(trends[0].searched_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
      })
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Your Trend Feed
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            AI-curated for Soft Spring / Light Spring •{' '}
            {lastSearched ? `Updated ${lastSearched}` : 'Not yet generated'}
          </p>
        </div>

        {cronSecret && (
          <div className="flex items-center gap-2">
            {refreshStatus === 'success' && (
              <span className="text-sm text-accent flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Updated!
              </span>
            )}
            {refreshStatus === 'error' && (
              <span className="text-sm text-destructive">Failed — try again</span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Searching web…' : 'Refresh Trends'}
            </Button>
          </div>
        )}
      </div>

      {/* Empty state */}
      {trends.length === 0 && (
        <Card className="border-dashed border-border/50">
          <CardContent className="py-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">No trends yet</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
                The trend agent hasn&apos;t run yet. Trends are refreshed weekly,
                or you can trigger a manual refresh.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trend Cards */}
      <div className="grid gap-5">
        {trends.map((trend) => {
          const isExpanded = expandedId === trend.id
          return (
            <Card
              key={trend.id}
              className="border-border/50 bg-card/50 hover:border-primary/30 transition-all duration-200"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {trend.aesthetic_tags?.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs capitalize">
                          {tag}
                        </Badge>
                      ))}
                      <Badge
                        variant="outline"
                        className="text-xs ml-auto"
                        style={{ color: trend.relevance_score >= 8 ? 'oklch(0.65 0.18 160)' : undefined }}
                      >
                        {trend.relevance_score}/10 match
                      </Badge>
                    </div>
                    <CardTitle className="text-lg leading-snug">{trend.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Colour Palette */}
                {trend.color_palette?.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">Palette</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {trend.color_palette.map((hex, i) => (
                        <div
                          key={i}
                          className="w-7 h-7 rounded-full border border-border/50 shadow-sm cursor-default"
                          style={{ backgroundColor: hex }}
                          title={hex}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {trend.description}
                </p>

                {/* Why it works — always visible */}
                <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                  <p className="text-xs font-medium text-accent mb-1">
                    Why this works for your palette
                  </p>
                  <p className="text-sm text-muted-foreground">{trend.why_it_works}</p>
                </div>

                {/* Expandable details */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : trend.id)}
                  className="text-xs text-primary hover:underline"
                >
                  {isExpanded ? 'Show less' : 'Show key pieces & styling tips'}
                </button>

                {isExpanded && (
                  <div className="space-y-4 pt-1">
                    {/* Key Pieces */}
                    {trend.key_pieces?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                          Key Pieces
                        </p>
                        <ul className="space-y-1">
                          {trend.key_pieces.map((piece, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-primary mt-0.5">·</span>
                              {piece}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Styling Tips */}
                    {trend.styling_tips?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                          How to Wear It
                        </p>
                        <ul className="space-y-1">
                          {trend.styling_tips.map((tip, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Sources */}
                    {trend.sources?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                          Sources
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {trend.sources.filter(Boolean).map((url, i) => {
                            let hostname = url
                            try { hostname = new URL(url).hostname.replace('www.', '') } catch {}
                            return (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/50 rounded px-2 py-1"
                              >
                                {hostname}
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
export function TrendFeedSkeleton() {
  return (
    <div className="space-y-5">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex gap-2 mb-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-6 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((j) => (
                <Skeleton key={j} className="w-7 h-7 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

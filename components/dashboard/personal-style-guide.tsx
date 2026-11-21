'use client'

import { useEffect, useState } from 'react'
import type { BodyProfile, ColorAnalysis, Outfit } from '@/lib/types'
import { SUB_SEASON_INFO } from '@/lib/types'
import { bodyProfileSummary } from '@/lib/bodyGuide'
import { loadBody, saveBody } from '@/lib/body-store'
import { buildPersonalGuide } from '@/lib/style/personal'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { BodyProfileQuiz } from './body-profile-quiz'
import { Ruler, Sparkles } from 'lucide-react'

interface PersonalStyleGuideProps {
  colorAnalysis: ColorAnalysis | undefined
  /** Called when the body profile is loaded or changed (so product lists can use it). */
  onBodyProfile?: (profile: BodyProfile | undefined) => void
}

function asArray(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : []
}

export function PersonalStyleGuide({ colorAnalysis, onBodyProfile }: PersonalStyleGuideProps) {
  const [body, setBody] = useState<BodyProfile | undefined>()
  const [signedIn, setSignedIn] = useState(false)
  const [approved, setApproved] = useState<Outfit[]>([])
  const [quizOpen, setQuizOpen] = useState(false)

  useEffect(() => {
    loadBody().then(({ profile, signedIn }) => {
      setBody(profile)
      setSignedIn(signedIn)
      onBodyProfile?.(profile)
      if (signedIn) {
        fetch('/api/outfits')
          .then((r) => (r.ok ? r.json() : { outfits: [] }))
          .then((j) => setApproved((j.outfits ?? []).filter((o: Outfit) => o.approved)))
          .catch(() => {})
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const guide = buildPersonalGuide({ body, approved })
  const best = asArray(colorAnalysis?.best_colors).slice(0, 10)
  const avoid = asArray(colorAnalysis?.avoid_colors).slice(0, 6)
  const seasonName = colorAnalysis ? SUB_SEASON_INFO[colorAnalysis.sub_season]?.name : null

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-5 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <div>
              <h2 className="font-semibold text-sm">Din stilguide</h2>
              <p className="text-xs text-muted-foreground">
                {[seasonName, body ? bodyProfileSummary(body) : null].filter(Boolean).join(' · ') || 'Lav en farveanalyse og en pasformsprofil for at gøre den personlig'}
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setQuizOpen(true)}>
            <Ruler className="w-4 h-4" /> {body ? 'Redigér pasformsprofil' : 'Lav pasformsprofil'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
          <section className="space-y-2">
            <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">Pasform</p>
            <div className="flex flex-wrap gap-1.5">
              {guide.fits.map((f) => (
                <span key={f} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{f}</span>
              ))}
            </div>
            <ul className="space-y-1.5 text-xs text-muted-foreground leading-relaxed list-disc pl-4">
              {guide.fitTips.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </section>

          <section className="space-y-2">
            <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">Farver og stof</p>
            {best.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {best.map((c) => <span key={c} className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: c }} title={c} />)}
              </div>
            )}
            <p className="text-xs text-muted-foreground leading-relaxed">
              Lyse, varme og bløde farver tæt på ansigtet, mørkere farver længere nede.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {guide.fabrics.map((f) => (
                <span key={f} className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 text-xs font-medium">{f}</span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{guide.fabricAdvice}</p>
          </section>

          <section className="space-y-2">
            <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">Undgå</p>
            <div className="flex flex-wrap gap-1.5">
              {guide.avoid.map((f) => (
                <span key={f} className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium">{f}</span>
              ))}
            </div>
            {avoid.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Ved ansigtet:
                {avoid.map((c) => <span key={c} className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: c }} title={c} />)}
              </div>
            )}
            <div className="mt-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-xs font-medium text-primary mb-0.5">
                {guide.formulaSource === 'approved' ? 'Din formel (fra et outfit du har godkendt)' : 'Sæsonens formel'}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">{guide.formula}</p>
            </div>
          </section>
        </div>
        {!signedIn && (
          <p className="text-xs text-muted-foreground">Du er ikke logget ind, så profilen gemmes kun i denne browser.</p>
        )}
      </CardContent>

      <Dialog open={quizOpen} onOpenChange={setQuizOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
          <DialogTitle className="sr-only">Pasformsprofil</DialogTitle>
          <BodyProfileQuiz
            onComplete={async (profile) => {
              setBody(profile)
              onBodyProfile?.(profile)
              setQuizOpen(false)
              await saveBody(profile, signedIn)
            }}
            onSkip={() => setQuizOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Card>
  )
}

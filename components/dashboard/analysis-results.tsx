'use client'

import { ColorAnalysis, SEASON_INFO, SUB_SEASON_INFO } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ColorPaletteDisplay } from './color-palette-display'
import { 
  ArrowRight, 
  RotateCcw, 
  Sparkles, 
  Eye, 
  Palette,
  User,
  Lightbulb
} from 'lucide-react'

interface AnalysisResultsProps {
  analysis: ColorAnalysis
  onReset: () => void
  onContinue: () => void
}

export function AnalysisResults({ analysis, onReset, onContinue }: AnalysisResultsProps) {
  const seasonInfo = SEASON_INFO[analysis.season]
  const subSeasonInfo = SUB_SEASON_INFO[analysis.sub_season]
  const details = analysis.analysis_details

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm mb-4">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>Analysis Complete</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          {"You're a "}
          <span className={`text-transparent bg-clip-text bg-gradient-to-r ${seasonInfo.gradient}`}>
            {subSeasonInfo.name}
          </span>
        </h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          {seasonInfo.description}
        </p>
      </div>

      {/* Season Badge */}
      <Card className="border-border/50 overflow-hidden">
        <div className={`h-2 bg-gradient-to-r ${seasonInfo.gradient}`} />
        <CardContent className="p-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center md:text-left">
              <p className="text-sm text-muted-foreground mb-1">Main Season</p>
              <p className="text-2xl font-bold capitalize">{analysis.season}</p>
            </div>
            <div className="text-center md:text-left">
              <p className="text-sm text-muted-foreground mb-1">Sub-Season</p>
              <p className="text-2xl font-bold">{subSeasonInfo.name}</p>
            </div>
            <div className="text-center md:text-left">
              <p className="text-sm text-muted-foreground mb-1">Undertone</p>
              <p className="text-2xl font-bold capitalize">{analysis.skin_undertone}</p>
            </div>
          </div>
          {details && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="w-4 h-4" />
                <span>Confidence: {details.season_confidence}%</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Color Palettes */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Palette className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Your Color Palette</CardTitle>
              <CardDescription>Colors that enhance your natural features</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ColorPaletteDisplay analysis={analysis} />
        </CardContent>
      </Card>

      {/* Feature Analysis */}
      {details && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Skin Analysis */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">Skin Analysis</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{details.skin_analysis}</p>
            </CardContent>
          </Card>

          {/* Eye Analysis */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">Eye Analysis</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{details.eye_analysis}</p>
              {analysis.eye_color && (
                <p className="text-sm mt-2">
                  <span className="font-medium">Eye Color:</span> {analysis.eye_color}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Hair Analysis */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">Hair Analysis</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{details.hair_analysis}</p>
              {analysis.hair_color && (
                <p className="text-sm mt-2">
                  <span className="font-medium">Hair Color:</span> {analysis.hair_color}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Overall Recommendation */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">Recommendation</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{details.overall_recommendation}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Style Tips */}
      {details?.style_tips && details.style_tips.length > 0 && (
        <Card className="border-border/50 bg-secondary/30">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-accent" />
              </div>
              <div>
                <CardTitle>Style Tips for Your Colors</CardTitle>
                <CardDescription>Personalized recommendations based on your analysis</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {details.style_tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-accent">{index + 1}</span>
                  </div>
                  <p className="text-sm">{tip}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
        <Button variant="outline" size="lg" onClick={onReset}>
          <RotateCcw className="mr-2 h-5 w-5" />
          Analyze Again
        </Button>
        <Button size="lg" onClick={onContinue}>
          Shop Your Colors
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}

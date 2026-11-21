'use client'

import { getStyleGuide } from '@/lib/seasonStyle'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

// Sample Light Spring products (representative of what SerpAPI returns)
const SAMPLE_PRODUCTS = [
  { id: '1', name: "M&S Pure Cotton Oxford Shirt", brand: "M&S", price: "£24.00", colour: "Apricot", hex: "#F5A886", category: "shirt", url: "https://www.marksandspencer.com" },
  { id: '2', name: "Men's Relaxed Fit Linen Trousers", brand: "Next", price: "£35.00", colour: "Camel", hex: "#C4A070", category: "trousers", url: "https://www.next.co.uk" },
  { id: '3', name: "Warm Mint Casual Jacket", brand: "H&M", price: "£45.00", colour: "Warm Mint", hex: "#94D4B0", category: "jacket", url: "https://www.hm.com" },
  { id: '4', name: "Peach Slim Fit Cotton Shirt", brand: "ASOS", price: "£22.00", colour: "Peach", hex: "#F4C4A4", category: "shirt", url: "https://www.asos.com" },
  { id: '5', name: "Ivory Linen Blend Chinos", brand: "Zara", price: "£39.00", colour: "Ivory", hex: "#F2E4D0", category: "trousers", url: "https://www.zara.com" },
  { id: '6', name: "Soft Watermelon Overshirt", brand: "River Island", price: "£49.00", colour: "Soft Watermelon", hex: "#ECA0A0", category: "jacket", url: "https://www.riverisland.com" },
]

const PALETTE = [
  { hex: '#F5A886', name: 'Apricot' },
  { hex: '#F4C4A4', name: 'Peach' },
  { hex: '#ECA0A0', name: 'Soft Watermelon' },
  { hex: '#F0B4C4', name: 'Taffy Pink' },
  { hex: '#94D4B0', name: 'Warm Mint' },
  { hex: '#F8E080', name: 'Banana Yellow' },
  { hex: '#A8C4DC', name: 'Powder Blue' },
  { hex: '#C4A070', name: 'Camel' },
  { hex: '#F2E4D0', name: 'Ivory' },
]

const AVOID = [
  { hex: '#1A1A1A', name: 'Near Black' },
  { hex: '#F5F5F5', name: 'Stark White' },
  { hex: '#1A237E', name: 'Dark Navy' },
  { hex: '#36454F', name: 'Charcoal' },
]

export default function DemoPage() {
  const guide = getStyleGuide('light-spring')

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-xs text-primary">
          <Sparkles className="w-3 h-3" /> Demo — Light Spring
        </div>
        <h1 className="text-3xl font-bold">Your Colour & Style Guide</h1>
        <p className="text-muted-foreground">This is what ChromaStyle shows after your photo analysis</p>
        <Button asChild size="sm" className="mt-2">
          <Link href="/analyze">Take your own analysis →</Link>
        </Button>
      </div>

      {/* Colour Palette */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="font-semibold">Your Best Colours</h2>
          <div className="flex flex-wrap gap-3">
            {PALETTE.map(c => (
              <div key={c.hex} className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-xl shadow-sm border border-border/30" style={{ backgroundColor: c.hex }} />
                <span className="text-xs text-muted-foreground text-center w-14 leading-tight">{c.name}</span>
              </div>
            ))}
          </div>
          <div className="mt-2">
            <p className="text-xs text-muted-foreground font-medium mb-2">Avoid these colours</p>
            <div className="flex gap-3">
              {AVOID.map(c => (
                <div key={c.hex} className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-xl shadow-sm border border-border/30 opacity-60" style={{ backgroundColor: c.hex }} />
                  <span className="text-xs text-muted-foreground text-center w-14 leading-tight">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Style Guide */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Style Guide — Light Spring</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">Best Fits</p>
              <div className="flex flex-wrap gap-1.5">
                {guide.fits.map(f => (
                  <span key={f} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{f}</span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{guide.fitAdvice}</p>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">Best Fabrics</p>
              <div className="flex flex-wrap gap-1.5">
                {guide.fabrics.map(f => (
                  <span key={f} className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 text-xs font-medium">{f}</span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{guide.fabricAdvice}</p>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">Avoid</p>
              <div className="flex flex-wrap gap-1.5">
                {guide.avoid.map(f => (
                  <span key={f} className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium">{f}</span>
                ))}
              </div>
              <div className="mt-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-xs font-medium text-primary mb-0.5">Go-to outfit formula</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{guide.outfitFormula}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Products */}
      <div className="space-y-3">
        <h2 className="font-semibold">Clothes matched to your palette</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {SAMPLE_PRODUCTS.map(p => (
            <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer"
              className="group block rounded-xl border border-border/50 overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all">
              <div className="aspect-[4/3] flex items-center justify-center" style={{ backgroundColor: p.hex + '40' }}>
                <div className="w-16 h-16 rounded-full" style={{ backgroundColor: p.hex }} />
              </div>
              <div className="p-3">
                <p className="text-xs text-muted-foreground">{p.brand}</p>
                <p className="text-sm font-medium leading-tight line-clamp-2">{p.name}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-semibold text-sm">{p.price}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/20 text-xs">
                    <Sparkles className="w-2.5 h-2.5" /> Matches you
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

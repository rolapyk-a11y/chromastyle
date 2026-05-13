import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Camera, Palette, Shirt, TrendingUp, ArrowRight, Sparkles } from 'lucide-react'
import { SEASON_INFO } from '@/lib/types'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Chroma<span className="text-primary">Style</span>
            </span>
          </Link>

          <nav className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container mx-auto px-4 py-24 md:py-32 relative">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>AI-Powered Color Analysis</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">
              Discover the Colors That Make You{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                Look Your Best
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
              Take a photo and let AI analyze your unique coloring. Get personalized clothing recommendations
              from H&M, Zara, and more - all matched to your seasonal color palette.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="text-lg px-8">
                <Link href="/auth/sign-up">
                  Analyze My Colors
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-lg px-8">
                <Link href="#how-it-works">
                  How It Works
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Season Preview */}
      <section className="py-16 border-t border-border/40">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(Object.keys(SEASON_INFO) as Array<keyof typeof SEASON_INFO>).map((season) => (
              <Card key={season} className="border-border/50 bg-card/50 overflow-hidden group hover:border-primary/50 transition-colors">
                <CardContent className="p-0">
                  <div className={`h-2 bg-gradient-to-r ${SEASON_INFO[season].gradient}`} />
                  <div className="p-4">
                    <h3 className="font-semibold capitalize">{season}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{SEASON_INFO[season].description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="how-it-works" className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our AI analyzes your unique features to find your perfect color palette in minutes
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Camera,
                title: 'Take a Photo',
                description: 'Snap a selfie in natural lighting. Our AI needs to see your true colors.'
              },
              {
                icon: Palette,
                title: 'Get Your Season',
                description: 'Discover if you\'re a Spring, Summer, Autumn, or Winter - plus your sub-season.'
              },
              {
                icon: Shirt,
                title: 'Shop Your Colors',
                description: 'Browse clothing from H&M, Zara & more, filtered to match your palette.'
              },
              {
                icon: TrendingUp,
                title: 'Stay Trendy',
                description: 'Get AI-curated trend updates tailored to your seasonal colors.'
              }
            ].map((feature, index) => (
              <Card key={index} className="border-border/50 bg-card/50 hover:bg-card transition-colors">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Virtual Try-On Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-sm">
                <Shirt className="w-4 h-4 text-accent" />
                <span>Virtual Try-On</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                See How Clothes Look on You Before You Buy
              </h2>
              <p className="text-lg text-muted-foreground">
                Our AI-powered virtual try-on lets you see exactly how clothing items will look on your body.
                No more guessing - shop with confidence knowing what works for you.
              </p>
              <ul className="space-y-3">
                {[
                  'Realistic clothing overlay on your photo',
                  'Test different colors and styles instantly',
                  'See how your palette colors complement your features'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-accent" />
                    </div>
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg" asChild>
                <Link href="/auth/sign-up">
                  Try It Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 rounded-full bg-primary/20 mx-auto flex items-center justify-center">
                    <Camera className="w-12 h-12 text-primary" />
                  </div>
                  <p className="text-muted-foreground">Virtual try-on preview</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-primary/10 via-accent/5 to-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Discover Your Colors?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of men who have transformed their style with personalized color analysis.
          </p>
          <Button size="lg" asChild className="text-lg px-8">
            <Link href="/auth/sign-up">
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">ChromaStyle</span>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-powered color analysis for men. Find your perfect palette.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

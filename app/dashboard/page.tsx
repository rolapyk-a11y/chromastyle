import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, Palette, Shirt, TrendingUp, ArrowRight, Sparkles } from 'lucide-react'
import { ColorAnalysis, SEASON_INFO, SUB_SEASON_INFO } from '@/lib/types'
import { ColorPaletteDisplay } from '@/components/dashboard/color-palette-display'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Get the user's latest color analysis
  const { data: analyses } = await supabase
    .from('color_analyses')
    .select('*')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })
    .limit(1)
  
  const latestAnalysis = analyses?.[0] as ColorAnalysis | undefined
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'there'

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {displayName}
          </h1>
          <p className="text-muted-foreground mt-1">
            {latestAnalysis 
              ? 'Your personalized style dashboard' 
              : 'Let\'s discover your perfect colors'}
          </p>
        </div>
        {!latestAnalysis && (
          <Button asChild size="lg">
            <Link href="/dashboard/analyze">
              <Camera className="mr-2 h-5 w-5" />
              Start Color Analysis
            </Link>
          </Button>
        )}
      </div>

      {latestAnalysis ? (
        <>
          {/* Color Profile Card */}
          <Card className="border-border/50 overflow-hidden">
            <div className={`h-2 bg-gradient-to-r ${SEASON_INFO[latestAnalysis.season].gradient}`} />
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Palette className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Your Color Profile</CardTitle>
                    <CardDescription>
                      {SUB_SEASON_INFO[latestAnalysis.sub_season].name}
                    </CardDescription>
                  </div>
                </div>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/analyze">
                    New Analysis
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Season</h4>
                  <p className="text-lg font-semibold capitalize">{latestAnalysis.season}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {SEASON_INFO[latestAnalysis.season].description}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Undertone</h4>
                  <p className="text-lg font-semibold capitalize">{latestAnalysis.skin_undertone}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Features</h4>
                  <p className="text-sm">
                    {latestAnalysis.eye_color && `${latestAnalysis.eye_color} eyes`}
                    {latestAnalysis.eye_color && latestAnalysis.hair_color && ', '}
                    {latestAnalysis.hair_color && `${latestAnalysis.hair_color} hair`}
                  </p>
                </div>
              </div>

              <ColorPaletteDisplay analysis={latestAnalysis} />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-border/50 hover:bg-secondary/50 transition-colors">
              <Link href="/dashboard/wardrobe">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Shirt className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Browse Wardrobe</h3>
                    <p className="text-sm text-muted-foreground">
                      Shop clothes in your colors
                    </p>
                  </div>
                  <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Link>
            </Card>

            <Card className="border-border/50 hover:bg-secondary/50 transition-colors">
              <Link href="/dashboard/trends">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Your Trends</h3>
                    <p className="text-sm text-muted-foreground">
                      AI-curated for your palette
                    </p>
                  </div>
                  <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Link>
            </Card>

            <Card className="border-border/50 hover:bg-secondary/50 transition-colors">
              <Link href="/dashboard/analyze">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Re-analyze</h3>
                    <p className="text-sm text-muted-foreground">
                      Update your color profile
                    </p>
                  </div>
                  <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Link>
            </Card>
          </div>
        </>
      ) : (
        /* First-time user experience */
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Discover Your Season</h2>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Take a quick photo and our AI will analyze your unique coloring to find your perfect seasonal palette.
              </p>
              <Button asChild size="lg" className="mt-4">
                <Link href="/dashboard/analyze">
                  <Camera className="mr-2 h-5 w-5" />
                  Start Analysis
                </Link>
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">What you&apos;ll discover:</h3>
            {[
              { icon: Palette, title: 'Your Seasonal Colors', desc: 'Find out if you\'re Spring, Summer, Autumn, or Winter' },
              { icon: Shirt, title: 'Perfect Clothing Matches', desc: 'Get recommendations from H&M, Zara & more' },
              { icon: TrendingUp, title: 'Personalized Trends', desc: 'Stay stylish with AI-curated trend updates' },
            ].map((item, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

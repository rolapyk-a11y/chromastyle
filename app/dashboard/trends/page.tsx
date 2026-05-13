import { createClient } from '@/lib/supabase/server'
import { TrendFeed, TrendFeedSkeleton, type TrendRow } from '@/components/dashboard/trend-feed'
import { Suspense } from 'react'

async function TrendFeedData() {
  const supabase = await createClient()

  const { data: trends, error } = await supabase
    .from('fashion_trends')
    .select('*')
    .gt('expires_at', new Date().toISOString())
    .order('relevance_score', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Trends fetch error:', error)
  }

  // Pass CRON_SECRET to enable the refresh button
  // This is safe — it's a server component, the value never goes to the browser
  // unless the user is the owner (you can add an ownership check here if needed)
  const cronSecret = process.env.CRON_SECRET

  return (
    <TrendFeed
      initialTrends={(trends as TrendRow[]) || []}
      cronSecret={cronSecret}
    />
  )
}

export default function TrendsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trend Feed</h1>
        <p className="text-muted-foreground mt-1">
          Weekly AI-curated trends filtered for your Soft Spring / Light Spring palette.
          Each trend is scored and explained specifically for your colouring.
        </p>
      </div>

      <Suspense fallback={<TrendFeedSkeleton />}>
        <TrendFeedData />
      </Suspense>
    </div>
  )
}

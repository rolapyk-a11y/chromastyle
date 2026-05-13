'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ClothingItem, ColorAnalysis } from '@/lib/types'
import { ClothingCard } from './clothing-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Heart, Shirt, ArrowRight } from 'lucide-react'

interface SavedItemsClientProps {
  savedItems: (ClothingItem & { savedItemId: string })[]
  colorAnalysis: ColorAnalysis | undefined
}

export function SavedItemsClient({ savedItems: initialItems, colorAnalysis }: SavedItemsClientProps) {
  const [savedItems, setSavedItems] = useState(initialItems)

  const handleRemove = async (itemId: string) => {
    // Optimistic update
    setSavedItems(prev => prev.filter(item => item.id !== itemId))

    try {
      const response = await fetch('/api/saved-items', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clothing_item_id: itemId })
      })

      if (!response.ok) {
        // Revert on error
        setSavedItems(initialItems)
      }
    } catch {
      // Revert on error
      setSavedItems(initialItems)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Saved Items</h1>
        <p className="text-muted-foreground mt-1">
          Your favorite pieces from the wardrobe
        </p>
      </div>

      {savedItems.length > 0 ? (
        <>
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{savedItems.length} item{savedItems.length !== 1 ? 's' : ''} saved</span>
            <span className="text-border">|</span>
            <span>
              Total: {new Intl.NumberFormat('da-DK', {
                style: 'currency',
                currency: 'DKK',
                minimumFractionDigits: 0
              }).format(savedItems.reduce((sum, item) => sum + item.price, 0))}
            </span>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {savedItems.map((item) => (
              <ClothingCard
                key={item.id}
                item={item}
                isSaved={true}
                onSaveToggle={() => handleRemove(item.id)}
                userColors={colorAnalysis?.best_colors}
                userSeason={colorAnalysis?.season}
              />
            ))}
          </div>
        </>
      ) : (
        /* Empty state */
        <Card className="border-border/50">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No saved items yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Browse the wardrobe and save items you love to build your personalized collection.
            </p>
            <Button asChild>
              <Link href="/dashboard/wardrobe">
                <Shirt className="mr-2 h-4 w-4" />
                Browse Wardrobe
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

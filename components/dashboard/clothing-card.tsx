'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ClothingItem, Season } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heart, ExternalLink, Sparkles, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClothingCardProps {
  item: ClothingItem
  isSaved: boolean
  onSaveToggle: (itemId: string) => void
  userColors?: string[]
  userSeason?: Season
  onTryOn?: (item: ClothingItem) => void
}

export function ClothingCard({ 
  item, 
  isSaved, 
  onSaveToggle, 
  userColors = [],
  userSeason,
  onTryOn
}: ClothingCardProps) {
  const [imageError, setImageError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // Check if item matches user's season
  const isSeasonMatch = userSeason && item.seasons.includes(userSeason)
  
  // Format price
  const formattedPrice = new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: item.currency,
    minimumFractionDigits: 0,
  }).format(item.price)

  return (
    <Card 
      className={cn(
        'group border-border/50 overflow-hidden transition-all duration-200 hover:border-primary/50 hover:shadow-lg',
        isSeasonMatch && 'ring-1 ring-primary/30'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-[4/5] bg-secondary/50 overflow-hidden">
        {/* Image */}
        {!imageError ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary">
            <span className="text-muted-foreground text-sm">{item.brand}</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {item.is_trending && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
              <TrendingUp className="w-3 h-3" />
              Trending
            </span>
          )}
          {isSeasonMatch && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-medium">
              <Sparkles className="w-3 h-3" />
              Your Season
            </span>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={(e) => {
            e.preventDefault()
            onSaveToggle(item.id)
          }}
          className={cn(
            'absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all',
            isSaved 
              ? 'bg-destructive text-destructive-foreground' 
              : 'bg-background/80 hover:bg-background text-foreground'
          )}
        >
          <Heart className={cn('w-4 h-4', isSaved && 'fill-current')} />
        </button>

        {/* Hover overlay with actions */}
        <div className={cn(
          'absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent transition-opacity duration-200',
          isHovered ? 'opacity-100' : 'opacity-0'
        )}>
          <div className="flex gap-2">
            {onTryOn && (
              <Button 
                size="sm" 
                variant="secondary"
                className="flex-1 text-xs"
                onClick={() => onTryOn(item)}
              >
                Try On
              </Button>
            )}
            {item.product_url && (
              <Button 
                size="sm" 
                variant="secondary"
                className="flex-1 text-xs"
                asChild
              >
                <a href={item.product_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  View
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      <CardContent className="p-3">
        {/* Brand */}
        <p className="text-xs text-muted-foreground mb-0.5">{item.brand}</p>
        
        {/* Name */}
        <h3 className="font-medium text-sm leading-tight line-clamp-2 mb-2">
          {item.name}
        </h3>

        {/* Colors */}
        <div className="flex items-center gap-1 mb-2">
          {item.colors.slice(0, 4).map((color, index) => (
            <div
              key={index}
              className="w-4 h-4 rounded-full border border-border/50"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
          {item.colors.length > 4 && (
            <span className="text-xs text-muted-foreground">+{item.colors.length - 4}</span>
          )}
        </div>

        {/* Price */}
        <p className="font-semibold">{formattedPrice}</p>
      </CardContent>
    </Card>
  )
}

'use client'

import { ColorAnalysis } from '@/lib/types'

interface ColorPaletteDisplayProps {
  analysis: ColorAnalysis
}

export function ColorPaletteDisplay({ analysis }: ColorPaletteDisplayProps) {
  return (
    <div className="space-y-4">
      {/* Best Colors */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Your Best Colors</h4>
        <div className="flex flex-wrap gap-2">
          {analysis.best_colors.map((color, index) => (
            <div
              key={index}
              className="group relative"
            >
              <div
                className="w-12 h-12 rounded-lg border border-border/50 shadow-sm transition-transform hover:scale-110 cursor-pointer"
                style={{ backgroundColor: color }}
                title={color}
              />
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-popover px-2 py-1 rounded shadow-lg">
                {color}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Eye-enhancing Colors */}
      {analysis.eye_enhancing_colors.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Colors That Enhance Your Eyes
          </h4>
          <div className="flex flex-wrap gap-2">
            {analysis.eye_enhancing_colors.map((color, index) => (
              <div
                key={index}
                className="group relative"
              >
                <div
                  className="w-10 h-10 rounded-lg border border-border/50 shadow-sm transition-transform hover:scale-110 cursor-pointer"
                  style={{ backgroundColor: color }}
                  title={color}
                />
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-popover px-2 py-1 rounded shadow-lg">
                  {color}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Colors to Avoid */}
      {analysis.avoid_colors.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Colors to Avoid
          </h4>
          <div className="flex flex-wrap gap-2">
            {analysis.avoid_colors.map((color, index) => (
              <div
                key={index}
                className="group relative"
              >
                <div
                  className="w-8 h-8 rounded-lg border border-border/50 opacity-60 transition-transform hover:scale-110 cursor-pointer relative overflow-hidden"
                  style={{ backgroundColor: color }}
                  title={color}
                >
                  {/* Strikethrough effect */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-0.5 bg-destructive rotate-45 transform origin-center" />
                  </div>
                </div>
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-popover px-2 py-1 rounded shadow-lg">
                  {color}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

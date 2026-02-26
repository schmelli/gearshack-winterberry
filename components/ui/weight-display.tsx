"use client"

import * as React from "react"
import { ArrowLeftRight } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { useWeightConversion } from "@/hooks/useWeightConversion"
import { useAuth } from "@/hooks/useAuth"
import type { WeightUnit } from "@/types/gear"

// =============================================================================
// Types
// =============================================================================

export interface WeightDisplayProps {
  /** Weight value in grams (normalized storage format) */
  value: number
  /** Show inline toggle button to switch display units */
  showToggle?: boolean
  /** Additional CSS classes */
  className?: string
}

// =============================================================================
// Component
// =============================================================================

/**
 * WeightDisplay Component
 *
 * Feature: 012-automatic-unit-conversion
 * Task: subtask-4-2
 *
 * Displays weight values with user preference support, inline unit toggle,
 * and hover tooltip showing alternative units.
 *
 * @example
 * ```tsx
 * // Simple display (uses user's preferred unit)
 * <WeightDisplay value={1000} />
 *
 * // With toggle button
 * <WeightDisplay value={1000} showToggle />
 *
 * // Custom styling
 * <WeightDisplay value={1000} className="text-lg font-bold" />
 * ```
 */
export function WeightDisplay({
  value,
  showToggle = false,
  className,
}: WeightDisplayProps) {
  const t = useTranslations('WeightDisplay')
  const { user } = useAuth()
  const { preferredUnit, formatForDisplay } = useWeightConversion(user?.id ?? null)

  // Local state for current display unit (resets to preference on reload)
  const [displayUnit, setDisplayUnit] = React.useState<WeightUnit>(preferredUnit)

  // Reset display unit when user preference changes
  React.useEffect(() => {
    setDisplayUnit(preferredUnit)
  }, [preferredUnit])

  // Cycle through units: g → oz → lb → g
  const cycleUnit = React.useCallback(() => {
    setDisplayUnit((current) => {
      if (current === 'g') return 'oz'
      if (current === 'oz') return 'lb'
      return 'g'
    })
  }, [])

  // Format weight for current display unit
  const formattedWeight = formatForDisplay(value, displayUnit)

  // Build tooltip content with alternative units
  const tooltipContent = React.useMemo(() => {
    const units: WeightUnit[] = ['g', 'oz', 'lb']
    const alternatives = units
      .filter((unit) => unit !== displayUnit)
      .map((unit) => formatForDisplay(value, unit))
      .join(' / ')

    return alternatives
  }, [value, displayUnit, formatForDisplay])

  return (
    <div
      data-slot="weight-display"
      className={cn("inline-flex items-center gap-2", className)}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help font-medium tabular-nums">
            {formattedWeight}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={4}>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs opacity-70">{t('also')}</span>
            <span className="font-medium">{tooltipContent}</span>
          </div>
        </TooltipContent>
      </Tooltip>

      {showToggle && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={cycleUnit}
          aria-label={t('toggleUnit')}
          className="size-7 shrink-0"
        >
          <ArrowLeftRight className="size-3.5" />
        </Button>
      )}
    </div>
  )
}

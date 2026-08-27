import { useRef } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/cn'

// Shared default palette — 20 curated colors instead of the old 8.
// Reused anywhere a user picks a color for an account, card, category,
// goal, etc. Pass a different `colors` array to override per-feature.
export const DEFAULT_PICKER_COLORS: string[] = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#4f7fff',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#e2136e', '#8c3494', '#64748b',
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  colors?: string[]
  className?: string
}

export function ColorPicker({ value, onChange, colors = DEFAULT_PICKER_COLORS, className }: ColorPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isCustom = !colors.includes(value)

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Use color ${c}`}
          className={cn(
            'h-8 w-8 rounded-full border-2 transition-transform active:scale-90',
            value === c ? 'border-foreground' : 'border-transparent'
          )}
          style={{ backgroundColor: c }}
        />
      ))}

      {/* Custom color swatch — shows the current custom color if one is picked,
          otherwise a neutral "+" trigger. Clicking either opens the native
          OS color picker, which works reliably across mobile and desktop
          without shipping a custom picker UI. */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        aria-label="Pick a custom color"
        className={cn(
          'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-transform active:scale-90',
          isCustom ? 'border-foreground' : 'border-dashed border-border'
        )}
        style={isCustom ? { backgroundColor: value } : undefined}
      >
        {!isCustom && <Plus className="h-4 w-4 text-muted-foreground" />}
        <input
          ref={fileInputRef}
          type="color"
          value={isCustom ? value : '#5046e5'}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-hidden="true"
          tabIndex={-1}
        />
      </button>
    </div>
  )
}
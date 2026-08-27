import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAppTheme } from '../useAppTheme'
import type { AppSettings } from '@/types/entities'

const OPTIONS: { value: AppSettings['theme']; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export function ThemeSection() {
  const { theme, isLoading, setTheme } = useAppTheme()

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Appearance</p>
        <p className="text-xs text-muted-foreground">Choose how the app looks</p>
      </div>
      <div className="flex rounded-xl border border-border bg-surface-elevated p-1">
        {OPTIONS.map(({ value, label, icon: Icon }) => {
          const active = theme === value
          return (
            <button
              key={value}
              onClick={() => setTheme(value)}
              disabled={isLoading}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors disabled:opacity-50',
                active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
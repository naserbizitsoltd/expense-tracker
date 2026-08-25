import { BottomSheet } from '@/components/ui'
import { CATEGORY_ICON_GROUPS, getCategoryIcon } from '../categoryConfig'
import { cn } from '@/lib/cn'

interface IconPickerProps {
  open: boolean
  onClose: () => void
  value: string
  color: string
  onSelect: (icon: string) => void
}

export function IconPicker({ open, onClose, value, color, onSelect }: IconPickerProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Choose an icon">
      <div className="flex max-h-[55vh] flex-col gap-5 overflow-y-auto pr-0.5">
        {CATEGORY_ICON_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-2">
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</p>
            <div className="grid grid-cols-5 gap-2">
              {group.icons.map((name) => {
                const Icon = getCategoryIcon(name)
                const active = value === name
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      onSelect(name)
                      onClose()
                    }}
                    aria-label={name}
                    className={cn(
                      'flex aspect-square items-center justify-center rounded-2xl border transition-all duration-150 active:scale-95',
                      active ? 'border-primary bg-primary-muted' : 'border-border bg-surface-elevated hover:border-primary/40'
                    )}
                  >
                    <Icon className="h-5 w-5" style={{ color: active ? color : undefined }} />
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </BottomSheet>
  )
}
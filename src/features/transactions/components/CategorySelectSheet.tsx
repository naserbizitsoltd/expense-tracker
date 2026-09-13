import { BottomSheet } from './BottomSheet'
import { CategoryIcon } from '@/lib/lucideIcon'
import { useCategoriesByType } from '../useTransactions'
import type { Category, CategoryType } from '@/types/entities'

interface CategorySelectSheetProps {
  open: boolean
  onClose: () => void
  onSelect: (category: Category) => void
  type?: CategoryType
  title?: string
}

export function CategorySelectSheet({
  open,
  onClose,
  onSelect,
  type = 'expense',
  title = 'Choose a category',
}: CategorySelectSheetProps) {
  const { categories, isLoading } = useCategoriesByType(type)

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading categories…</p>}

      {!isLoading && categories.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No {type} categories yet. Add one from Categories first.
        </p>
      )}

      <div className="grid grid-cols-3 gap-3 pb-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => {
              onSelect(category)
              onClose()
            }}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface-elevated px-2 py-4 text-center active:scale-95 transition-transform"
          >
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${category.color}26` }}
            >
              <CategoryIcon name={category.icon} size={20} color={category.color} />
            </span>
            <span className="line-clamp-2 break-words text-xs font-medium leading-snug text-foreground">
              {category.name}
            </span>
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}
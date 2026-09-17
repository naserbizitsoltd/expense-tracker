import { useEffect, useMemo, useState } from 'react'
import { BottomSheet } from './BottomSheet'
import { SearchInput } from '@/components/ui'
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
  const [query, setQuery] = useState('')

  // Reset the filter each time the sheet opens, and whenever the caller
  // switches type (expense <-> income) so a stale query can't hide everything.
  useEffect(() => {
    if (open) setQuery('')
  }, [open, type])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return categories
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q)
    )
  }, [categories, query])

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      {!isLoading && categories.length > 0 && (
        // Sticky so the search box stays reachable while the grid scrolls.
        // -mx-5/px-5 cancels the sheet body padding so the blur covers edge to edge.
        <div className="sticky -top-4 z-10 -mx-5 -mt-4 mb-3 bg-surface-elevated px-5 pb-3 pt-4">
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery('')}
            placeholder="Search categories…"
            enterKeyHint="search"
          />
        </div>
      )}

      {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading categories…</p>}

      {!isLoading && categories.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No {type} categories yet. Add one from Categories first.
        </p>
      )}

      {!isLoading && categories.length > 0 && filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No category matches “{query.trim()}”.
        </p>
      )}

      <div className="grid grid-cols-3 gap-3 pb-2">
        {filtered.map((category) => (
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
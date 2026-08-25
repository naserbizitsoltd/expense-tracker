import { getCategoryIcon } from '../categoryConfig'
import { Avatar, Badge } from '@/components/ui'
import type { Category } from '@/types/entities'

interface CategoryListItemProps {
  category: Category
  usageCount: number
  onClick: () => void
}

export function CategoryListItem({ category, usageCount, onClick }: CategoryListItemProps) {
  const Icon = getCategoryIcon(category.icon)

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left transition-colors active:bg-surface-elevated"
    >
      <Avatar icon={<Icon className="h-5 w-5" />} color={category.color} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{category.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {usageCount > 0
            ? `${usageCount} transaction${usageCount === 1 ? '' : 's'}`
            : category.description || 'No transactions yet'}
        </p>
      </div>
      {!category.isActive && <Badge variant="warning">Archived</Badge>}
    </button>
  )
}
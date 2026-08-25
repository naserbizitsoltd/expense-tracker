import { useMemo, useState } from 'react'
import { Plus, Tags, Archive } from 'lucide-react'
import { AppShell } from '@/layouts/AppShell'
import { Button, BottomSheet, SearchInput, EmptyState, LoadingState } from '@/components/ui'
import { useCategories, useCategoryUsageMap } from '../useCategories'
import { CategoryForm } from '../components/CategoryForm'
import { CategoryListItem } from '../components/CategoryListItem'
import { CategoryActionsSheet } from '../components/CategoryActionsSheet'
import { cn } from '@/lib/cn'
import type { Category, CategoryType } from '@/types/entities'

interface CategoriesPageProps {
  onBack: () => void
}

export function CategoriesPage({ onBack }: CategoriesPageProps) {
  const { activeCategories, archivedCategories, expenseCount, incomeCount, isLoading } = useCategories()
  const usageMap = useCategoryUsageMap()

  const [tab, setTab] = useState<CategoryType>('expense')
  const [showArchived, setShowArchived] = useState(false)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [selected, setSelected] = useState<Category | null>(null)

  const source = showArchived ? archivedCategories : activeCategories
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return source
      .filter((c) => c.type === tab)
      .filter((c) => !query || c.name.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [source, tab, search])

  return (
    <AppShell
      title="Categories"
      subtitle={`${expenseCount} expense · ${incomeCount} income`}
      headerBack={onBack}
      fab={
        !showArchived && (
          <Button size="lg" className="h-14 w-14 rounded-full p-0 shadow-lg" aria-label="Add category" onClick={() => setAddOpen(true)}>
            <Plus className="h-6 w-6" />
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex rounded-xl border border-border bg-surface-elevated p-1">
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-all duration-150',
                tab === t ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <SearchInput
          placeholder="Search categories"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
        />

        <button
          onClick={() => setShowArchived((v) => !v)}
          className={cn(
            'flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            showArchived ? 'border-primary bg-primary-muted text-primary' : 'border-border text-muted-foreground'
          )}
        >
          <Archive className="h-3.5 w-3.5" />
          {showArchived ? 'Showing archived' : 'Show archived'}
        </button>

        {isLoading && <LoadingState label="Loading categories..." />}

        {!isLoading && filtered.length === 0 && (
          <EmptyState
            icon={<Tags className="h-6 w-6" />}
            title={showArchived ? 'No archived categories' : 'No custom categories yet'}
            description={
              showArchived
                ? 'Categories you archive will show up here.'
                : 'Create categories that match the way you manage your money.'
            }
            action={!showArchived && <Button onClick={() => setAddOpen(true)}>Add Category</Button>}
          />
        )}

        <div className="flex flex-col gap-2">
          {filtered.map((category) => (
            <CategoryListItem
              key={category.id}
              category={category}
              usageCount={usageMap[category.id] ?? 0}
              onClick={() => setSelected(category)}
            />
          ))}
        </div>
      </div>

      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="Add Category">
        <CategoryForm defaultType={tab} onDone={() => setAddOpen(false)} />
      </BottomSheet>

      <CategoryActionsSheet
        category={selected}
        usageCount={selected ? usageMap[selected.id] ?? 0 : 0}
        onClose={() => setSelected(null)}
      />
    </AppShell>
  )
}
import { useMemo } from 'react'
import { categoryRepository, useLiveQuery } from '@/db'
import type { CategoryType } from '@/types/entities'

export function useCategories() {
  const { data, error, isLoading } = useLiveQuery(() => categoryRepository.getAll(), [])

  const categories = data ?? []
  const activeCategories = useMemo(() => categories.filter((c) => c.isActive), [categories])
  const archivedCategories = useMemo(() => categories.filter((c) => !c.isActive), [categories])

  const countByType = (type: CategoryType) =>
    activeCategories.filter((c) => c.type === type).length

  return {
    categories,
    activeCategories,
    archivedCategories,
    expenseCount: countByType('expense'),
    incomeCount: countByType('income'),
    isLoading,
    error,
  }
}

// Reactive map of categoryId -> transaction count. Re-runs whenever
// transactions or categories change, so usage counts and the delete/
// archive decision they drive stay live.
export function useCategoryUsageMap(): Record<string, number> {
  const { data } = useLiveQuery(() => categoryRepository.getUsageCounts(), [])
  return data ?? {}
}
import { useMemo } from 'react'
import { recurringTransactionRepository, categoryRepository, accountRepository, useLiveQuery } from '@/db'
import type { RecurringTransaction } from '@/types/entities'

export interface RecurringListItem {
  rule: RecurringTransaction
  categoryName: string | undefined
  categoryIcon: string | undefined
  categoryColor: string | undefined
  accountName: string | undefined
}

export function useRecurringList() {
  const rulesState = useLiveQuery(() => recurringTransactionRepository.getAll(), [])
  const categoriesState = useLiveQuery(() => categoryRepository.getAll(), [])
  const accountsState = useLiveQuery(() => accountRepository.getAll(), [])

  const items: RecurringListItem[] = useMemo(() => {
    const categoriesById = new Map((categoriesState.data ?? []).map((c) => [c.id, c]))
    const accountsById = new Map((accountsState.data ?? []).map((a) => [a.id, a]))
    return (rulesState.data ?? [])
      .map((rule) => {
        const category = rule.categoryId ? categoriesById.get(rule.categoryId) : undefined
        return {
          rule,
          categoryName: category?.name,
          categoryIcon: category?.icon,
          categoryColor: category?.color,
          accountName: accountsById.get(rule.accountId)?.name,
        }
      })
      .sort((a, b) => a.rule.nextRunDate - b.rule.nextRunDate)
  }, [rulesState.data, categoriesState.data, accountsState.data])

  return {
    items,
    expenseItems: items.filter((i) => i.rule.templateType === 'expense'),
    incomeItems: items.filter((i) => i.rule.templateType === 'income'),
    isLoading: rulesState.isLoading || categoriesState.isLoading || accountsState.isLoading,
    error: rulesState.error ?? categoriesState.error ?? accountsState.error,
  }
}
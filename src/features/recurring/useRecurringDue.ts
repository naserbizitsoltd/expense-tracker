import { useMemo } from 'react'
import { useLiveQuery, categoryRepository, accountRepository } from '@/db'
import { getDueRecurringItems, type DueRecurringItem } from '@/services/recurringService'
import type { RecurringTransaction } from '@/types/entities'

export interface RecurringDueRow {
  rule: RecurringTransaction
  occurrenceDate: number
  insufficientBalance: boolean
  accountName: string | undefined
  categoryName: string | undefined
}

/** Reactive list of active recurring rules that are due right now. */
export function useRecurringDue() {
  const dueState = useLiveQuery(() => getDueRecurringItems(), [])
  const accountsState = useLiveQuery(() => accountRepository.getAll(), [])
  const categoriesState = useLiveQuery(() => categoryRepository.getAll(), [])

  const rows: RecurringDueRow[] = useMemo(() => {
    const accountsById = new Map((accountsState.data ?? []).map((a) => [a.id, a]))
    const categoriesById = new Map((categoriesState.data ?? []).map((c) => [c.id, c]))
    return ((dueState.data ?? []) as DueRecurringItem[])
      .map((item) => ({
        rule: item.rule,
        occurrenceDate: item.occurrenceDate,
        insufficientBalance: item.insufficientBalance,
        accountName: accountsById.get(item.rule.accountId)?.name,
        categoryName: item.rule.categoryId ? categoriesById.get(item.rule.categoryId)?.name : undefined,
      }))
      .sort((a, b) => a.occurrenceDate - b.occurrenceDate)
  }, [dueState.data, accountsState.data, categoriesState.data])

  return {
    rows,
    isLoading: dueState.isLoading || accountsState.isLoading || categoriesState.isLoading,
  }
}
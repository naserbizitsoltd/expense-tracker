import { useMemo } from 'react'
import { useLiveQuery, budgetRepository, categoryRepository, transactionRepository } from '@/db'
import { getCurrentBudgetWindow, computeBudgetProgress, type BudgetStatus } from '@/services/budgetService'
import type { Budget, Transaction } from '@/types/entities'

export interface BudgetWithProgress {
  budget: Budget
  categoryName: string | null
  categoryIcon: string | null
  categoryColor: string | null
  spent: number
  remaining: number
  percentUsed: number
  status: BudgetStatus
  windowStart: number
  windowEnd: number
}

/**
 * Reactive, joined list of every budget with live spend progress.
 * Expense transactions are fetched via the existing type index
 * (transactionRepository.getByType) rather than the whole
 * transactions table, and Dexie's live query reruns this automatically
 * whenever any transaction is added, edited, or deleted.
 */
export function useBudgetsWithProgress() {
  const budgetsState = useLiveQuery(() => budgetRepository.getAll(), [])
  const categoriesState = useLiveQuery(() => categoryRepository.getAll(), [])
  const expensesState = useLiveQuery(() => transactionRepository.getByType('expense'), [])

  const items: BudgetWithProgress[] = useMemo(() => {
    const categoriesById = new Map((categoriesState.data ?? []).map((c) => [c.id, c]))
    const expenses = expensesState.data ?? []

    return (budgetsState.data ?? []).map((budget) => {
      const category = budget.categoryId ? categoriesById.get(budget.categoryId) : undefined
      const window = getCurrentBudgetWindow(budget)
      const progress = computeBudgetProgress(budget, expenses, window)
      return {
        budget,
        categoryName: category?.name ?? (budget.categoryId ? null : 'All Expenses'),
        categoryIcon: category?.icon ?? null,
        categoryColor: category?.color ?? null,
        ...progress,
        windowStart: window.start,
        windowEnd: window.end,
      }
    })
  }, [budgetsState.data, categoriesState.data, expensesState.data])

    return {
    items,
    isLoading: budgetsState.isLoading || categoriesState.isLoading || expensesState.isLoading,
    error: budgetsState.error ?? categoriesState.error ?? expensesState.error,
  }
}

export interface BudgetDetails extends BudgetWithProgress {
  relatedExpenses: Transaction[] // expenses inside the current window that count toward this budget, newest first
}

/**
 * Same live progress as useBudgetsWithProgress, scoped to one budget,
 * plus the actual expense transactions counted in its current window
 * — powers the Budget Details view's "related expenses" list from
 * real transaction data (never a second, separately-tracked list).
 */
export function useBudgetDetails(budgetId: string | null) {
  const { items, isLoading, error } = useBudgetsWithProgress()
  const expensesState = useLiveQuery(() => transactionRepository.getByType('expense'), [])

  const details: BudgetDetails | null = useMemo(() => {
    const item = items.find((i) => i.budget.id === budgetId)
    if (!item) return null
    const expenses = expensesState.data ?? []
    const relatedExpenses = expenses
      .filter((t) => t.date >= item.windowStart && t.date <= item.windowEnd)
      .filter((t) => item.budget.categoryId === null || t.categoryId === item.budget.categoryId)
      .sort((a, b) => b.date - a.date)
    return { ...item, relatedExpenses }
  }, [items, expensesState.data, budgetId])

  return { details, isLoading: isLoading || expensesState.isLoading, error }
}
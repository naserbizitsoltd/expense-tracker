// Budget calculation engine: computes each budget's current tracking
// window and its spent/remaining/status from REAL expense
// transactions. Never reads or writes fake data, and never touches
// income/transfer transactions — callers must already have filtered
// to type === 'expense'.

import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import type { Budget, Transaction } from '@/types/entities'

export type BudgetStatus = 'safe' | 'warning' | 'near_limit' | 'exceeded'

export interface BudgetWindow {
  start: number
  end: number
}

/**
 * The [start, end] window a budget is currently tracking.
 * - weekly/monthly/yearly periods are anchored to calendar boundaries
 *   containing "now" (predictable resets, not rolling anniversaries).
 * - 'custom' periods use the budget's own start/end date directly.
 * In every case the window is clamped to the budget's own startDate
 * and (if set) endDate, so a budget never tracks spend outside the
 * range the user actually configured.
 */
export function getCurrentBudgetWindow(budget: Budget, now: number = Date.now()): BudgetWindow {
  let windowStart: number
  let windowEnd: number

  switch (budget.period) {
    case 'weekly':
      windowStart = startOfWeek(now, { weekStartsOn: 1 }).getTime()
      windowEnd = endOfWeek(now, { weekStartsOn: 1 }).getTime()
      break
    case 'monthly':
      windowStart = startOfMonth(now).getTime()
      windowEnd = endOfMonth(now).getTime()
      break
    case 'yearly':
      windowStart = startOfYear(now).getTime()
      windowEnd = endOfYear(now).getTime()
      break
    case 'custom':
    default:
      windowStart = budget.startDate
      windowEnd = budget.endDate ?? now
      break
  }

  const start = Math.max(windowStart, budget.startDate)
  const end = budget.endDate !== null ? Math.min(windowEnd, budget.endDate) : windowEnd
  return { start, end: Math.max(start, end) }
}

export function budgetStatus(percentUsed: number): BudgetStatus {
  if (percentUsed > 100) return 'exceeded'
  if (percentUsed >= 90) return 'near_limit'
  if (percentUsed >= 70) return 'warning'
  return 'safe'
}

/**
 * Sums real expense transactions that fall within the budget's
 * current window and match its category — or every expense category
 * for an "overall" budget where categoryId is null. Callers must pass
 * only type === 'expense' transactions; income and transfers must
 * never reach this function.
 */
export function computeBudgetProgress(
  budget: Budget,
  expenseTransactions: Transaction[],
  window: BudgetWindow
): { spent: number; remaining: number; percentUsed: number; status: BudgetStatus } {
  const spent = expenseTransactions.reduce((total, t) => {
    if (t.date < window.start || t.date > window.end) return total
    if (budget.categoryId !== null && t.categoryId !== budget.categoryId) return total
    return total + t.amount
  }, 0)

  const remaining = budget.amount - spent
  const percentUsed = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0

  return { spent, remaining, percentUsed, status: budgetStatus(percentUsed) }
}
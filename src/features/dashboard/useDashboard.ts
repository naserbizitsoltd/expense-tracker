import { useMemo } from 'react'
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'
import { transactionRepository } from '@/db'
import { useLiveQuery } from '@/db'
import { useAccounts } from '@/features/accounts/useAccounts'
import { useLoans } from '@/features/loans/useLoans'
import { useDepositsOverview, type UpcomingDepositEvent } from '@/features/deposits/useDepositsOverview'
import { useBudgetsWithProgress } from '@/features/budgets/useBudgets'
import { useGoalsList } from '@/features/goals/useGoals'
import { useCreditCards } from '@/features/credit-cards/useCreditCards'
import { useDebitCards } from '@/features/debit-cards/useDebitCards'
import { useTransactionsList } from '@/features/transactions/useTransactions'
import { useRecurringList } from '@/features/recurring/useRecurring'
import { APP_CONFIG } from '@/config/app.config'
import type { Transaction, TransactionType } from '@/types/entities'
import type { CurrencyCode } from '@/types/money'

export interface PeriodSummary {
  income: number
  expense: number
  net: number
}

export interface UpcomingEvent {
  id: string
  label: string
  date: number
  amount: number | null
  currency: CurrencyCode
  kind: UpcomingDepositEvent['kind'] | 'recurring'
}

const RECURRING_TYPE_LABEL: Partial<Record<TransactionType, string>> = {
  income: 'Income',
  expense: 'Expense',
  transfer: 'Transfer',
  loan: 'Loan EMI',
  dps: 'DPS',
  fdr: 'FDR',
  credit_card: 'Card Payment',
}

/** Sums only real income/expense transactions (never transfers, loan, dps, fdr, or goal adjustments) in the default currency, for a date range. */
function summarizePeriod(transactions: Transaction[]): PeriodSummary {
  let income = 0
  let expense = 0
  for (const t of transactions) {
    if (t.currency !== APP_CONFIG.defaultCurrency) continue
    if (t.type === 'income') income += t.amount
    else if (t.type === 'expense') expense += t.amount
  }
  return { income, expense, net: income - expense }
}

/**
 * Composes every existing reactive hook the app already has into a single
 * dashboard view-model. Nothing here recomputes a balance or duplicates a
 * calculation already owned by balanceService / loanService / dpsService /
 * fdrService / budgetService / goalService — it only reads their already-
 * derived, currency-filtered totals and combines them for display. Every
 * piece rides Dexie's live query (via the underlying hooks), so the whole
 * dashboard updates automatically after any transaction, loan, DPS, FDR,
 * goal, budget, or card change — no polling, no manual refresh.
 */
export function useDashboard() {
  const accounts = useAccounts()
  const loans = useLoans()
  const deposits = useDepositsOverview()
  const budgets = useBudgetsWithProgress()
  const goals = useGoalsList()
  const creditCards = useCreditCards()
  const debitCards = useDebitCards()
  const transactionsList = useTransactionsList()
  const recurring = useRecurringList()

  const now = Date.now()
  const todayRange = useMemo(() => ({ start: startOfDay(now).getTime(), end: endOfDay(now).getTime() }), [now])
  const monthRange = useMemo(() => ({ start: startOfMonth(now).getTime(), end: endOfMonth(now).getTime() }), [now])

  const todayState = useLiveQuery(
    () => transactionRepository.getByDateRange(todayRange.start, todayRange.end),
    [todayRange.start, todayRange.end]
  )
  const monthState = useLiveQuery(
    () => transactionRepository.getByDateRange(monthRange.start, monthRange.end),
    [monthRange.start, monthRange.end]
  )

  const today = useMemo(() => summarizePeriod(todayState.data ?? []), [todayState.data])
  const month = useMemo(() => summarizePeriod(monthState.data ?? []), [monthState.data])

  // Money set aside in active goals has already left the account ledger
  // (see goalService.ts) so it must be added back in as an asset here —
  // it is never summed into Total Available Money anywhere else.
  const goalsTotal = useMemo(
    () =>
      goals.activeItems
        .filter((i) => i.goal.currency === APP_CONFIG.defaultCurrency)
        .reduce((sum, i) => sum + i.goal.currentAmount, 0),
    [goals.activeItems]
  )

  // Net worth = liquid cash + locked/earmarked savings + what others owe you
  //           − what you owe − credit card outstanding.
  // Every term below is an already-derived, currency-filtered total from
  // its own owning hook/service — nothing is recomputed from the ledger here.
  const netWorth =
    accounts.totalBalance +
    deposits.totalDeposits +
    loans.totalReceivable +
    goalsTotal -
    loans.totalBorrowedOutstanding -
    creditCards.totalOutstanding

  const topAccounts = useMemo(
    () => [...accounts.activeAccounts].sort((a, b) => b.balance - a.balance).slice(0, 4),
    [accounts.activeAccounts]
  )

  const recentTransactions = useMemo(() => (transactionsList.items ?? []).slice(0, 6), [transactionsList.items])

  const upcomingEvents = useMemo<UpcomingEvent[]>(() => {
    const fromDeposits: UpcomingEvent[] = deposits.upcomingEvents.map((e) => ({
      id: e.id,
      label: e.label,
      date: e.date,
      amount: e.amount,
      currency: e.currency,
      kind: e.kind,
    }))

    const fromRecurring: UpcomingEvent[] = recurring.items
      .filter((i) => i.rule.isActive)
      .map((i) => ({
        id: `recurring-${i.rule.id}`,
        label: i.rule.note || i.categoryName || RECURRING_TYPE_LABEL[i.rule.templateType] || 'Recurring',
        date: i.rule.nextRunDate,
        amount: i.rule.amount,
        currency: i.rule.currency,
        kind: 'recurring' as const,
      }))

    return [...fromDeposits, ...fromRecurring].sort((a, b) => a.date - b.date).slice(0, 5)
  }, [deposits.upcomingEvents, recurring.items])

  return {
    totalAvailable: accounts.totalBalance,
    netWorth,
    today,
    month,
    topAccounts,
    accountsLoading: accounts.isLoading,
    accountsError: accounts.error,

    loans,
    deposits,
    budgets: budgets.items,
    budgetsLoading: budgets.isLoading,
    goals: goals.activeItems,
    goalsLoading: goals.isLoading,
    creditCards,
    debitCards,

    recentTransactions,
    transactionsLoading: transactionsList.isLoading,
    transactionsError: transactionsList.error,

    upcomingEvents,

    isLoading: accounts.isLoading || todayState.isLoading || monthState.isLoading,
  }
}
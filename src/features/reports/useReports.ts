import { useMemo, useState } from 'react'
import { differenceInCalendarDays } from 'date-fns'
import {
  useLiveQuery,
  transactionRepository,
  categoryRepository,
  accountRepository,
  loanRepository,
  loanRepaymentRepository,
  dpsContributionRepository,
  fdrRepository,
  fdrPayoutRepository,
} from '@/db'
import {
  getReportRange,
  summarizeIncomeExpense,
  computeSavingsRate,
  expenseByCategory,
  incomeByCategory,
  accountFlow,
  monthlyTrend,
  computeDailyExpense,
  highestSpendingDay,
  summarizeLoans,
  summarizeDeposits,
  creditCardSpending,
  type ReportPeriodOption,
} from './reportsService'
import type { TransactionType } from '@/types/entities'

export interface ReportFilters {
  accountId: string | null
  categoryId: string | null
  type: Extract<TransactionType, 'income' | 'expense' | 'transfer'> | null
}

const DEFAULT_FILTERS: ReportFilters = { accountId: null, categoryId: null, type: null }

/**
 * Composes Reports entirely from data other services already own — no
 * balance or ledger math happens here. One live query per underlying
 * table (transactions for the period, plus the small loan/DPS/FDR audit
 * tables), everything downstream is a useMemo derivation over data
 * already in memory, so filters and period changes never trigger a new
 * database scan on their own — only a period or filter change re-runs
 * the memos, and any real transaction/loan/DPS/FDR write re-fires the
 * underlying live queries automatically (Dexie liveQuery), so Reports
 * updates instantly with no polling.
 */
export function useReports() {
  const [period, setPeriod] = useState<ReportPeriodOption>('this_month')
  const [customStart, setCustomStart] = useState<number | null>(null)
  const [customEnd, setCustomEnd] = useState<number | null>(null)
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS)

  const range = useMemo(() => getReportRange(period, customStart, customEnd), [period, customStart, customEnd])

  const transactionsState = useLiveQuery(
    () => transactionRepository.getByDateRange(range.start, range.end),
    [range.start, range.end]
  )
  const categoriesState = useLiveQuery(() => categoryRepository.getAll(), [])
  const accountsState = useLiveQuery(() => accountRepository.getAll(), [])
  const loansState = useLiveQuery(() => loanRepository.getAll(), [])
  const loanRepaymentsState = useLiveQuery(() => loanRepaymentRepository.getAll(), [])
  const dpsContributionsState = useLiveQuery(() => dpsContributionRepository.getAll(), [])
  const fdrsState = useLiveQuery(() => fdrRepository.getAll(), [])
  const fdrPayoutsState = useLiveQuery(() => fdrPayoutRepository.getAll(), [])

  const categoriesById = useMemo(() => new Map((categoriesState.data ?? []).map((c) => [c.id, c])), [categoriesState.data])
  const accountsById = useMemo(() => new Map((accountsState.data ?? []).map((a) => [a.id, a])), [accountsState.data])

  // Filters applied once, on top of the already-fetched period window —
  // every section below reads from this single filtered list.
  const filteredTransactions = useMemo(() => {
    const all = transactionsState.data ?? []
    if (!filters.accountId && !filters.categoryId && !filters.type) return all
    return all.filter((t) => {
      if (filters.accountId && t.accountId !== filters.accountId && t.toAccountId !== filters.accountId) return false
      if (filters.categoryId && t.categoryId !== filters.categoryId) return false
      if (filters.type && t.type !== filters.type) return false
      return true
    })
  }, [transactionsState.data, filters])

  const summary = useMemo(() => summarizeIncomeExpense(filteredTransactions), [filteredTransactions])
  const savingsRate = useMemo(() => computeSavingsRate(summary.income, summary.expense), [summary])
  const trend = useMemo(() => monthlyTrend(filteredTransactions, range), [filteredTransactions, range])
  const expenseCategories = useMemo(
    () => expenseByCategory(filteredTransactions, categoriesById),
    [filteredTransactions, categoriesById]
  )
  const incomeSources = useMemo(
    () => incomeByCategory(filteredTransactions, categoriesById),
    [filteredTransactions, categoriesById]
  )
  const flow = useMemo(() => accountFlow(filteredTransactions, accountsById), [filteredTransactions, accountsById])
  const daily = useMemo(() => computeDailyExpense(filteredTransactions, range), [filteredTransactions, range])
  const highestDay = useMemo(() => highestSpendingDay(daily.points), [daily])
  const spanDays = useMemo(() => differenceInCalendarDays(range.end, range.start) + 1, [range])
  const averageDailyExpense = spanDays > 0 ? Math.round(summary.expense / spanDays) : 0
  const ccSpending = useMemo(() => creditCardSpending(filteredTransactions), [filteredTransactions])

  const loanSummary = useMemo(
    () => summarizeLoans(loansState.data ?? [], loanRepaymentsState.data ?? [], range),
    [loansState.data, loanRepaymentsState.data, range]
  )
  const depositSummary = useMemo(
    () => summarizeDeposits(dpsContributionsState.data ?? [], fdrsState.data ?? [], fdrPayoutsState.data ?? [], range),
    [dpsContributionsState.data, fdrsState.data, fdrPayoutsState.data, range]
  )

  return {
    period,
    setPeriod,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    range,
    filters,
    setFilters,
    accounts: accountsState.data ?? [],
    categories: categoriesState.data ?? [],
    summary,
    savingsRate,
    trend,
    expenseCategories,
    incomeSources,
    flow,
    daily: daily.points,
    dailyAvailable: daily.available,
    highestDay,
    spanDays,
    averageDailyExpense,
    ccSpending,
    loanSummary,
    depositSummary,
    hasData: filteredTransactions.length > 0,
    isLoading: transactionsState.isLoading || categoriesState.isLoading || accountsState.isLoading,
    error: transactionsState.error,
  }
}
import { useMemo } from 'react'
import {
  useLiveQuery,
  transactionRepository,
  loanRepository,
  loanRepaymentRepository,
  dpsContributionRepository,
  fdrRepository,
} from '@/db'
import { computeMonthlySummaries, type MonthlySummary } from './reportsService'

export interface MonthComparison {
  current: MonthlySummary
  previous: MonthlySummary | null
  incomeDeltaPercent: number | null
  expenseDeltaPercent: number | null
  savingsDeltaPercent: number | null
}

function percentDelta(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null
  return ((curr - prev) / Math.abs(prev)) * 100
}

/** Monthly Financial Summary for the last `monthsBack` months, each with a previous-month comparison. */
export function useMonthlySummary(monthsBack: number = 6) {
  const now = Date.now()

  const transactionsState = useLiveQuery(() => transactionRepository.getAll(), [])
  const loansState = useLiveQuery(() => loanRepository.getAll(), [])
  const loanRepaymentsState = useLiveQuery(() => loanRepaymentRepository.getAll(), [])
  const dpsContributionsState = useLiveQuery(() => dpsContributionRepository.getAll(), [])
  const fdrsState = useLiveQuery(() => fdrRepository.getAll(), [])

  const months = useMemo(
    () =>
      computeMonthlySummaries(
        monthsBack,
        now,
        transactionsState.data ?? [],
        loansState.data ?? [],
        loanRepaymentsState.data ?? [],
        dpsContributionsState.data ?? [],
        fdrsState.data ?? []
      ),
    [monthsBack, now, transactionsState.data, loansState.data, loanRepaymentsState.data, dpsContributionsState.data, fdrsState.data]
  )

  const comparisons = useMemo<MonthComparison[]>(
    () =>
      months.map((m, i) => {
        const previous = i > 0 ? months[i - 1] : null
        return {
          current: m,
          previous,
          incomeDeltaPercent: previous ? percentDelta(m.income, previous.income) : null,
          expenseDeltaPercent: previous ? percentDelta(m.expenses, previous.expenses) : null,
          savingsDeltaPercent: previous ? percentDelta(m.savings, previous.savings) : null,
        }
      }),
    [months]
  )

  const isLoading =
    transactionsState.isLoading ||
    loansState.isLoading ||
    loanRepaymentsState.isLoading ||
    dpsContributionsState.isLoading ||
    fdrsState.isLoading

  return { months, comparisons, isLoading }
}
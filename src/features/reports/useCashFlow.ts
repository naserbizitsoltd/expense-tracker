import { useMemo, useState } from 'react'
import {
  useLiveQuery,
  transactionRepository,
  loanRepository,
  loanRepaymentRepository,
  dpsContributionRepository,
  dpsPayoutRepository,
  fdrRepository,
  fdrPayoutRepository,
} from '@/db'
import { getReportRange, computeCashFlow, type ReportPeriodOption } from './reportsService'

/**
 * Cash Flow Statement for a selected period. Every input is a live
 * query over data other services already own (transactions, loans,
 * DPS/FDR contributions & payouts) — see computeCashFlow for how they
 * combine. Any real money movement anywhere in the app updates this
 * automatically via Dexie's live queries.
 */
export function useCashFlow() {
  const [period, setPeriod] = useState<ReportPeriodOption>('this_month')
  const [customStart, setCustomStart] = useState<number | null>(null)
  const [customEnd, setCustomEnd] = useState<number | null>(null)

  const range = useMemo(() => getReportRange(period, customStart, customEnd), [period, customStart, customEnd])

  const transactionsState = useLiveQuery(
    () => transactionRepository.getByDateRange(range.start, range.end),
    [range.start, range.end]
  )
  const loansState = useLiveQuery(() => loanRepository.getAll(), [])
  const loanRepaymentsState = useLiveQuery(() => loanRepaymentRepository.getAll(), [])
  const dpsContributionsState = useLiveQuery(() => dpsContributionRepository.getAll(), [])
  const dpsPayoutsState = useLiveQuery(() => dpsPayoutRepository.getAll(), [])
  const fdrsState = useLiveQuery(() => fdrRepository.getAll(), [])
  const fdrPayoutsState = useLiveQuery(() => fdrPayoutRepository.getAll(), [])

  const summary = useMemo(
    () =>
      computeCashFlow(
        transactionsState.data ?? [],
        loansState.data ?? [],
        loanRepaymentsState.data ?? [],
        dpsContributionsState.data ?? [],
        dpsPayoutsState.data ?? [],
        fdrsState.data ?? [],
        fdrPayoutsState.data ?? [],
        range
      ),
    [
      transactionsState.data,
      loansState.data,
      loanRepaymentsState.data,
      dpsContributionsState.data,
      dpsPayoutsState.data,
      fdrsState.data,
      fdrPayoutsState.data,
      range,
    ]
  )

  const isLoading =
    transactionsState.isLoading ||
    loansState.isLoading ||
    loanRepaymentsState.isLoading ||
    dpsContributionsState.isLoading ||
    dpsPayoutsState.isLoading ||
    fdrsState.isLoading ||
    fdrPayoutsState.isLoading

  return { period, setPeriod, customStart, setCustomStart, customEnd, setCustomEnd, range, summary, isLoading }
}
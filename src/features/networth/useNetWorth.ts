import { useMemo } from 'react'
import { subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns'
import {
  useLiveQuery,
  accountRepository,
  ledgerEntryRepository,
  loanRepository,
  loanRepaymentRepository,
  dpsRepository,
  dpsContributionRepository,
  fdrRepository,
  fdrPayoutRepository,
} from '@/db'
import { useAccounts } from '@/features/accounts/useAccounts'
import { useDps } from '@/features/dps/useDps'
import { useFdrs } from '@/features/fdr/useFdr'
import { useLoans } from '@/features/loans/useLoans'
import { useCreditCards } from '@/features/credit-cards/useCreditCards'
import { useGoalsList } from '@/features/goals/useGoals'
import { APP_CONFIG } from '@/config/app.config'
import { computeNetWorth, computeNetWorthHistory } from './networthService'

const HISTORY_MONTHS = 6

/**
 * Net Worth = Total Assets − Total Liabilities, using the SAME already-
 * derived totals as the Dashboard's netWorth (useDashboard.ts) — this
 * hook never recomputes a balance itself, it only asks each owning
 * hook/service for its number and combines them for display, plus adds
 * a 6-month history built from each entity's own dated records.
 */
export function useNetWorth() {
  const accounts = useAccounts()
  const dps = useDps()
  const fdr = useFdrs()
  const loans = useLoans()
  const creditCards = useCreditCards()
  const goals = useGoalsList()

  const currency = APP_CONFIG.defaultCurrency
  const activeAccountIds = useMemo(() => accounts.activeAccounts.map((a) => a.id), [accounts.activeAccounts])

  const goalsTotal = useMemo(
    () =>
      goals.activeItems
        .filter((i) => i.goal.currency === currency)
        .reduce((sum, i) => sum + i.goal.currentAmount, 0),
    [goals.activeItems, currency]
  )

  const snapshot = useMemo(
    () =>
      computeNetWorth({
        accounts: accounts.activeAccounts.filter((a) => a.currency === currency),
        dpsDeposited: dps.totalDeposited,
        fdrPrincipal: fdr.totalPrincipal,
        loansReceivable: loans.totalReceivable,
        goalsEarmarked: goalsTotal,
        loansPayable: loans.totalBorrowedOutstanding,
        creditCardOutstanding: creditCards.totalOutstanding,
      }),
    [
      accounts.activeAccounts,
      currency,
      dps.totalDeposited,
      fdr.totalPrincipal,
      loans.totalReceivable,
      loans.totalBorrowedOutstanding,
      creditCards.totalOutstanding,
      goalsTotal,
    ]
  )

  // History: raw dated records fetched once, then reduced per month-end
  // by the pure function in networthService.ts — never a second balance
  // calculation, just re-filtering by date.
  const allAccountsState = useLiveQuery(() => accountRepository.getAll(), [])
  const ledgerEntriesState = useLiveQuery(
    () => ledgerEntryRepository.getByAccounts(activeAccountIds),
    [activeAccountIds.join(',')]
  )
  const allLoansState = useLiveQuery(() => loanRepository.getAll(), [])
  const allRepaymentsState = useLiveQuery(() => loanRepaymentRepository.getAll(), [])
  const allDpsState = useLiveQuery(() => dpsRepository.getAll(), [])
  const allDpsContributionsState = useLiveQuery(() => dpsContributionRepository.getAll(), [])
  const allFdrsState = useLiveQuery(() => fdrRepository.getAll(), [])
  const allFdrPayoutsState = useLiveQuery(() => fdrPayoutRepository.getAll(), [])

  const monthEnds = useMemo(() => {
    const now = Date.now()
    return eachMonthOfInterval({
      start: startOfMonth(subMonths(now, HISTORY_MONTHS - 1)),
      end: startOfMonth(now),
    }).map((m) => endOfMonth(m).getTime())
  }, [])

  const history = useMemo(
    () =>
      computeNetWorthHistory(
        monthEnds,
        allAccountsState.data ?? [],
        ledgerEntriesState.data ?? [],
        allLoansState.data ?? [],
        allRepaymentsState.data ?? [],
        allDpsState.data ?? [],
        allDpsContributionsState.data ?? [],
        allFdrsState.data ?? [],
        allFdrPayoutsState.data ?? [],
        creditCards.totalOutstanding,
        goalsTotal
      ),
    [
      monthEnds,
      allAccountsState.data,
      ledgerEntriesState.data,
      allLoansState.data,
      allRepaymentsState.data,
      allDpsState.data,
      allDpsContributionsState.data,
      allFdrsState.data,
      allFdrPayoutsState.data,
      creditCards.totalOutstanding,
      goalsTotal,
    ]
  )

  const isLoading =
    accounts.isLoading || dps.isLoading || fdr.isLoading || loans.isLoading || creditCards.isLoading || goals.isLoading

  return { ...snapshot, history, isLoading }
}
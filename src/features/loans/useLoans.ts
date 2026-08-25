import { useMemo } from 'react'
import { loanRepository, useLiveQuery } from '@/db'
import { getLoanOutstandings } from '@/services/loanService'
import { APP_CONFIG } from '@/config/app.config'

/**
 * Reactive loan list split by direction, with live-derived outstanding
 * per loan (never a cached field — see loanService.getLoanOutstandings)
 * and same-currency-only liability/receivable totals, mirroring
 * useCreditCards / useAccounts.
 */
export function useLoans() {
  const loansState = useLiveQuery(() => loanRepository.getAll(), [])
  const loans = loansState.data ?? []

  const outstandingState = useLiveQuery(
    () => getLoanOutstandings(loans.map((l) => l.id)),
    // Re-derive whenever the set of loan ids (or their principals) changes.
    // Repayment writes elsewhere are separately live-watched by the
    // components that read a single loan's outstanding (useLoanRepayments).
    [loans.map((l) => l.id + l.principal).join(',')]
  )
  const outstandingByLoan = outstandingState.data ?? {}

  const takenLoans = useMemo(() => loans.filter((l) => l.direction === 'taken'), [loans])
  const givenLoans = useMemo(() => loans.filter((l) => l.direction === 'given'), [loans])
  const activeTaken = useMemo(() => takenLoans.filter((l) => l.status !== 'closed'), [takenLoans])
  const activeGiven = useMemo(() => givenLoans.filter((l) => l.status !== 'closed'), [givenLoans])

  const totalBorrowedOutstanding = useMemo(
    () =>
      activeTaken
        .filter((l) => l.currency === APP_CONFIG.defaultCurrency)
        .reduce((sum, l) => sum + (outstandingByLoan[l.id] ?? 0), 0),
    [activeTaken, outstandingByLoan]
  )
  const totalReceivable = useMemo(
    () =>
      activeGiven
        .filter((l) => l.currency === APP_CONFIG.defaultCurrency)
        .reduce((sum, l) => sum + (outstandingByLoan[l.id] ?? 0), 0),
    [activeGiven, outstandingByLoan]
  )

  return {
    loans,
    takenLoans,
    givenLoans,
    outstandingByLoan,
    totalBorrowedOutstanding,
    totalReceivable,
    isLoading: loansState.isLoading || outstandingState.isLoading,
    error: loansState.error ?? outstandingState.error,
  }
}

export function useLoan(id: string | null) {
  const { data, error, isLoading } = useLiveQuery(() => (id ? loanRepository.getById(id) : undefined), [id])
  return { loan: data, isLoading, error }
}
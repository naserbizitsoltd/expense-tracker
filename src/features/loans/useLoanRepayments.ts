import { useMemo } from 'react'
import { useLiveQuery, db } from '@/db'
import { getLoanOutstanding } from '@/services/loanService'
import type { LoanRepayment } from '@/types/entities'

/** Reactive, newest-first repayment history for a single loan, plus live outstanding principal and the real principal/interest paid so far. */
export function useLoanRepayments(loanId: string | null) {
  const repaymentsState = useLiveQuery<LoanRepayment[]>(
    () => (loanId ? db.loanRepayments.where('loanId').equals(loanId).reverse().sortBy('date') : Promise.resolve([])),
    [loanId]
  )
  const outstandingState = useLiveQuery<number>(
    () => (loanId ? getLoanOutstanding(loanId) : Promise.resolve(0)),
    [loanId, repaymentsState.data]
  )

  const totalRepaid = useMemo(
    () => (repaymentsState.data ?? []).reduce((sum, r) => sum + r.amount, 0),
    [repaymentsState.data]
  )
  const principalPaid = useMemo(
    () => (repaymentsState.data ?? []).reduce((sum, r) => sum + r.principalPortion, 0),
    [repaymentsState.data]
  )
  const interestPaid = useMemo(
    () => (repaymentsState.data ?? []).reduce((sum, r) => sum + r.interestPortion, 0),
    [repaymentsState.data]
  )

  return {
    repayments: repaymentsState.data ?? [],
    totalRepaid,
    principalPaid,
    interestPaid,
    outstanding: outstandingState.data ?? 0,
    isLoading: repaymentsState.isLoading || outstandingState.isLoading,
    error: repaymentsState.error ?? outstandingState.error,
  }
}
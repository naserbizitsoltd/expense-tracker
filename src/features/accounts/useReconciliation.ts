import { reconciliationRepository, useLiveQuery } from '@/db'

/** Reactive reconciliation history + last-reconciled date for one account. */
export function useReconciliationHistory(accountId: string) {
  const { data, error, isLoading } = useLiveQuery(() => reconciliationRepository.getByAccount(accountId), [accountId])
  const history = data ?? []
  return { history, lastReconciledAt: history[0]?.date ?? null, isLoading, error }
}
import { useMemo } from 'react'
import { useLiveQuery, db } from '@/db'
import { getDpsProgress } from '@/services/dpsProgressService'
import type { Dps, DpsContribution, DpsPayout } from '@/types/entities'
/** Reactive, newest-first contribution history for a single DPS, plus live deposited total and progress. */
export function useDpsContributions(dps: Dps | null) {
  const dpsId = dps?.id ?? null
  const contributionsState = useLiveQuery<DpsContribution[]>(
    () => (dpsId ? db.dpsContributions.where('dpsId').equals(dpsId).reverse().sortBy('date') : Promise.resolve([])),
    [dpsId]
  )
  const contributions = contributionsState.data ?? []

  const totalDeposited = useMemo(() => contributions.reduce((sum, c) => sum + c.amount, 0), [contributions])
  const progress = useMemo(
    () => (dps ? getDpsProgress(dps, contributions.length) : null),
    [dps, contributions.length]
  )

    return {
    contributions,
    totalDeposited,
    progress,
    isLoading: contributionsState.isLoading,
    error: contributionsState.error,
  }
}

/** Reactive maturity payout record for a single DPS, if one exists. */
export function useDpsPayout(dpsId: string | null) {
  const { data, error, isLoading } = useLiveQuery<DpsPayout | undefined>(
    async () => (dpsId ? await db.dpsPayouts.where('dpsId').equals(dpsId).first() : undefined),
    [dpsId]
  )
  return { payout: data, isLoading, error }
}
import { useMemo } from 'react'
import { useLiveQuery, db } from '@/db'
import { getDpsProgress } from '@/services/dpsProgressService'
import { estimateDpsInterest } from '@/services/dpsInterestService'
import type { Dps, DpsContribution, DpsPayout } from '@/types/entities'
/** Reactive, newest-first contribution history for a single DPS, plus live deposited total, progress, and interest estimate. */
export function useDpsContributions(dps: Dps | null) {
  const dpsId = dps?.id ?? null
  const contributionsState = useLiveQuery<DpsContribution[]>(
    () => (dpsId ? db.dpsContributions.where('dpsId').equals(dpsId).reverse().sortBy('date') : Promise.resolve([])),
    [dpsId]
  )
  const contributions = contributionsState.data ?? []

  const totalDeposited = useMemo(
    () => (dps?.openingDepositedAmount ?? 0) + contributions.reduce((sum, c) => sum + c.amount, 0),
    [dps, contributions]
  )
  const progress = useMemo(
    () => (dps ? getDpsProgress(dps, contributions.length) : null),
    [dps, contributions.length]
  )
  const interestEstimate = useMemo(
    () => (dps ? estimateDpsInterest(dps, contributions) : null),
    [dps, contributions]
  )

    return {
    contributions,
    totalDeposited,
    progress,
    interestEstimate,
    currentValueWithInterest: interestEstimate?.totalValueWithInterest ?? totalDeposited,
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
import { useMemo } from 'react'
import { useDps } from '@/features/dps/useDps'
import { useFdrs } from '@/features/fdr/useFdr'
import { isFdrMatured } from '@/services/fdrService'
import type { CurrencyCode } from '@/types/money'

export interface UpcomingDepositEvent {
  id: string
  kind: 'dps_contribution' | 'fdr_maturity'
  label: string
  date: number
  amount: number | null
  currency: CurrencyCode
}

/**
 * Combines the existing DPS and FDR hooks into one reactive overview —
 * DPS and FDR keep their own data models and services; this only reads
 * from useDps()/useFdrs() (both already live via useLiveQuery) and
 * derives summary totals + a merged, date-sorted upcoming list. Any DPS
 * contribution, FDR creation/maturity/renewal/withdrawal, or DPS payout
 * updates this immediately since it rides the same live queries.
 */
export function useDepositsOverview() {
  const dps = useDps()
  const fdr = useFdrs()

  const upcomingEvents = useMemo<UpcomingDepositEvent[]>(() => {
    const events: UpcomingDepositEvent[] = []

    for (const item of dps.activeItems) {
      if (item.dps.status === 'active' && item.progress.nextContributionDate) {
        events.push({
          id: `dps-${item.dps.id}`,
          kind: 'dps_contribution',
          label: `${item.dps.name} contribution due`,
          date: item.progress.nextContributionDate,
          amount: item.dps.monthlyInstallment,
          currency: item.dps.currency,
        })
      }
    }

    for (const item of fdr.activeItems) {
      if (item.fdr.status === 'active' && item.fdr.maturityDate && !isFdrMatured(item.fdr)) {
        events.push({
          id: `fdr-${item.fdr.id}`,
          kind: 'fdr_maturity',
          label: `${item.fdr.name} maturity`,
          date: item.fdr.maturityDate,
          amount: item.fdr.maturityAmount,
          currency: item.fdr.currency,
        })
      }
    }

    return events.sort((a, b) => a.date - b.date)
  }, [dps.activeItems, fdr.activeItems])

  // DPS/FDR money is intentionally never summed into ordinary account
  // balances (see useAccounts.totalBalance) — these are separate,
  // locked-savings totals shown only here.
  const totalDeposits = dps.totalDeposited + fdr.totalPrincipal

  return {
    dpsItems: dps.activeItems,
    fdrItems: fdr.activeItems,
    dpsBalance: dps.totalDeposited,
    fdrPrincipal: fdr.totalPrincipal,
    totalDeposits,
    upcomingEvents,
    isLoading: dps.isLoading || fdr.isLoading,
    error: dps.error ?? fdr.error,
  }
}
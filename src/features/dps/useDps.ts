import { useMemo } from 'react'
import { dpsRepository, useLiveQuery } from '@/db'
import { getDpsDepositedMany } from '@/services/dpsService'
import { getDpsProgress, type DpsProgress } from '@/services/dpsProgressService'
import { APP_CONFIG } from '@/config/app.config'
import type { Dps } from '@/types/entities'

export interface DpsWithProgress {
  dps: Dps
  deposited: number
  progress: DpsProgress
}

/**
 * Reactive DPS list with live-derived deposited totals and schedule
 * progress (never cached — see dpsService.getDpsDepositedMany /
 * dpsProgressService.getDpsProgress).
 */
export function useDps() {
  const dpsState = useLiveQuery(() => dpsRepository.getAll(), [])
  const all = dpsState.data ?? []

  const depositedState = useLiveQuery(
    () => getDpsDepositedMany(all.map((d) => d.id)),
    [all.map((d) => d.id).join(',')]
  )
  const depositedById = depositedState.data ?? {}

  const items = useMemo<DpsWithProgress[]>(
    () =>
      all.map((dps) => {
        const summary = depositedById[dps.id] ?? { total: 0, count: 0 }
        return { dps, deposited: summary.total, progress: getDpsProgress(dps, summary.count) }
      }),
    [all, depositedById]
  )

  const activeItems = useMemo(() => items.filter((i) => i.dps.status !== 'archived'), [items])
  const archivedItems = useMemo(() => items.filter((i) => i.dps.status === 'archived'), [items])

  const totalDeposited = useMemo(
    () =>
      activeItems
        .filter((i) => i.dps.currency === APP_CONFIG.defaultCurrency)
        .reduce((sum, i) => sum + i.deposited, 0),
    [activeItems]
  )

  return {
    items,
    activeItems,
    archivedItems,
    totalDeposited,
    isLoading: dpsState.isLoading || depositedState.isLoading,
    error: dpsState.error ?? depositedState.error,
  }
}

export function useSingleDps(id: string | null) {
  const { data, error, isLoading } = useLiveQuery(() => (id ? dpsRepository.getById(id) : undefined), [id])
  return { dps: data, isLoading, error }
}
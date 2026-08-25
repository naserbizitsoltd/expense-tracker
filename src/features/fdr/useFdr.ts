import { useMemo } from 'react'
import { fdrRepository, fdrPayoutRepository, useLiveQuery } from '@/db'
import { isFdrMatured } from '@/services/fdrService'
import { APP_CONFIG } from '@/config/app.config'
import type { Fdr, FdrPayout } from '@/types/entities'

export interface FdrWithMaturity {
  fdr: Fdr
  isMatured: boolean // true only while status is still 'active' and the maturity date has actually passed
}

/** Reactive FDR list with live-derived maturity state (never cached — see fdrService.isFdrMatured). */
export function useFdrs() {
  const fdrState = useLiveQuery(() => fdrRepository.getAll(), [])
  const all = fdrState.data ?? []

  const items = useMemo<FdrWithMaturity[]>(
    () => all.map((fdr) => ({ fdr, isMatured: fdr.status === 'active' && isFdrMatured(fdr) })),
    [all]
  )

  const activeItems = useMemo(() => items.filter((i) => i.fdr.status !== 'archived'), [items])
  const archivedItems = useMemo(() => items.filter((i) => i.fdr.status === 'archived'), [items])

    // Only a still-locked FDR counts toward the headline total. A
  // paid-out, renewed (its funds now live in the successor FDR — see
  // Fdr.previousFdrId), or prematurely withdrawn FDR's money is
  // already back in a real account balance, so counting it here would
  // double it up against the new FDR / the account balance.
  const totalPrincipal = useMemo(
    () =>
      activeItems
        .filter(
          (i) =>
            i.fdr.currency === APP_CONFIG.defaultCurrency &&
            i.fdr.status !== 'paid_out' &&
            i.fdr.status !== 'renewed' &&
            i.fdr.status !== 'withdrawn'
        )
        .reduce((sum, i) => sum + i.fdr.principal, 0),
    [activeItems]
  )

  return {
    items,
    activeItems,
    archivedItems,
    totalPrincipal,
    isLoading: fdrState.isLoading,
    error: fdrState.error,
  }
}

export function useSingleFdr(id: string | null) {
  const { data, error, isLoading } = useLiveQuery(() => (id ? fdrRepository.getById(id) : undefined), [id])
  return { fdr: data, isLoading, error }
}

/** Reactive maturity payout record for a single FDR, if one exists. */
export function useFdrPayout(fdrId: string | null) {
  const { data, error, isLoading } = useLiveQuery<FdrPayout | undefined>(
    async () => (fdrId ? await fdrPayoutRepository.getByFdr(fdrId) : undefined),
    [fdrId]
  )
  return { payout: data, isLoading, error }
}

/**
 * Full renewal chain for one FDR, oldest first, walking Fdr.previousFdrId
 * backward and fdrRepository.getByPreviousFdr forward — so it doesn't
 * matter whether `fdrId` is the very first FDR in the chain, a renewed
 * middle link, or the current active one. Reactive: renewing again
 * updates this automatically via useLiveQuery.
 */
export function useFdrRenewalChain(fdrId: string | null) {
  const { data, error, isLoading } = useLiveQuery<Fdr[]>(async () => {
    if (!fdrId) return []
    const current = await fdrRepository.getById(fdrId)
    if (!current) return []

    const chain: Fdr[] = [current]

    // Walk backward to the root.
    let cursor = current
    while (cursor.previousFdrId) {
      const prev = await fdrRepository.getById(cursor.previousFdrId)
      if (!prev) break
      chain.unshift(prev)
      cursor = prev
    }

    // Walk forward from the original fdrId (a renewal chain is linear,
    // so there is at most one forward child at each step).
    cursor = current
    while (true) {
      const next = await fdrRepository.getByPreviousFdr(cursor.id)
      if (next.length === 0) break
      chain.push(next[0])
      cursor = next[0]
    }

    return chain
  }, [fdrId])

  return { chain: data ?? [], isLoading, error }
}
import { useMemo } from 'react'
import { debitCardRepository, accountRepository, useLiveQuery } from '@/db'

export function useDebitCards() {
  const { data, error, isLoading } = useLiveQuery(() => debitCardRepository.getAll(), [])
  const accountsState = useLiveQuery(() => accountRepository.getAll(), [])

  const cards = data ?? []
  const activeCards = useMemo(() => cards.filter((c) => !c.isArchived), [cards])
  const archivedCards = useMemo(() => cards.filter((c) => c.isArchived), [cards])
  const accountsById = useMemo(() => new Map((accountsState.data ?? []).map((a) => [a.id, a])), [accountsState.data])

  return {
    cards,
    activeCards,
    archivedCards,
    accountsById,
    isLoading: isLoading || accountsState.isLoading,
    error: error ?? accountsState.error,
  }
}

export function useDebitCard(id: string | null) {
  const { data, error, isLoading } = useLiveQuery(() => (id ? debitCardRepository.getById(id) : undefined), [id])
  return { card: data, isLoading, error }
}
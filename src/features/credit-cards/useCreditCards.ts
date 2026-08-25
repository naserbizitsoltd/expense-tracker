import { useMemo } from 'react'
import { creditCardRepository, useLiveQuery } from '@/db'
import { APP_CONFIG } from '@/config/app.config'

export function useCreditCards() {
  const { data, error, isLoading } = useLiveQuery(() => creditCardRepository.getAll(), [])

  const cards = data ?? []
  const activeCards = useMemo(() => cards.filter((c) => !c.isArchived), [cards])
  const archivedCards = useMemo(() => cards.filter((c) => c.isArchived), [cards])

  // Liability totals — same-currency-only summing, same reasoning as
  // useAccounts.totalBalance. NEVER added to Total Available Money
  // (accounts total): a credit card is a liability, not available cash.
  const totalOutstanding = useMemo(
    () =>
      activeCards
        .filter((c) => c.currency === APP_CONFIG.defaultCurrency)
        .reduce((sum, c) => sum + c.outstandingBalance, 0),
    [activeCards]
  )
  const totalCreditLimit = useMemo(
    () =>
      activeCards
        .filter((c) => c.currency === APP_CONFIG.defaultCurrency)
        .reduce((sum, c) => sum + c.creditLimit, 0),
    [activeCards]
  )

  return { cards, activeCards, archivedCards, totalOutstanding, totalCreditLimit, isLoading, error }
}

export function useCreditCard(id: string | null) {
  const { data, error, isLoading } = useLiveQuery(() => (id ? creditCardRepository.getById(id) : undefined), [id])
  return { card: data, isLoading, error }
}
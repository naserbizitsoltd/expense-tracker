import { useMemo } from 'react'
import { useLiveQuery, db, accountRepository, categoryRepository, creditCardRepository } from '@/db'
import type { Account, Category, CategoryType, CreditCard, CurrencyCode, Transaction } from '@/types/entities'

export interface TransactionListItem {
  transaction: Transaction
  category: Category | undefined
  account: Account | undefined
  toAccount: Account | undefined // only set for transfers
  creditCard: CreditCard | undefined // only set for credit-card-paid expenses
}

/**
 * One split receipt, collapsed into a single list entry. `description`
 * is the shared/central description (the group's heading); each entry
 * in `slices` is one category slice, whose own `transaction.note` is
 * that slice's category-wise description (shown as a subheading).
 */
export interface SplitTransactionGroupItem {
  kind: 'split'
  splitGroupId: string
  date: number
  currency: CurrencyCode
  description: string
  totalAmount: number
  account: Account | undefined
  creditCard: CreditCard | undefined
  slices: TransactionListItem[]
}

export type TransactionListEntry = ({ kind: 'single' } & TransactionListItem) | SplitTransactionGroupItem

/** Reactive, newest-first list of expense + income + transfer transactions, joined for display. Every slice of a split expense is collapsed into one grouped entry — see SplitTransactionGroupItem. */
export function useTransactionsList() {
  const transactionsState = useLiveQuery(
    () => db.transactions.where('type').anyOf(['expense', 'income', 'transfer', 'credit_card']).reverse().sortBy('date'),
    []
  )
  const categoriesState = useLiveQuery(() => categoryRepository.getAll(), [])
  const accountsState = useLiveQuery(() => accountRepository.getAll(), [])
  const creditCardsState = useLiveQuery(() => creditCardRepository.getAll(), [])

  const items: TransactionListEntry[] | undefined = useMemo(() => {
    if (!transactionsState.data) return undefined
    const categoriesById = new Map((categoriesState.data ?? []).map((c) => [c.id, c]))
    const accountsById = new Map((accountsState.data ?? []).map((a) => [a.id, a]))
    const creditCardsById = new Map((creditCardsState.data ?? []).map((c) => [c.id, c]))

    const toListItem = (transaction: Transaction): TransactionListItem => ({
      transaction,
      category: transaction.categoryId ? categoriesById.get(transaction.categoryId) : undefined,
      account: accountsById.get(transaction.accountId),
      toAccount: transaction.toAccountId ? accountsById.get(transaction.toAccountId) : undefined,
      creditCard: transaction.creditCardId ? creditCardsById.get(transaction.creditCardId) : undefined,
    })

    const entries: TransactionListEntry[] = []
    // Slices of the same receipt share a splitGroupId and (since they're
    // created together atomically) the same date, so they normally sit
    // next to each other in the newest-first sort — but this map makes
    // the grouping correct even if that ever isn't the case.
    const groupsById = new Map<string, SplitTransactionGroupItem>()

    for (const transaction of transactionsState.data) {
      const listItem = toListItem(transaction)

      if (!transaction.splitGroupId) {
        entries.push({ kind: 'single', ...listItem })
        continue
      }

      const existingGroup = groupsById.get(transaction.splitGroupId)
      if (existingGroup) {
        existingGroup.slices.push(listItem)
        existingGroup.totalAmount += transaction.amount
        continue
      }

      const group: SplitTransactionGroupItem = {
        kind: 'split',
        splitGroupId: transaction.splitGroupId,
        date: transaction.date,
        currency: transaction.currency,
        description: transaction.splitDescription?.trim() || '',
        totalAmount: transaction.amount,
        account: listItem.account,
        creditCard: listItem.creditCard,
        slices: [listItem],
      }
      groupsById.set(transaction.splitGroupId, group)
      entries.push(group)
    }

    return entries
  }, [transactionsState.data, categoriesState.data, accountsState.data, creditCardsState.data])

  return {
    items,
    isLoading:
      transactionsState.isLoading || categoriesState.isLoading || accountsState.isLoading || creditCardsState.isLoading,
    error: transactionsState.error ?? categoriesState.error ?? accountsState.error ?? creditCardsState.error,
  }
}

export function useCategoriesByType(type: CategoryType) {
  const state = useLiveQuery(() => categoryRepository.getByType(type), [type])
  return {
    categories: (state.data ?? []).filter((c) => c.isActive),
    isLoading: state.isLoading,
    error: state.error,
  }
}

export function useActiveAccounts() {
  const state = useLiveQuery(() => accountRepository.getActive(), [])
  return {
    accounts: state.data ?? [],
    isLoading: state.isLoading,
    error: state.error,
  }
}

/** Every distinct tag used across all transactions, alphabetical — feeds TagInput's suggestions. */
export function useAllTags() {
  const state = useLiveQuery(() => db.transactions.toArray(), [])
  return useMemo(() => {
    const set = new Set<string>()
    for (const t of state.data ?? []) {
      for (const tag of t.tags ?? []) {
        set.add(tag)
      }
    }
    return Array.from(set).sort()
  }, [state.data])
}
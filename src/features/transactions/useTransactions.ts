import { useMemo } from 'react'
import { useLiveQuery, db, accountRepository, categoryRepository, creditCardRepository } from '@/db'
import type { Account, Category, CategoryType, CreditCard, Transaction } from '@/types/entities'

export interface TransactionListItem {
  transaction: Transaction
  category: Category | undefined
  account: Account | undefined
  toAccount: Account | undefined // only set for transfers
  creditCard: CreditCard | undefined // only set for credit-card-paid expenses
}

/** Reactive, newest-first list of expense + income + transfer transactions, joined for display. */
export function useTransactionsList() {
    const transactionsState = useLiveQuery(
    () => db.transactions.where('type').anyOf(['expense', 'income', 'transfer', 'credit_card']).reverse().sortBy('date'),
    []
  )
  const categoriesState = useLiveQuery(() => categoryRepository.getAll(), [])
  const accountsState = useLiveQuery(() => accountRepository.getAll(), [])
  const creditCardsState = useLiveQuery(() => creditCardRepository.getAll(), [])

  const items: TransactionListItem[] | undefined = useMemo(() => {
    if (!transactionsState.data) return undefined
    const categoriesById = new Map((categoriesState.data ?? []).map((c) => [c.id, c]))
    const accountsById = new Map((accountsState.data ?? []).map((a) => [a.id, a]))
    const creditCardsById = new Map((creditCardsState.data ?? []).map((c) => [c.id, c]))
    return transactionsState.data.map((transaction) => ({
      transaction,
      category: transaction.categoryId ? categoriesById.get(transaction.categoryId) : undefined,
      account: accountsById.get(transaction.accountId),
      toAccount: transaction.toAccountId ? accountsById.get(transaction.toAccountId) : undefined,
      creditCard: transaction.creditCardId ? creditCardsById.get(transaction.creditCardId) : undefined,
    }))
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
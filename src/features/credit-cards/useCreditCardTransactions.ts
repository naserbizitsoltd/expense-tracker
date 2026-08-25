import { useMemo } from 'react'
import { useLiveQuery, accountRepository, categoryRepository, transactionRepository } from '@/db'
import type { Account, Category, Transaction } from '@/types/entities'

export interface CreditCardTransactionItem {
  transaction: Transaction
  category: Category | undefined
  // set only for a Credit Card bill payment (type 'credit_card') — the
  // real account the payment was made from.
  account: Account | undefined
}

/**
 * Reactive, newest-first list of activity on a single credit card:
 * purchases (type 'expense', never touch the ledger) AND bill payments
 * (type 'credit_card', which do write a real ledger entry against the
 * source account). Both reference the card via `creditCardId`.
 */
export function useCreditCardTransactions(creditCardId: string | null) {
  const transactionsState = useLiveQuery<Transaction[]>(
    () => (creditCardId ? transactionRepository.getByCreditCard(creditCardId) : Promise.resolve([])),
    [creditCardId]
  )
  const categoriesState = useLiveQuery(() => categoryRepository.getAll(), [])
  const accountsState = useLiveQuery(() => accountRepository.getAll(), [])

  const { items, totalSpent } = useMemo(() => {
    const transactions = transactionsState.data ?? []
    const categoriesById = new Map((categoriesState.data ?? []).map((c) => [c.id, c]))
    const accountsById = new Map((accountsState.data ?? []).map((a) => [a.id, a]))

    let totalSpent = 0
    const items: CreditCardTransactionItem[] = transactions.map((transaction) => {
      if (transaction.type !== 'credit_card') totalSpent += transaction.amount
      return {
        transaction,
        category: transaction.categoryId ? categoriesById.get(transaction.categoryId) : undefined,
        account: transaction.type === 'credit_card' ? accountsById.get(transaction.accountId) : undefined,
      }
    })

    return { items, totalSpent }
  }, [transactionsState.data, categoriesState.data, accountsState.data])

  return {
    items,
    totalSpent,
    isLoading: transactionsState.isLoading || categoriesState.isLoading || accountsState.isLoading,
    error: transactionsState.error ?? categoriesState.error ?? accountsState.error,
  }
}
import { useMemo } from 'react'
import { useLiveQuery, categoryRepository, transactionRepository } from '@/db'
import type { Category, Transaction } from '@/types/entities'

export interface DebitCardTransactionItem {
  transaction: Transaction
  category: Category | undefined
}

/** Newest-first list of expenses paid with a single debit card — ordinary ledger-backed expenses, filtered by the debitCardId trace tag. */
export function useDebitCardTransactions(debitCardId: string | null) {
  const transactionsState = useLiveQuery<Transaction[]>(
    () => (debitCardId ? transactionRepository.getByDebitCard(debitCardId) : Promise.resolve([])),
    [debitCardId]
  )
  const categoriesState = useLiveQuery(() => categoryRepository.getAll(), [])

  const items: DebitCardTransactionItem[] = useMemo(() => {
    const categoriesById = new Map((categoriesState.data ?? []).map((c) => [c.id, c]))
    return (transactionsState.data ?? []).map((transaction) => ({
      transaction,
      category: transaction.categoryId ? categoriesById.get(transaction.categoryId) : undefined,
    }))
  }, [transactionsState.data, categoriesState.data])

  return {
    items,
    isLoading: transactionsState.isLoading || categoriesState.isLoading,
    error: transactionsState.error ?? categoriesState.error,
  }
}
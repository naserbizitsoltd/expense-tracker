import { useMemo } from 'react'
import { useLiveQuery, db, accountRepository, categoryRepository, creditCardRepository } from '@/db'
import type { Account, Category, CreditCard, Transaction } from '@/types/entities'

export interface AccountTransactionItem {
  transaction: Transaction
  category: Category | undefined
  // the "other side" of a transfer — undefined for income/expense
  counterAccount: Account | undefined
  // set only for a Credit Card bill payment (type 'credit_card') — the card being paid down
  creditCard: CreditCard | undefined
  // whether this transaction increased ('in') or decreased ('out') THIS account's balance
  direction: 'in' | 'out'
}

/**
 * Reactive, newest-first list of every transaction that touches a single
 * account — as the source (income/expense/outgoing transfer) or, for
 * transfers, as the destination — joined with category/counter-account
 * info for display, plus running income/expense totals for that account.
 *
 * Backed by useLiveQuery, so it re-runs automatically whenever a
 * transaction, category, or account involved is added, edited, or
 * deleted anywhere in the app. No manual refresh required.
 */
export function useAccountTransactions(accountId: string | null) {
    const outgoingState = useLiveQuery<Transaction[]>(
    () => (accountId ? db.transactions.where('accountId').equals(accountId).toArray() : Promise.resolve([])),
    [accountId]
  )
  const incomingTransferState = useLiveQuery<Transaction[]>(
    () => (accountId ? db.transactions.where('toAccountId').equals(accountId).toArray() : Promise.resolve([])),
    [accountId]
  )
    const categoriesState = useLiveQuery(() => categoryRepository.getAll(), [])
  const accountsState = useLiveQuery(() => accountRepository.getAll(), [])
  const creditCardsState = useLiveQuery(() => creditCardRepository.getAll(), [])

  const isLoading =
    outgoingState.isLoading ||
    incomingTransferState.isLoading ||
    categoriesState.isLoading ||
    accountsState.isLoading ||
    creditCardsState.isLoading
  const error =
    outgoingState.error ?? incomingTransferState.error ?? categoriesState.error ?? accountsState.error ?? creditCardsState.error

  const { items, totalIncome, totalExpense } = useMemo(() => {
    if (!accountId || !outgoingState.data || !incomingTransferState.data) {
      return { items: [] as AccountTransactionItem[], totalIncome: 0, totalExpense: 0 }
    }

        const categoriesById = new Map((categoriesState.data ?? []).map((c) => [c.id, c]))
    const accountsById = new Map((accountsState.data ?? []).map((a) => [a.id, a]))
    const creditCardsById = new Map((creditCardsState.data ?? []).map((c) => [c.id, c]))

    // A transaction can appear in both queries only for a transfer where
    // accountId === toAccountId, which the app never creates — dedupe by
    // id defensively anyway.
    const byId = new Map<string, Transaction>()
    for (const t of outgoingState.data) byId.set(t.id, t)
    for (const t of incomingTransferState.data) byId.set(t.id, t)

    const merged = Array.from(byId.values()).sort((a, b) => b.date - a.date)

    let totalIncome = 0
    let totalExpense = 0

    const items: AccountTransactionItem[] = merged.map((transaction) => {
            const category = transaction.categoryId ? categoriesById.get(transaction.categoryId) : undefined
      let counterAccount: Account | undefined
      let creditCard: CreditCard | undefined
      let direction: 'in' | 'out' = 'out'

      if (transaction.type === 'income') {
        direction = 'in'
        totalIncome += transaction.amount
      } else if (transaction.type === 'expense') {
        direction = 'out'
        totalExpense += transaction.amount
      } else if (transaction.type === 'transfer') {
        if (transaction.accountId === accountId) {
          direction = 'out'
          counterAccount = transaction.toAccountId ? accountsById.get(transaction.toAccountId) : undefined
        } else {
          direction = 'in'
          counterAccount = accountsById.get(transaction.accountId)
        }
      } else if (transaction.type === 'credit_card') {
        // Credit Card bill payment — leaves this account but is
        // deliberately NOT added to totalExpense above.
        direction = 'out'
        creditCard = transaction.creditCardId ? creditCardsById.get(transaction.creditCardId) : undefined
      }

      return { transaction, category, counterAccount, creditCard, direction }
    })

    return { items, totalIncome, totalExpense }
  }, [
    accountId,
    outgoingState.data,
    incomingTransferState.data,
    categoriesState.data,
    accountsState.data,
    creditCardsState.data,
  ])

  return { items, totalIncome, totalExpense, isLoading, error }
}
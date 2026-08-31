// Validation for the three transaction types the engine currently
// supports (expense, income, transfer). Every check here must pass
// BEFORE any write touches accounts/transactions/ledgerEntries.
//
// Kept deliberately separate from transactionService so the write path
// stays readable, and so future transaction subtypes (loan, DPS, FDR,
// credit card...) can add their own validators without touching this
// one's logic for the existing three.

import { db } from '@/db/schema'
import { AppDbError } from '@/db/errors'
import type { Account, Category, CreditCard, DebitCard, TransactionType } from '@/types/entities'

export type CoreTransactionType = 'expense' | 'income' | 'transfer'

// Transaction types handled by their own dedicated services (never by
// the core expense/income/transfer engine below): 'loan' by
// loanService.ts, 'adjustment' by goalService.ts, 'credit_card' by
// payCreditCardBill. Listed here only so assertKnownTransactionType
// gives a clear error instead of lumping them in with truly unknown
// types.
const ENTITY_LINKED_TYPES: TransactionType[] = ['loan', 'dps', 'adjustment', 'credit_card']

export interface TransactionInput {
  type: CoreTransactionType
  amount: number // integer, smallest unit, must be > 0
  accountId: string
  toAccountId?: string | null // required for transfer, forbidden otherwise
  categoryId?: string | null // required for expense/income, forbidden for transfer
  date: number // epoch ms
  note?: string
  tags?: string[] // free-form labels (lowercased), e.g. ['cox\'s bazar trip', 'work-reimbursable']
}

export interface ValidatedTransactionInput extends TransactionInput {
  toAccountId: string | null
  categoryId: string | null
  note: string
  tags: string[] // normalized, lowercased, deduped
}

const CORE_TYPES: CoreTransactionType[] = ['expense', 'income', 'transfer']

function invalid(message: string): never {
  throw new AppDbError('INVALID_DATA', message)
}

async function requireAccount(accountId: unknown, label: string): Promise<Account> {
  if (typeof accountId !== 'string' || accountId.trim() === '') {
    invalid(`${label} account is required.`)
  }
  const account = await db.accounts.get(accountId as string)
  if (!account) invalid(`${label} account does not exist.`)
  return account as Account
}

/** Existence + active-status check for a real account used as a Credit Card payment source. */
export async function requireActiveAccount(accountId: unknown, label: string): Promise<Account> {
  const account = await requireAccount(accountId, label)
  if (account.isArchived) invalid(`${label} account is archived and cannot be used.`)
  return account
}

/** Existence + active-status check for a credit card used as a payment source. Mirrors requireAccount. */
export async function requireActiveCreditCard(creditCardId: unknown): Promise<CreditCard> {
  if (typeof creditCardId !== 'string' || creditCardId.trim() === '') {
    invalid('Credit card is required.')
  }
  const card = await db.creditCards.get(creditCardId as string)
  if (!card) invalid('Credit card does not exist.')
  if ((card as CreditCard).isArchived) invalid('This credit card is archived and cannot be used.')
  return card as CreditCard
}
/** Existence + active-status check for a debit card used as a payment source. Mirrors requireActiveCreditCard. */
export async function requireActiveDebitCard(debitCardId: unknown): Promise<DebitCard> {
  if (typeof debitCardId !== 'string' || debitCardId.trim() === '') {
    invalid('Debit card is required.')
  }
  const card = await db.debitCards.get(debitCardId as string)
  if (!card) invalid('Debit card does not exist.')
  if ((card as DebitCard).isArchived) invalid('This debit card is archived and cannot be used.')
  return card as DebitCard
}
export async function requireCategory(categoryId: string, expectedType: 'expense' | 'income'): Promise<Category> {
  const category = await db.categories.get(categoryId)
  if (!category) invalid('Category does not exist.')
  if ((category as Category).type !== expectedType) {
    invalid(
      `A ${expectedType} transaction must use a ${expectedType} category, not a ${(category as Category).type} category.`
    )
  }
  return category as Category
}

// Trims, lowercases, drops empties, dedupes — so the same tag typed
// "Cox's Bazar" and "cox's bazar" is always one tag everywhere it's
// used for filtering/search.
export function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags) return []
  const seen = new Set<string>()
  for (const raw of tags) {
    const t = raw.trim().toLowerCase()
    if (t) seen.add(t)
  }
  return Array.from(seen)
}

/**
 * Validates a transaction input for create or edit and returns a
 * normalized version (nullable fields filled in, note defaulted).
 * Throws an AppDbError('INVALID_DATA', ...) on any violation — callers
 * (the transaction service) never write to the database on failure.
 */
export async function validateTransactionInput(
  input: TransactionInput
): Promise<ValidatedTransactionInput> {
  if (!CORE_TYPES.includes(input.type)) {
    invalid(`Unsupported transaction type: ${String(input.type)}`)
  }

  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    invalid('Amount must be a positive integer in the smallest currency unit.')
  }

  if (typeof input.date !== 'number' || !Number.isFinite(input.date)) {
    invalid('Transaction date is required.')
  }

  const note = input.note?.trim() ?? ''
  const tags = normalizeTags(input.tags)

  if (input.type === 'transfer') {
    if (input.categoryId) {
      invalid('Transfers must not reference a category.')
    }
    const source = await requireAccount(input.accountId, 'Source')
    const destination = await requireAccount(input.toAccountId, 'Destination')
    if (source.id === destination.id) {
      invalid('Source and destination accounts must be different for a transfer.')
    }
    return {
      ...input,
      toAccountId: destination.id,
      categoryId: null,
      note,
      tags,
    }
  }

  // expense / income
  if (input.toAccountId) {
    invalid(`${input.type} transactions must not reference a destination account.`)
  }
  await requireAccount(input.accountId, input.type === 'expense' ? 'Source' : 'Destination')

  if (!input.categoryId) {
    invalid(`${input.type} transactions require a category.`)
  }
  await requireCategory(input.categoryId, input.type)

  return {
    ...input,
    toAccountId: null,
    categoryId: input.categoryId,
    note,
    tags,
  }
}

export function assertKnownTransactionType(type: TransactionType): asserts type is CoreTransactionType {
  if (ENTITY_LINKED_TYPES.includes(type)) {
    invalid(`"${type}" transactions are managed by their own service and can't be edited as a core transaction.`)
  }
  if (!CORE_TYPES.includes(type as CoreTransactionType)) {
    invalid(
      `"${type}" is not yet supported by the transaction engine. Only expense, income, and transfer are implemented.`
    )
  }
}
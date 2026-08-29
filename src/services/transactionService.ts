// Core financial transaction / ledger engine.
//
// This is the ONLY code allowed to write to `transactions` or
// `ledgerEntries`. UI components, hooks, and every other feature must
// go through createExpense / createIncome / createTransfer /
// updateTransaction / deleteTransaction — never `db.transactions.add`
// or `db.ledgerEntries.add` directly, and never `account.balance += x`
// anywhere else in the app.
//
// Every write here happens inside a single Dexie atomic transaction:
// the transaction record, its ledger entries, and every affected
// account's recomputed balance cache are all committed together or
// not at all. See src/services/balanceService.ts for how balances are
// read back out; ledger entries are the source of truth there.

import { db } from '@/db/schema'
import { toAppDbError, AppDbError } from '@/db/errors'
import { generateId } from '@/db/id'
import { getAccountBalance, reconcileAccountBalanceCache } from './balanceService'
import {
  validateTransactionInput,
  assertKnownTransactionType,
  requireActiveAccount,
  requireActiveCreditCard,
  requireActiveDebitCard,
  requireCategory,
  type TransactionInput,
  type CoreTransactionType,
} from './transactionValidation'
import type { LedgerEntry, Transaction, TransactionType } from '@/types/entities'

// An expense is paid from exactly one source: a real account
// (accountId) or a credit card (creditCardId) — never both, never
// neither. Credit-card expenses skip the ledger entirely; see
// createExpense below.
export type CreateExpenseInput = Omit<TransactionInput, 'type' | 'toAccountId' | 'accountId'> & {
  relatedEntityId?: string | null
} & (
  | { accountId: string; creditCardId?: null; debitCardId?: string | null }
  | { accountId?: null; creditCardId: string }
)
export type CreateIncomeInput = Omit<TransactionInput, 'type' | 'toAccountId'> & { relatedEntityId?: string | null }
export type CreateTransferInput = Omit<TransactionInput, 'type' | 'categoryId'> & { toAccountId: string }

// Fields a caller may change on an existing transaction. `type` is
// intentionally excluded — converting an expense into a transfer (etc)
// is a delete-and-recreate, not an edit, since the shape of the ledger
// effect is fundamentally different.
export type TransactionEditInput = Partial<Omit<TransactionInput, 'type'>>

function buildLedgerEntry(
  transactionId: string,
  accountId: string,
  amount: number,
  date: number,
  now: number
): LedgerEntry {
  return {
    id: generateId(),
    transactionId,
    accountId,
    amount,
    direction: amount >= 0 ? 'credit' : 'debit',
    date,
    createdAt: now,
  }
}

/** Ledger entries a transaction of the given type/amount/accounts produces. Pure — no I/O. */
function buildLedgerEntriesFor(
  transactionId: string,
  type: CoreTransactionType,
  amount: number,
  accountId: string,
  toAccountId: string | null,
  date: number,
  now: number
): LedgerEntry[] {
  switch (type) {
    case 'expense':
      return [buildLedgerEntry(transactionId, accountId, -amount, date, now)]
    case 'income':
      return [buildLedgerEntry(transactionId, accountId, amount, date, now)]
    case 'transfer':
      return [
        buildLedgerEntry(transactionId, accountId, -amount, date, now),
        buildLedgerEntry(transactionId, toAccountId as string, amount, date, now),
      ]
  }
}

/** Every accountId a transaction touches (1 for expense/income, 2 for transfer), deduplicated. */
function affectedAccountIds(accountId: string, toAccountId: string | null): string[] {
  return toAccountId && toAccountId !== accountId ? [accountId, toAccountId] : [accountId]
}

async function createTransaction(
  type: CoreTransactionType,
  input: TransactionInput,
  relatedEntityId: string | null = null,
  debitCardId: string | null = null
): Promise<Transaction> {
  try {
    return await db.transaction('rw', db.transactions, db.ledgerEntries, db.accounts, db.categories, db.debitCards, async () => {
      const validated = await validateTransactionInput({ ...input, type })

      if (debitCardId) {
        const card = await requireActiveDebitCard(debitCardId)
        if (card.accountId !== validated.accountId) {
          throw new AppDbError('INVALID_DATA', 'Debit card is not linked to the selected account.')
        }
      }

      const now = Date.now()
      const id = generateId()

      const transaction: Transaction = {
        id,
        type,
        amount: validated.amount,
        currency: (await db.accounts.get(validated.accountId))!.currency,
        accountId: validated.accountId,
        toAccountId: validated.toAccountId,
        categoryId: validated.categoryId,
        creditCardId: null,
        debitCardId,
        relatedEntityId,
        note: validated.note,
        date: validated.date,
        createdAt: now,
        updatedAt: now,
      }

      const entries = buildLedgerEntriesFor(
        id,
        type,
        validated.amount,
        validated.accountId,
        validated.toAccountId,
        validated.date,
        now
      )

      await db.transactions.add(transaction)
      await db.ledgerEntries.bulkAdd(entries)

      for (const accountId of affectedAccountIds(validated.accountId, validated.toAccountId)) {
        await reconcileAccountBalanceCache(accountId)
      }

      return transaction
    })
  } catch (error) {
    throw toAppDbError(error)
  }
}

export async function createExpense(input: CreateExpenseInput): Promise<Transaction> {
  const { relatedEntityId = null, accountId, creditCardId, ...rest } = input
  if (creditCardId) {
    return createCreditCardExpense({ ...rest, creditCardId }, relatedEntityId)
  }
  const { debitCardId, ...core } = rest as typeof rest & { debitCardId?: string | null }
  return createTransaction(
    'expense',
    { ...core, type: 'expense', accountId: accountId as string, toAccountId: null },
    relatedEntityId,
    debitCardId ?? null
  )
}

/**
 * Records an expense paid with a credit card. Deliberately bypasses the
 * ledger/account engine above: a credit card isn't an Account, so there
 * is no accountId to write a ledger entry against. This is the ONLY
 * place `creditCards.outstandingBalance` is written for a purchase —
 * mirrors how reconcileAccountBalanceCache is the only writer of
 * `account.balance`.
 */
async function createCreditCardExpense(
  input: Omit<TransactionInput, 'type' | 'toAccountId' | 'accountId'> & { creditCardId: string },
  relatedEntityId: string | null
): Promise<Transaction> {
  try {
    return await db.transaction('rw', db.transactions, db.creditCards, db.categories, async () => {
      const card = await requireActiveCreditCard(input.creditCardId)

      if (!Number.isInteger(input.amount) || input.amount <= 0) {
        throw new AppDbError('INVALID_DATA', 'Amount must be a positive integer in the smallest currency unit.')
      }
      if (!input.categoryId) {
        throw new AppDbError('INVALID_DATA', 'expense transactions require a category.')
      }
      await requireCategory(input.categoryId, 'expense')

      const availableCredit = card.creditLimit - card.outstandingBalance
      if (input.amount > availableCredit) {
        throw new AppDbError('INVALID_DATA', 'Insufficient available credit.')
      }

      const now = Date.now()
      const transaction: Transaction = {
        id: generateId(),
        type: 'expense',
        amount: input.amount,
        currency: card.currency,
        accountId: '',
        toAccountId: null,
        categoryId: input.categoryId,
        creditCardId: card.id,
        debitCardId: null,
        relatedEntityId,
        note: input.note?.trim() ?? '',
        date: input.date,
        createdAt: now,
        updatedAt: now,
      }

      await db.transactions.add(transaction)
      await db.creditCards.update(card.id, {
        outstandingBalance: card.outstandingBalance + input.amount,
        updatedAt: now,
      })

      return transaction
    })
  } catch (error) {
    throw toAppDbError(error)
  }
}

export async function createIncome(input: CreateIncomeInput): Promise<Transaction> {
  const { relatedEntityId = null, ...rest } = input
  return createTransaction('income', { ...rest, type: 'income', toAccountId: null }, relatedEntityId)
}

export async function createTransfer(input: CreateTransferInput): Promise<Transaction> {
  return createTransaction('transfer', { ...input, type: 'transfer', categoryId: null })
}

export interface CreditCardPaymentInput {
  amount: number // integer, smallest unit, must be > 0
  accountId: string // real money account paying the bill
  creditCardId: string
  date: number
  note?: string
}

/**
 * Records a Credit Card bill payment: money moves from a real account
 * to the card's liability. This is NOT an expense — it writes a real
 * ledger entry against the source account (so the account balance
 * updates immediately) but never touches a category, so it can never
 * be counted in Expense totals or consume a Budget. The transaction
 * type is 'credit_card', distinguishing it from a card purchase
 * (type 'expense' with accountId '').
 */
export async function payCreditCardBill(input: CreditCardPaymentInput): Promise<Transaction> {
  try {
    return await db.transaction('rw', db.transactions, db.ledgerEntries, db.accounts, db.creditCards, async () => {
      if (!Number.isInteger(input.amount) || input.amount <= 0) {
        throw new AppDbError('INVALID_DATA', 'Amount must be a positive integer in the smallest currency unit.')
      }

      const account = await requireActiveAccount(input.accountId, 'Source')
      const card = await requireActiveCreditCard(input.creditCardId)

      if (input.amount > card.outstandingBalance) {
        throw new AppDbError('INVALID_DATA', 'Payment cannot exceed outstanding balance.')
      }

      const currentBalance = await getAccountBalance(account.id)
      if (input.amount > currentBalance) {
        throw new AppDbError('INVALID_DATA', 'Insufficient balance in the selected account.')
      }

      const now = Date.now()
      const id = generateId()
      const transaction: Transaction = {
        id,
        type: 'credit_card',
        amount: input.amount,
        currency: account.currency,
        accountId: account.id,
        toAccountId: null,
        categoryId: null,
        creditCardId: card.id,
        debitCardId: null,
        relatedEntityId: null,
        note: input.note?.trim() ?? '',
        date: input.date,
        createdAt: now,
        updatedAt: now,
      }

      const entry = buildLedgerEntry(id, account.id, -input.amount, input.date, now)

      await db.transactions.add(transaction)
      await db.ledgerEntries.add(entry)
      await reconcileAccountBalanceCache(account.id)
      await db.creditCards.update(card.id, {
        outstandingBalance: card.outstandingBalance - input.amount,
        updatedAt: now,
      })

      return transaction
    })
  } catch (error) {
    throw toAppDbError(error)
  }
}

/**
 * Replaces a transaction's financial effect entirely: the old ledger
 * entries are removed, the new (validated) ones are written, and every
 * account touched by either the old or new version has its balance
 * cache recomputed from the ledger — all inside one atomic transaction.
 * There is never a moment where both the old and new entries exist.
 */
export async function updateTransaction(
  id: string,
  changes: TransactionEditInput
): Promise<Transaction> {
  try {
    return await db.transaction(
      'rw',
      db.transactions,
      db.ledgerEntries,
      db.accounts,
      db.categories,
      db.creditCards,
      async () => {
        const existing = await db.transactions.get(id)
        if (!existing) throw new AppDbError('NOT_FOUND', 'Transaction not found.')

        if (existing.type === 'credit_card') {
          return updateCreditCardPayment(existing, changes)
        }

        if (existing.creditCardId) {
          return updateCreditCardExpense(existing, changes)
        }

        assertKnownTransactionType(existing.type)

        const merged: TransactionInput = {
          type: existing.type,
          amount: changes.amount ?? existing.amount,
          accountId: changes.accountId ?? existing.accountId,
          toAccountId: changes.toAccountId !== undefined ? changes.toAccountId : existing.toAccountId,
          categoryId: changes.categoryId !== undefined ? changes.categoryId : existing.categoryId,
          date: changes.date ?? existing.date,
          note: changes.note !== undefined ? changes.note : existing.note,
        }
        const validated = await validateTransactionInput(merged)

        const oldAccountIds = affectedAccountIds(existing.accountId, existing.toAccountId)
        const now = Date.now()

        const updated: Transaction = {
          ...existing,
          amount: validated.amount,
          accountId: validated.accountId,
          toAccountId: validated.toAccountId,
          categoryId: validated.categoryId,
          date: validated.date,
          note: validated.note,
          updatedAt: now,
        }

        const newEntries = buildLedgerEntriesFor(
          id,
          existing.type,
          validated.amount,
          validated.accountId,
          validated.toAccountId,
          validated.date,
          now
        )

        // Remove only this transaction's entries, then write the new set —
        // never leaves a duplicate or half-updated entry behind.
        await db.ledgerEntries.where('transactionId').equals(id).delete()
        await db.ledgerEntries.bulkAdd(newEntries)
        await db.transactions.put(updated)

        const newAccountIds = affectedAccountIds(validated.accountId, validated.toAccountId)
        const allTouchedAccountIds = Array.from(new Set([...oldAccountIds, ...newAccountIds]))
        for (const accountId of allTouchedAccountIds) {
          await reconcileAccountBalanceCache(accountId)
        }

        return updated
      })
  } catch (error) {
    throw toAppDbError(error)
  }
}

/**
 * Recomputes a credit-card expense in place: removes its old effect on
 * outstandingBalance, re-validates the new amount against available
 * credit, then applies the new effect — all inside the caller's
 * already-open Dexie transaction. Switching a transaction between an
 * account and a credit card isn't supported here (not exposed in the
 * UI); only amount/category/date/note may change.
 */
async function updateCreditCardExpense(existing: Transaction, changes: TransactionEditInput): Promise<Transaction> {
  const card = await db.creditCards.get(existing.creditCardId as string)
  if (!card) throw new AppDbError('NOT_FOUND', 'Credit card not found.')

  const newAmount = changes.amount ?? existing.amount
  if (!Number.isInteger(newAmount) || newAmount <= 0) {
    throw new AppDbError('INVALID_DATA', 'Amount must be a positive integer in the smallest currency unit.')
  }
  const newCategoryId = changes.categoryId !== undefined ? changes.categoryId : existing.categoryId
  if (!newCategoryId) throw new AppDbError('INVALID_DATA', 'expense transactions require a category.')
  await requireCategory(newCategoryId, 'expense')

  // This transaction's old effect removed, before re-applying the new amount.
  const outstandingWithoutThis = card.outstandingBalance - existing.amount
  const availableCreditWithoutThis = card.creditLimit - outstandingWithoutThis
  if (newAmount > availableCreditWithoutThis) {
    throw new AppDbError('INVALID_DATA', 'Insufficient available credit.')
  }

  const now = Date.now()
  const updated: Transaction = {
    ...existing,
    amount: newAmount,
    categoryId: newCategoryId,
    date: changes.date ?? existing.date,
    note: changes.note !== undefined ? changes.note?.trim() ?? '' : existing.note,
    updatedAt: now,
  }

  await db.transactions.put(updated)
  await db.creditCards.update(card.id, {
    outstandingBalance: outstandingWithoutThis + newAmount,
    updatedAt: now,
  })

  return updated
}

/**
 * Recomputes a Credit Card payment in place: removes its old ledger
 * effect on the source account, re-validates the new amount against
 * the card's outstanding balance and the (possibly new) source
 * account's available funds, then re-applies both effects — all
 * inside the caller's already-open Dexie transaction.
 */
async function updateCreditCardPayment(existing: Transaction, changes: TransactionEditInput): Promise<Transaction> {
  const card = await db.creditCards.get(existing.creditCardId as string)
  if (!card) throw new AppDbError('NOT_FOUND', 'Credit card not found.')

  const newAmount = changes.amount ?? existing.amount
  if (!Number.isInteger(newAmount) || newAmount <= 0) {
    throw new AppDbError('INVALID_DATA', 'Amount must be a positive integer in the smallest currency unit.')
  }

  const newAccountId = changes.accountId ?? existing.accountId
  const account = await requireActiveAccount(newAccountId, 'Source')

  // Outstanding balance with this payment's old effect undone, before re-applying the new amount.
  const outstandingWithoutThis = card.outstandingBalance + existing.amount
  if (newAmount > outstandingWithoutThis) {
    throw new AppDbError('INVALID_DATA', 'Payment cannot exceed outstanding balance.')
  }

  const now = Date.now()
  const newDate = changes.date ?? existing.date

  // Remove this payment's old ledger entry and recompute the old
  // source account's balance before checking funds for the new amount,
  // so editing the amount on the SAME account is checked correctly.
  await db.ledgerEntries.where('transactionId').equals(existing.id).delete()
  if (existing.accountId !== account.id) {
    await reconcileAccountBalanceCache(existing.accountId)
  }

  const currentBalance = await getAccountBalance(account.id)
  if (newAmount > currentBalance) {
    throw new AppDbError('INVALID_DATA', 'Insufficient balance in the selected account.')
  }

  const updated: Transaction = {
    ...existing,
    amount: newAmount,
    accountId: account.id,
    currency: account.currency,
    date: newDate,
    note: changes.note !== undefined ? changes.note?.trim() ?? '' : existing.note,
    updatedAt: now,
  }

  const entry = buildLedgerEntry(existing.id, account.id, -newAmount, newDate, now)
  await db.ledgerEntries.add(entry)
  await db.transactions.put(updated)
  await reconcileAccountBalanceCache(account.id)

  await db.creditCards.update(card.id, {
    outstandingBalance: outstandingWithoutThis - newAmount,
    updatedAt: now,
  })

  return updated
}

/**
 * Deletes a transaction and every ledger entry it produced, atomically,
 * then recomputes the balance cache for every account it touched so
 * balances reflect the deletion immediately with no orphaned entries.
 *
 * A dps/loan/fdr-linked transaction is always paired 1:1 with an
 * auditable record (DpsContribution/DpsPayout/LoanRepayment/FdrPayout)
 * that back-references it via `transactionId`. Those totals/progress
 * are always derived live from these rows (never cached), so deleting
 * the transaction without deleting its paired record would leave the
 * DPS/Loan/FDR still "counting" money that no longer actually moved —
 * this removes that record too, and reverts a status that was only
 * reached because of the now-reversed effect (e.g. a DPS that had
 * flipped to 'completed'/'paid_out', or a loan that had closed).
 */
export async function deleteTransaction(id: string): Promise<void> {
  try {
    await db.transaction(
      'rw',
      [
        db.transactions,
        db.ledgerEntries,
        db.accounts,
        db.creditCards,
        db.dps,
        db.dpsContributions,
        db.dpsPayouts,
        db.loans,
        db.loanRepayments,
        db.fdrs,
        db.fdrPayouts,
      ],
      async () => {
        const existing = await db.transactions.get(id)
        if (!existing) throw new AppDbError('NOT_FOUND', 'Transaction not found.')

        if (existing.type === 'credit_card') {
          // Bill payment: reverse the real ledger entry against the source
          // account, then give the outstanding balance back to the card —
          // the exact inverse of payCreditCardBill.
          const card = await db.creditCards.get(existing.creditCardId as string)
          await db.ledgerEntries.where('transactionId').equals(id).delete()
          await db.transactions.delete(id)
          await reconcileAccountBalanceCache(existing.accountId)
          if (card) {
            await db.creditCards.update(card.id, {
              outstandingBalance: card.outstandingBalance + existing.amount,
              updatedAt: Date.now(),
            })
          }
          return
        }

        if (existing.creditCardId) {
          const card = await db.creditCards.get(existing.creditCardId)
          await db.transactions.delete(id)
          if (card) {
            await db.creditCards.update(card.id, {
              outstandingBalance: Math.max(0, card.outstandingBalance - existing.amount),
              updatedAt: Date.now(),
            })
          }
          return
        }

        // Captured before the join-table rows are removed below, so we
        // know afterwards whether this transaction WAS a DPS/FDR payout.
        const wasDpsPayout =
          existing.type === 'dps' ? await db.dpsPayouts.where('transactionId').equals(id).first() : undefined
        const wasFdrPayout =
          existing.type === 'fdr' ? await db.fdrPayouts.where('transactionId').equals(id).first() : undefined

        const accountIds = affectedAccountIds(existing.accountId, existing.toAccountId)

        await db.ledgerEntries.where('transactionId').equals(id).delete()
        await db.transactions.delete(id)

        // Remove the paired auditable record, if any — a no-op on any
        // table where this transaction id isn't present.
        await db.dpsContributions.where('transactionId').equals(id).delete()
        await db.dpsPayouts.where('transactionId').equals(id).delete()
        await db.loanRepayments.where('transactionId').equals(id).delete()
        await db.fdrPayouts.where('transactionId').equals(id).delete()

        if (existing.type === 'dps' && existing.relatedEntityId) {
          const dps = await db.dps.get(existing.relatedEntityId)
          if (dps) {
            if (wasDpsPayout && dps.status === 'paid_out') {
              await db.dps.update(dps.id, { status: 'completed', updatedAt: Date.now() })
            } else if (!wasDpsPayout && dps.status === 'completed') {
              const remainingCount = await db.dpsContributions.where('dpsId').equals(dps.id).count()
              if (dps.openingInstallmentsPaid + remainingCount < dps.tenureMonths) {
                await db.dps.update(dps.id, { status: 'active', updatedAt: Date.now() })
              }
            }
          }
        }

        if (existing.type === 'loan' && existing.relatedEntityId) {
          const loan = await db.loans.get(existing.relatedEntityId)
          if (loan && loan.status === 'closed') {
            const remainingRepayments = await db.loanRepayments.where('loanId').equals(loan.id).toArray()
            // Only principalPortion counts against outstanding — interestPortion never did.
            const alreadyRepaidPrincipal = remainingRepayments.reduce((sum, r) => sum + r.principalPortion, 0)
            if (loan.principal - alreadyRepaidPrincipal > 0) {
              await db.loans.update(loan.id, { status: 'active', updatedAt: Date.now() })
            }
          }
        }

        if (existing.type === 'fdr' && existing.relatedEntityId) {
          const fdr = await db.fdrs.get(existing.relatedEntityId)
          if (fdr && wasFdrPayout && fdr.status === 'paid_out') {
            const stillHasPayout = await db.fdrPayouts.where('fdrId').equals(fdr.id).count()
            if (stillHasPayout === 0) {
              await db.fdrs.update(fdr.id, { status: 'active', updatedAt: Date.now() })
            }
          }
        }

        for (const accountId of accountIds) {
          await reconcileAccountBalanceCache(accountId)
        }
      }
    )
  } catch (error) {
    throw toAppDbError(error)
  }
}

// Re-exported so callers that already have a raw TransactionType (e.g.
// loading a row from the table) can check support before calling into
// the engine, without importing from the validation module directly.
export function isSupportedTransactionType(type: TransactionType): type is CoreTransactionType {
  return type === 'expense' || type === 'income' || type === 'transfer'
}
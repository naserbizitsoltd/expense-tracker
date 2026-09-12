// Account Reconciliation engine: compares the app's computed balance
// against a user-entered real-world balance and, when they differ,
// writes a single controlled ledger adjustment to bring them back in
// sync — mirrors goalService.ts (a single-entry 'adjustment' Transaction
// against a real account, kept out of Expense/Income/Category/Budget
// totals since those only look at 'expense'/'income' transactions).
//
// The account's balance cache is NEVER written directly here — every
// adjustment goes through the exact same transaction + ledger entry +
// reconcileAccountBalanceCache path every other money movement in the
// app uses (see transactionService.ts / goalService.ts). Every
// reconciliation — whether or not an adjustment was actually needed —
// is recorded in `reconciliations`, so "last reconciled date" and full
// history are always available without guessing from transaction data.

import { db } from '@/db/schema'
import { AppDbError, toAppDbError } from '@/db/errors'
import { generateId } from '@/db/id'
import { getAccountBalance, reconcileAccountBalanceCache } from './balanceService'
import type { Account, AccountReconciliation, LedgerEntry, Transaction } from '@/types/entities'

// Account types the Reconcile Account flow supports — real, physically
// checkable balances (cash in hand, a bank/mobile-wallet statement).
// Credit cards/savings/other aren't excluded for any deep reason other
// than matching the spec ("for bank accounts, cash and wallets").
const RECONCILABLE_TYPES: Account['type'][] = ['bank', 'cash', 'mobile_wallet']

export function isAccountReconcilable(account: Pick<Account, 'type'>): boolean {
  return RECONCILABLE_TYPES.includes(account.type)
}

export interface ReconciliationPreview {
  account: Account
  appBalance: number
  actualBalance: number
  difference: number
}

/** Read-only preview of the difference — used by the "Review Difference" step before the user confirms. */
export async function previewReconciliation(accountId: string, actualBalance: number): Promise<ReconciliationPreview> {
  try {
    const account = await db.accounts.get(accountId)
    if (!account) throw new AppDbError('NOT_FOUND', 'Account not found.')
    const appBalance = await getAccountBalance(accountId)
    return { account, appBalance, actualBalance, difference: actualBalance - appBalance }
  } catch (error) {
    throw toAppDbError(error)
  }
}

export interface ReconcileAccountInput {
  accountId: string
  actualBalance: number // integer, smallest unit — the real-world balance the user counted/checked
  note: string // required — reason for the adjustment / where the real number came from
  date?: number
}

/**
 * Records a reconciliation. If the app balance already matches the
 * entered actual balance, only a history row is written (adjustmentAmount
 * 0, transactionId null) — no transaction, no ledger entry, nothing
 * silently touched. Otherwise a single-entry 'adjustment' Transaction +
 * LedgerEntry is written against the account (never a direct write to
 * account.balance), and the balance cache is recomputed from the ledger
 * exactly like every other money movement in the app. Deleting the
 * resulting transaction later (via transactionService.deleteTransaction)
 * correctly reverses the adjustment — 'adjustment' isn't special-cased
 * there, so it falls through the generic ledger-entry + balance-cache
 * reversal path, same as a goal contribution.
 */
export async function reconcileAccount(input: ReconcileAccountInput): Promise<AccountReconciliation> {
  const { accountId, actualBalance, date = Date.now() } = input
  const note = input.note?.trim() ?? ''

  if (!Number.isInteger(actualBalance) || actualBalance < 0) {
    throw new AppDbError('INVALID_DATA', 'Actual balance must be a non-negative integer in the smallest currency unit.')
  }
  if (!note) {
    throw new AppDbError('INVALID_DATA', 'A reason/note is required to reconcile an account.')
  }

  try {
    return await db.transaction(
      'rw',
      db.transactions,
      db.ledgerEntries,
      db.accounts,
      db.reconciliations,
      async () => {
        const account = await db.accounts.get(accountId)
        if (!account) throw new AppDbError('NOT_FOUND', 'Account not found.')
        if (account.isArchived) throw new AppDbError('INVALID_DATA', 'This account is archived and cannot be reconciled.')
        if (!isAccountReconcilable(account)) {
          throw new AppDbError('INVALID_DATA', 'Only bank, cash, and mobile wallet accounts can be reconciled.')
        }

        // Read fresh, inside the transaction, so the adjustment is always
        // computed against the true current ledger state — never a stale
        // balance read from before this call started. This is also what
        // guarantees the adjustment is never double-counted: each
        // reconciliation zeroes out the gap against the ledger as it
        // stands at that exact moment, transfers/expenses/income/reversals
        // included.
        const appBalance = await getAccountBalance(accountId)
        const difference = actualBalance - appBalance

        const now = Date.now()
        let transactionId: string | null = null

        if (difference !== 0) {
          transactionId = generateId()
          const transaction: Transaction = {
            id: transactionId,
            type: 'adjustment',
            amount: Math.abs(difference),
            currency: account.currency,
            accountId,
            toAccountId: null,
            categoryId: null,
            creditCardId: null,
            debitCardId: null,
            relatedEntityId: null,
            note: note || 'Balance reconciliation adjustment',
            date,
            tags: [],
            splitGroupId: null,
            splitDescription: null,
            createdAt: now,
            updatedAt: now,
          }
          const ledgerEntry: LedgerEntry = {
            id: generateId(),
            transactionId,
            accountId,
            amount: difference, // positive brings the account UP to actual, negative brings it DOWN
            direction: difference >= 0 ? 'credit' : 'debit',
            date,
            createdAt: now,
          }

          await db.transactions.add(transaction)
          await db.ledgerEntries.add(ledgerEntry)
          await reconcileAccountBalanceCache(accountId)
        }

        const record: AccountReconciliation = {
          id: generateId(),
          accountId,
          date,
          appBalance,
          actualBalance,
          difference,
          adjustmentAmount: difference,
          transactionId,
          note,
          createdAt: now,
        }
        await db.reconciliations.add(record)

        return record
      }
    )
  } catch (error) {
    throw toAppDbError(error)
  }
}

/** Full reconciliation history for one account, newest first. */
export async function getReconciliationHistory(accountId: string): Promise<AccountReconciliation[]> {
  try {
    return await db.reconciliations.where('accountId').equals(accountId).reverse().sortBy('date')
  } catch (error) {
    throw toAppDbError(error)
  }
}

/** Most recent reconciliation date for an account, or null if it's never been reconciled. */
export async function getLastReconciledDate(accountId: string): Promise<number | null> {
  try {
    const history = await db.reconciliations.where('accountId').equals(accountId).reverse().sortBy('date')
    return history.length > 0 ? history[0].date : null
  } catch (error) {
    throw toAppDbError(error)
  }
}
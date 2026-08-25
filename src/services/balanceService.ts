// Centralized balance calculation service.
//
// This is the ONLY place account balances are computed. Every screen,
// report, or future feature that needs a balance must go through one
// of these functions instead of reading `account.balance` directly or
// re-implementing the sum itself.
//
// Balance = opening balance + sum of that account's ledger entries.
// The ledger (src/db: ledgerEntries table) is the source of truth;
// `account.balance` is a denormalized cache written by the transaction
// service purely so simple UI reads don't need to await a query, and
// it is always re-derived here rather than trusted blindly.

import { db } from '@/db/schema'
import { AppDbError, toAppDbError } from '@/db/errors'
import { ledgerEntryRepository } from '@/db/repositories'
import type { Account, LedgerEntry } from '@/types/entities'

function sumEntries(entries: LedgerEntry[]): number {
  let total = 0
  for (const entry of entries) total += entry.amount
  return total
}

/** Current balance for a single account, computed from opening balance + ledger. */
export async function getAccountBalance(accountId: string): Promise<number> {
  try {
    const account = await db.accounts.get(accountId)
    if (!account) throw new AppDbError('NOT_FOUND', 'Account not found.')
    const entries = await ledgerEntryRepository.getByAccount(accountId)
    return account.openingBalance + sumEntries(entries)
  } catch (error) {
    throw toAppDbError(error)
  }
}

/**
 * Current balances for several accounts at once, keyed by accountId.
 * Fetches all relevant ledger entries in a single query instead of one
 * query per account.
 */
export async function getAccountBalances(accountIds: string[]): Promise<Record<string, number>> {
  try {
    if (accountIds.length === 0) return {}
    const accounts = await db.accounts.bulkGet(accountIds)
    const entries = await ledgerEntryRepository.getByAccounts(accountIds)

    const sums: Record<string, number> = {}
    for (const entry of entries) {
      sums[entry.accountId] = (sums[entry.accountId] ?? 0) + entry.amount
    }

    const balances: Record<string, number> = {}
    accountIds.forEach((id, i) => {
      const account = accounts[i]
      if (!account) return
      balances[id] = account.openingBalance + (sums[id] ?? 0)
    })
    return balances
  } catch (error) {
    throw toAppDbError(error)
  }
}

/** Sum of every non-archived account's balance (net worth across active accounts). */
export async function getTotalActiveBalance(): Promise<number> {
  try {
    // Filtered in JS rather than via a `.where('isArchived').equals(...)`
    // index query: IndexedDB indexes don't reliably key on boolean values
    // across encodings, so a direct boolean filter is the robust choice
    // here — the accounts table is small, this is not a hot path.
    const activeAccounts = (await db.accounts.toArray()).filter((a: Account) => !a.isArchived)
    const balances = await getAccountBalances(activeAccounts.map((a: Account) => a.id))
    return Object.values(balances).reduce((sum, b) => sum + b, 0)
  } catch (error) {
    throw toAppDbError(error)
  }
}

/** Full ledger (all entries) for one account, oldest first — for history/reporting screens. */
export async function getAccountLedger(accountId: string): Promise<LedgerEntry[]> {
  try {
    return await ledgerEntryRepository.getByAccount(accountId)
  } catch (error) {
    throw toAppDbError(error)
  }
}

/** Balance an account held as of a specific point in time (inclusive). */
export async function getBalanceAtDate(accountId: string, atDate: number): Promise<number> {
  try {
    const account = await db.accounts.get(accountId)
    if (!account) throw new AppDbError('NOT_FOUND', 'Account not found.')
    const entries = await ledgerEntryRepository.getByAccountUpTo(accountId, atDate)
    return account.openingBalance + sumEntries(entries)
  } catch (error) {
    throw toAppDbError(error)
  }
}

/**
 * Recomputes an account's true balance from the ledger and writes it
 * back to the cached `account.balance` field. Called by the transaction
 * service, inside the same atomic Dexie transaction, after any ledger
 * mutation — never call this outside of that flow, and never write to
 * `account.balance` any other way.
 */
export async function reconcileAccountBalanceCache(accountId: string): Promise<number> {
  const balance = await getAccountBalance(accountId)
  await db.accounts.update(accountId, { balance, updatedAt: Date.now() })
  return balance
}
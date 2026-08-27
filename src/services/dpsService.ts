// DPS (Deposit Pension Scheme) engine: creating a DPS is just a record
// (no money moves yet); contributing to it writes a real ledger
// movement against the linked Account (type 'dps', traced back via
// relatedEntityId — kept out of Expense/Income/Category/Budget totals
// since those only look at 'expense'/'income' transactions). Mirrors
// goalService.ts / loanService.ts. Deposited amount is never cached —
// it's always the sum of actual contribution records (see
// getDpsDeposited), since contributions can be missed or partial.

import { db } from '@/db/schema'
import { AppDbError, toAppDbError } from '@/db/errors'
import { generateId } from '@/db/id'
import { reconcileAccountBalanceCache, getAccountBalance } from './balanceService'
import { getDpsProgress } from './dpsProgressService'
import type { Dps, DpsContribution, DpsPayout, Transaction, LedgerEntry } from '@/types/entities'

export interface CreateDpsInput {
  name: string
  institution: string
  referenceNumber?: string | null
  accountId: string
  monthlyInstallment: number // integer, smallest unit, > 0
  currency: Dps['currency']
  interestRate?: number | null
  tenureMonths: number // integer, > 0
  startDate: number
  maturityDate?: number | null
  notes?: string
  // Opening snapshot for a DPS that already exists in real life — see
  // Dps.openingInstallmentsPaid/openingDepositedAmount/openingInterestEarned.
  // All default to 0, which is exactly today's "brand-new DPS" behavior.
  openingInstallmentsPaid?: number
  openingDepositedAmount?: number
  openingInterestEarned?: number
}

export interface ContributeToDpsInput {
  dpsId: string
  accountId: string
  amount: number // integer, smallest unit, > 0
  date?: number
  notes?: string
}

/**
 * Sum of actual contribution records for one DPS, plus whatever was
 * already deposited before it was entered into the app (see
 * Dps.openingDepositedAmount) — never derived from the schedule.
 */
export async function getDpsDeposited(dpsId: string): Promise<{ total: number; count: number }> {
  try {
    const dps = await db.dps.get(dpsId)
    const contributions = await db.dpsContributions.where('dpsId').equals(dpsId).toArray()
    const openingDeposited = dps?.openingDepositedAmount ?? 0
    return { total: openingDeposited + contributions.reduce((sum, c) => sum + c.amount, 0), count: contributions.length }
  } catch (error) {
    throw toAppDbError(error)
  }
}

/** Deposited totals + contribution counts for several DPS at once, keyed by dpsId. */
export async function getDpsDepositedMany(dpsIds: string[]): Promise<Record<string, { total: number; count: number }>> {
  try {
    if (dpsIds.length === 0) return {}
    const [allDps, allContributions] = await Promise.all([
      db.dps.bulkGet(dpsIds),
      db.dpsContributions.where('dpsId').anyOf(dpsIds).toArray(),
    ])
    const result: Record<string, { total: number; count: number }> = {}
    for (const id of dpsIds) result[id] = { total: 0, count: 0 }
    for (const dps of allDps) {
      if (dps) result[dps.id].total += dps.openingDepositedAmount
    }
    for (const c of allContributions) {
      result[c.dpsId].total += c.amount
      result[c.dpsId].count += 1
    }
    return result
  } catch (error) {
    throw toAppDbError(error)
  }
}

export async function createDps(input: CreateDpsInput): Promise<Dps> {
  const {
    name,
    institution,
    referenceNumber = null,
    accountId,
    monthlyInstallment,
    currency,
    interestRate = null,
    tenureMonths,
    startDate,
    maturityDate = null,
    notes,
    openingInstallmentsPaid = 0,
    openingDepositedAmount = 0,
    openingInterestEarned = 0,
  } = input

  if (!name.trim()) throw new AppDbError('INVALID_DATA', 'DPS name is required.')
  if (!Number.isInteger(monthlyInstallment) || monthlyInstallment <= 0) {
    throw new AppDbError('INVALID_DATA', 'Monthly installment must be a positive integer in the smallest currency unit.')
  }
  if (!Number.isInteger(tenureMonths) || tenureMonths <= 0) {
    throw new AppDbError('INVALID_DATA', 'Number of installments must be a positive whole number.')
  }
  if (!Number.isInteger(openingInstallmentsPaid) || openingInstallmentsPaid < 0) {
    throw new AppDbError('INVALID_DATA', 'Installments already paid must be a non-negative whole number.')
  }
  if (openingInstallmentsPaid > tenureMonths) {
    throw new AppDbError('INVALID_DATA', 'Installments already paid cannot exceed the total number of installments.')
  }
  if (!Number.isInteger(openingDepositedAmount) || openingDepositedAmount < 0) {
    throw new AppDbError('INVALID_DATA', 'Amount already deposited must be a non-negative integer in the smallest currency unit.')
  }
  if (!Number.isInteger(openingInterestEarned) || openingInterestEarned < 0) {
    throw new AppDbError('INVALID_DATA', 'Interest already accumulated must be a non-negative integer in the smallest currency unit.')
  }

  try {
    const account = await db.accounts.get(accountId)
    if (!account) throw new AppDbError('INVALID_DATA', 'Account does not exist.')
    if (account.isArchived) throw new AppDbError('INVALID_DATA', 'This account is archived and cannot be used.')

    const now = Date.now()
    const dps: Dps = {
      id: generateId(),
      name: name.trim(),
      institution: institution.trim(),
      referenceNumber: referenceNumber?.trim() || null,
      accountId,
      monthlyInstallment,
      currency,
      interestRate,
      tenureMonths,
      startDate,
      maturityDate,
      // An existing DPS whose opening installments already cover the
      // full tenure is already complete the moment it's created.
      status: openingInstallmentsPaid >= tenureMonths ? 'completed' : 'active',
      notes: notes?.trim() ?? '',
      openingInstallmentsPaid,
      openingDepositedAmount,
      openingInterestEarned,
      createdAt: now,
      updatedAt: now,
    }
    await db.dps.add(dps)
    return dps
  } catch (error) {
    throw toAppDbError(error)
  }
}

/**
 * Records a contribution as a real ledger movement out of the linked
 * account (never a separate balance, never a plain Expense), then
 * flips the DPS to 'completed' once every scheduled installment has
 * an actual contribution record against it.
 */
export async function contributeToDps(input: ContributeToDpsInput): Promise<DpsContribution> {
  const { dpsId, accountId, amount, date = Date.now(), notes } = input

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new AppDbError('INVALID_DATA', 'Amount must be a positive integer in the smallest currency unit.')
  }

  try {
    return await db.transaction(
      'rw',
      db.transactions,
      db.ledgerEntries,
      db.accounts,
      db.dps,
      db.dpsContributions,
      async () => {
        const dps = await db.dps.get(dpsId)
        if (!dps) throw new AppDbError('NOT_FOUND', 'DPS not found.')
        if (dps.status === 'archived') {
          throw new AppDbError('INVALID_DATA', 'This DPS is archived. Restore it before adding a contribution.')
        }
        if (dps.status === 'paid_out') {
          throw new AppDbError('INVALID_DATA', 'This DPS has already been paid out and closed.')
        }
        if (dps.status === 'completed') {
          throw new AppDbError('INVALID_DATA', 'This DPS has already completed all scheduled installments.')
        }

        const account = await db.accounts.get(accountId)
        if (!account) throw new AppDbError('INVALID_DATA', 'Account does not exist.')
        if (account.isArchived) throw new AppDbError('INVALID_DATA', 'This account is archived and cannot be used.')

        const balance = await getAccountBalance(accountId)
        if (amount > balance) {
          throw new AppDbError('INVALID_DATA', `Insufficient balance in ${account.name}.`)
        }

        const now = Date.now()
        const transactionId = generateId()

        const transaction: Transaction = {
          id: transactionId,
          type: 'dps',
          amount,
          currency: account.currency,
          accountId,
          toAccountId: null,
          categoryId: null,
          creditCardId: null,
          debitCardId: null,
          relatedEntityId: dpsId,
          note: `Contribution to ${dps.name}`,
          date,
          createdAt: now,
          updatedAt: now,
        }
        const ledgerEntry: LedgerEntry = {
          id: generateId(),
          transactionId,
          accountId,
          amount: -amount, // leaves the account
          direction: 'debit',
          date,
          createdAt: now,
        }

        await db.transactions.add(transaction)
        await db.ledgerEntries.add(ledgerEntry)
        await reconcileAccountBalanceCache(accountId)

        const contribution: DpsContribution = {
          id: generateId(),
          dpsId,
          amount,
          accountId,
          transactionId,
          notes: notes?.trim() ?? '',
          date,
          createdAt: now,
        }
        await db.dpsContributions.add(contribution)

        // Fully scheduled once every installment has an actual
        // contribution record, counting whatever was already paid
        // before this DPS was entered into the app — not an
        // amount-derived guess, since contributions can be partial.
        const contributionCount = await db.dpsContributions.where('dpsId').equals(dpsId).count()
        if (dps.openingInstallmentsPaid + contributionCount >= dps.tenureMonths && dps.status === 'active') {
          await db.dps.update(dpsId, { status: 'completed', updatedAt: now })
        }
        return contribution
      }
    )
  } catch (error) {
    throw toAppDbError(error)
  }
}

export async function archiveDps(dpsId: string): Promise<void> {
  try {
    await db.dps.update(dpsId, { status: 'archived', updatedAt: Date.now() })
  } catch (error) {
    throw toAppDbError(error)
  }
}

export async function restoreDps(dpsId: string): Promise<void> {
  try {
    await db.dps.update(dpsId, { status: 'active', updatedAt: Date.now() })
  } catch (error) {
    throw toAppDbError(error)
  }
}

/** The recorded maturity payout for a DPS, if it has been paid out. */
export async function getDpsPayout(dpsId: string): Promise<DpsPayout | undefined> {
  try {
    return await db.dpsPayouts.where('dpsId').equals(dpsId).first()
  } catch (error) {
    throw toAppDbError(error)
  }
}

export interface ReceiveDpsMaturityInput {
  dpsId: string
  accountId: string
  profitAmount?: number // integer, smallest unit, >= 0 — explicitly entered, never calculated
  date?: number
  notes?: string
}

/**
 * Records a DPS's maturity payout as a real ledger movement INTO the
 * chosen account (never a plain Income transaction — always type
 * 'dps', relatedEntityId pointing back at the DPS, same pattern as
 * contributeToDps). The deposited principal is money returning, not
 * new income; only an explicitly entered profitAmount is ever added
 * on top — nothing is calculated automatically. Eligibility requires
 * every scheduled installment recorded AND the maturity date actually
 * reached (see dpsProgressService.getDpsProgress -> isMatured).
 * A DPS can only be paid out once: the status flip to 'paid_out'
 * (plus the DpsPayout record itself) makes a second payout impossible.
 */
export async function receiveDpsMaturity(input: ReceiveDpsMaturityInput): Promise<DpsPayout> {
  const { dpsId, accountId, profitAmount = 0, date = Date.now(), notes } = input

  if (!Number.isInteger(profitAmount) || profitAmount < 0) {
    throw new AppDbError('INVALID_DATA', 'Profit amount must be a non-negative integer in the smallest currency unit.')
  }

    // Read-only lookups happen outside the write transaction below —
  // Dexie's typed `db.transaction` overloads cap out at 5 tables, and
  // the write itself only needs transactions/ledgerEntries/accounts/
  // dps/dpsPayouts. Status + "already paid out" are re-checked again
  // once inside the transaction (see below) so nothing that changed
  // between these reads and the write can slip through.
  const dpsBefore = await db.dps.get(dpsId)
  if (!dpsBefore) throw toAppDbError(new AppDbError('NOT_FOUND', 'DPS not found.'))
  if (dpsBefore.status === 'paid_out') {
    throw toAppDbError(new AppDbError('INVALID_DATA', 'This DPS has already been paid out.'))
  }
  if (dpsBefore.status !== 'completed') {
    throw toAppDbError(new AppDbError('INVALID_DATA', 'DPS has not reached maturity.'))
  }

  const existingPayoutBefore = await db.dpsPayouts.where('dpsId').equals(dpsId).first()
  if (existingPayoutBefore) {
    throw toAppDbError(new AppDbError('INVALID_DATA', 'This DPS has already been paid out.'))
  }

  const contributions = await db.dpsContributions.where('dpsId').equals(dpsId).toArray()
  const progressBefore = getDpsProgress(dpsBefore, contributions.length)
  if (!progressBefore.isMatured) {
    throw toAppDbError(new AppDbError('INVALID_DATA', 'DPS has not reached maturity.'))
  }
  const depositedAmount = contributions.reduce((sum, c) => sum + c.amount, 0)

  try {
    return await db.transaction(
      'rw',
      db.transactions,
      db.ledgerEntries,
      db.accounts,
      db.dps,
      db.dpsPayouts,
      async () => {
        const dps = await db.dps.get(dpsId)
        if (!dps) throw new AppDbError('NOT_FOUND', 'DPS not found.')
        if (dps.status === 'paid_out') {
          throw new AppDbError('INVALID_DATA', 'This DPS has already been paid out.')
        }
        if (dps.status !== 'completed') {
          throw new AppDbError('INVALID_DATA', 'DPS has not reached maturity.')
        }

        const existingPayout = await db.dpsPayouts.where('dpsId').equals(dpsId).first()
        if (existingPayout) {
          throw new AppDbError('INVALID_DATA', 'This DPS has already been paid out.')
        }

        const account = await db.accounts.get(accountId)
        if (!account) throw new AppDbError('INVALID_DATA', 'Account does not exist.')
        if (account.isArchived) throw new AppDbError('INVALID_DATA', 'This account is archived and cannot be used.')

        const amount = depositedAmount + profitAmount

        const now = Date.now()
        const transactionId = generateId()

        const transaction: Transaction = {
          id: transactionId,
          type: 'dps',
          amount,
          currency: account.currency,
          accountId,
          toAccountId: null,
          categoryId: null,
          creditCardId: null,
          debitCardId: null,
          relatedEntityId: dpsId,
          note: `Maturity payout — ${dps.name}`,
          date,
          createdAt: now,
          updatedAt: now,
        }
        const ledgerEntry: LedgerEntry = {
          id: generateId(),
          transactionId,
          accountId,
          amount, // enters the account
          direction: 'credit',
          date,
          createdAt: now,
        }

        await db.transactions.add(transaction)
        await db.ledgerEntries.add(ledgerEntry)
        await reconcileAccountBalanceCache(accountId)

        const payout: DpsPayout = {
          id: generateId(),
          dpsId,
          depositedAmount,
          profitAmount,
          amount,
          accountId,
          transactionId,
          notes: notes?.trim() ?? '',
          date,
          createdAt: now,
        }
        await db.dpsPayouts.add(payout)
        await db.dps.update(dpsId, { status: 'paid_out', updatedAt: now })

        return payout
      }
    )
  } catch (error) {
    throw toAppDbError(error)
  }
}
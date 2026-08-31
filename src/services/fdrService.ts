// FDR (Fixed Deposit Receipt) engine: opening an FDR writes a real
// ledger movement (type 'fdr') against a real account — principal
// leaves the account immediately, mirroring how contributeToDps works.
// maturityAmount/profitAmount are NEVER calculated from interestRate —
// only ever what the user explicitly entered. Mirrors dpsService.ts.
//
// Renewal/rollover (renewFdr) and premature withdrawal
// (withdrawFdrPrematurely) both close the FDR permanently (status
// 'renewed' / 'withdrawn') and can each only happen once per FDR — the
// existing fdrPayouts uniqueness check (one row per fdrId) already
// guards all three closing paths (receiveFdrMaturity / renewFdr /
// withdrawFdrPrematurely) since renewFdr also writes an fdrPayouts row.

import { db } from '@/db/schema'
import { AppDbError, toAppDbError } from '@/db/errors'
import { generateId } from '@/db/id'
import { reconcileAccountBalanceCache } from './balanceService'
import type { Fdr, FdrPayout, Transaction, LedgerEntry } from '@/types/entities'

export interface CreateFdrInput {
  name: string
  institution: string
  referenceNumber?: string | null
  accountId: string
  principal: number // integer, smallest unit, > 0
  currency: Fdr['currency']
  interestRate?: number | null
  tenureMonths: number // integer, > 0
  startDate: number
  maturityDate?: number | null
  maturityAmount?: number | null
  notes?: string
}

/**
 * True only while status is still 'active' and the maturity date has
 * actually passed. Never persisted — always computed live, same
 * pattern as dpsProgressService.isMatured.
 */
export function isFdrMatured(fdr: Fdr): boolean {
  return fdr.status === 'active' && fdr.maturityDate !== null && Date.now() >= fdr.maturityDate
}

export interface FdrMaturitySummary {
  maturityAmount: number | null // explicit only, never derived from interestRate
  profitAmount: number | null // maturityAmount - principal, only if maturityAmount is known
}

/** Pure calculation from the FDR's own fields — reads nothing from the database. */
export function getFdrMaturitySummary(fdr: Fdr): FdrMaturitySummary {
  if (fdr.maturityAmount === null) {
    return { maturityAmount: null, profitAmount: null }
  }
  return { maturityAmount: fdr.maturityAmount, profitAmount: fdr.maturityAmount - fdr.principal }
}

export async function createFdr(input: CreateFdrInput): Promise<Fdr> {
  const {
    name,
    institution,
    referenceNumber = null,
    accountId,
    principal,
    currency,
    interestRate = null,
    tenureMonths,
    startDate,
    maturityDate = null,
    maturityAmount = null,
    notes,
  } = input

  if (!name.trim()) throw new AppDbError('INVALID_DATA', 'FDR name is required.')
  if (!Number.isInteger(principal) || principal <= 0) {
    throw new AppDbError('INVALID_DATA', 'Principal must be a positive integer in the smallest currency unit.')
  }
  if (!Number.isInteger(tenureMonths) || tenureMonths <= 0) {
    throw new AppDbError('INVALID_DATA', 'Tenure must be a positive whole number of months.')
  }

  try {
    return await db.transaction('rw', db.transactions, db.ledgerEntries, db.accounts, db.fdrs, async () => {
      const account = await db.accounts.get(accountId)
      if (!account) throw new AppDbError('INVALID_DATA', 'Account does not exist.')
      if (account.isArchived) throw new AppDbError('INVALID_DATA', 'This account is archived and cannot be used.')

      const now = Date.now()
      const fdrId = generateId()
      const transactionId = generateId()

      const transaction: Transaction = {
        id: transactionId,
        type: 'fdr',
        amount: principal,
        currency: account.currency,
        accountId,
        toAccountId: null,
        categoryId: null,
        creditCardId: null,
        debitCardId: null,
        relatedEntityId: fdrId,
        note: `Opened FDR — ${name.trim()}`,
        date: startDate,
        tags: [],
        splitGroupId: null,
        createdAt: now,
        updatedAt: now,
      }
      const ledgerEntry: LedgerEntry = {
        id: generateId(),
        transactionId,
        accountId,
        amount: -principal, // leaves the account
        direction: 'debit',
        date: startDate,
        createdAt: now,
      }

      await db.transactions.add(transaction)
      await db.ledgerEntries.add(ledgerEntry)
      await reconcileAccountBalanceCache(accountId)

      const fdr: Fdr = {
        id: fdrId,
        name: name.trim(),
        institution: institution.trim(),
        referenceNumber: referenceNumber?.trim() || null,
        accountId,
        principal,
        currency,
        interestRate,
        tenureMonths,
        startDate,
        maturityDate,
        maturityAmount,
        notes: notes?.trim() ?? '',
        status: 'active',
        previousFdrId: null,
        createdAt: now,
        updatedAt: now,
      }
      await db.fdrs.add(fdr)
      return fdr
    })
  } catch (error) {
    throw toAppDbError(error)
  }
}

export async function archiveFdr(fdrId: string): Promise<void> {
  try {
    await db.fdrs.update(fdrId, { status: 'archived', updatedAt: Date.now() })
  } catch (error) {
    throw toAppDbError(error)
  }
}

export async function restoreFdr(fdrId: string): Promise<void> {
  try {
    await db.fdrs.update(fdrId, { status: 'active', updatedAt: Date.now() })
  } catch (error) {
    throw toAppDbError(error)
  }
}

/** The recorded maturity/withdrawal payout for an FDR, if it has been closed. */
export async function getFdrPayout(fdrId: string): Promise<FdrPayout | undefined> {
  try {
    return await db.fdrPayouts.where('fdrId').equals(fdrId).first()
  } catch (error) {
    throw toAppDbError(error)
  }
}

export interface ReceiveFdrMaturityInput {
  fdrId: string
  accountId: string
  profitAmount?: number // integer, smallest unit, >= 0 — explicitly entered, never calculated
  date?: number
  notes?: string
}

/**
 * Records an FDR's maturity payout as a real ledger movement INTO the
 * chosen account. Principal returning is never counted as income;
 * only an explicitly entered profitAmount is ever added on top.
 * Eligibility requires status 'active' AND the maturity date actually
 * reached (see isFdrMatured). An FDR can only be paid out once.
 */
export async function receiveFdrMaturity(input: ReceiveFdrMaturityInput): Promise<FdrPayout> {
  const { fdrId, accountId, profitAmount = 0, date = Date.now(), notes } = input

  if (!Number.isInteger(profitAmount) || profitAmount < 0) {
    throw new AppDbError('INVALID_DATA', 'Profit amount must be a non-negative integer in the smallest currency unit.')
  }

  const fdrBefore = await db.fdrs.get(fdrId)
  if (!fdrBefore) throw toAppDbError(new AppDbError('NOT_FOUND', 'FDR not found.'))
  if (fdrBefore.status === 'paid_out') {
    throw toAppDbError(new AppDbError('INVALID_DATA', 'This FDR has already been paid out.'))
  }
  if (!isFdrMatured(fdrBefore)) {
    throw toAppDbError(new AppDbError('INVALID_DATA', 'FDR has not reached maturity.'))
  }

  const existingPayoutBefore = await db.fdrPayouts.where('fdrId').equals(fdrId).first()
  if (existingPayoutBefore) {
    throw toAppDbError(new AppDbError('INVALID_DATA', 'This FDR has already been paid out.'))
  }

  try {
    return await db.transaction('rw', db.transactions, db.ledgerEntries, db.accounts, db.fdrs, db.fdrPayouts, async () => {
      const fdr = await db.fdrs.get(fdrId)
      if (!fdr) throw new AppDbError('NOT_FOUND', 'FDR not found.')
      if (fdr.status === 'paid_out') {
        throw new AppDbError('INVALID_DATA', 'This FDR has already been paid out.')
      }
      if (!isFdrMatured(fdr)) {
        throw new AppDbError('INVALID_DATA', 'FDR has not reached maturity.')
      }

      const existingPayout = await db.fdrPayouts.where('fdrId').equals(fdrId).first()
      if (existingPayout) {
        throw new AppDbError('INVALID_DATA', 'This FDR has already been paid out.')
      }

      const account = await db.accounts.get(accountId)
      if (!account) throw new AppDbError('INVALID_DATA', 'Account does not exist.')
      if (account.isArchived) throw new AppDbError('INVALID_DATA', 'This account is archived and cannot be used.')

      const principalAmount = fdr.principal
      const amount = principalAmount + profitAmount

      const now = Date.now()
      const transactionId = generateId()

      const transaction: Transaction = {
        id: transactionId,
        type: 'fdr',
        amount,
        currency: account.currency,
        accountId,
        toAccountId: null,
        categoryId: null,
        creditCardId: null,
        debitCardId: null,
        relatedEntityId: fdrId,
        note: `Maturity payout — ${fdr.name}`,
        date,
        tags: [],
        splitGroupId: null,
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

      const payout: FdrPayout = {
        id: generateId(),
        fdrId,
        principalAmount,
        profitAmount,
        amount,
        accountId,
        transactionId,
        type: 'maturity',
        notes: notes?.trim() ?? '',
        date,
        createdAt: now,
      }
      await db.fdrPayouts.add(payout)
      await db.fdrs.update(fdrId, { status: 'paid_out', updatedAt: now })

      return payout
    })
  } catch (error) {
    throw toAppDbError(error)
  }
}

export interface RenewFdrInput {
  oldFdrId: string
  profitAmount?: number // integer, smallest unit, >= 0 — confirmed profit at maturity, explicitly entered
  renewalAmount: number // integer, smallest unit, > 0 — becomes the new FDR's principal; may be less than the matured amount (partial renewal)
  accountId: string // account the matured funds are credited into AND the new FDR's principal is drawn from
  newFdr: {
    name: string
    institution: string
    referenceNumber?: string | null
    interestRate?: number | null
    tenureMonths: number
    startDate: number
    maturityDate?: number | null
    maturityAmount?: number | null
    notes?: string
  }
}

export interface RenewFdrResult {
  oldFdr: Fdr
  newFdr: Fdr
}

/**
 * Rolls a matured FDR into a new one. Writes two real ledger movements
 * against the SAME account inside one atomic transaction — a credit of
 * the full matured amount (principal + confirmed profit) tagged to the
 * old FDR, and a debit of the chosen renewal amount tagged to the new
 * FDR — so the net effect on the account is exactly
 * (matured amount - renewal amount), never an inflated intermediate
 * balance. A renewalAmount equal to the full matured amount nets to
 * zero (pure rollover, no change in available balance); a smaller
 * renewalAmount leaves the difference available in the account
 * (partial renewal — the leftover is real money, not double-counted
 * income, since it's just the matured principal/profit that wasn't
 * re-locked). The old FDR's status flips to 'renewed' (never
 * 'paid_out' — that's reserved for receiveFdrMaturity) and the new
 * FDR's previousFdrId links back to it, building the renewal chain
 * used by Renewal History (see useFdr.useFdrRenewalChain).
 */
export async function renewFdr(input: RenewFdrInput): Promise<RenewFdrResult> {
  const { oldFdrId, profitAmount = 0, renewalAmount, accountId, newFdr } = input

  if (!Number.isInteger(profitAmount) || profitAmount < 0) {
    throw new AppDbError('INVALID_DATA', 'Profit amount must be a non-negative integer in the smallest currency unit.')
  }
  if (!Number.isInteger(renewalAmount) || renewalAmount <= 0) {
    throw new AppDbError('INVALID_DATA', 'Renewal amount must be a positive integer in the smallest currency unit.')
  }
  if (!newFdr.name.trim()) throw new AppDbError('INVALID_DATA', 'FDR name is required.')
  if (!Number.isInteger(newFdr.tenureMonths) || newFdr.tenureMonths <= 0) {
    throw new AppDbError('INVALID_DATA', 'Tenure must be a positive whole number of months.')
  }

  const oldBefore = await db.fdrs.get(oldFdrId)
  if (!oldBefore) throw toAppDbError(new AppDbError('NOT_FOUND', 'FDR not found.'))
  if (!isFdrMatured(oldBefore)) {
    throw toAppDbError(new AppDbError('INVALID_DATA', 'FDR has not reached maturity.'))
  }
  const existingPayoutBefore = await db.fdrPayouts.where('fdrId').equals(oldFdrId).first()
  if (existingPayoutBefore) {
    throw toAppDbError(new AppDbError('INVALID_DATA', 'This FDR has already been paid out.'))
  }

  const maturedAmount = oldBefore.principal + profitAmount
  if (renewalAmount > maturedAmount) {
    throw toAppDbError(new AppDbError('INVALID_DATA', 'Renewal amount cannot exceed the matured amount.'))
  }

  try {
    return await db.transaction('rw', db.transactions, db.ledgerEntries, db.accounts, db.fdrs, db.fdrPayouts, async () => {
      const oldFdrRow = await db.fdrs.get(oldFdrId)
      if (!oldFdrRow) throw new AppDbError('NOT_FOUND', 'FDR not found.')
      if (!isFdrMatured(oldFdrRow)) {
        throw new AppDbError('INVALID_DATA', 'FDR has not reached maturity.')
      }
      const existingPayout = await db.fdrPayouts.where('fdrId').equals(oldFdrId).first()
      if (existingPayout) {
        throw new AppDbError('INVALID_DATA', 'This FDR has already been paid out.')
      }

      const account = await db.accounts.get(accountId)
      if (!account) throw new AppDbError('INVALID_DATA', 'Account does not exist.')
      if (account.isArchived) throw new AppDbError('INVALID_DATA', 'This account is archived and cannot be used.')

      const now = Date.now()

      // 1) Credit the matured amount, closing the old FDR.
      const maturityTxId = generateId()
      const maturityTransaction: Transaction = {
        id: maturityTxId,
        type: 'fdr',
        amount: maturedAmount,
        currency: account.currency,
        accountId,
        toAccountId: null,
        categoryId: null,
        creditCardId: null,
        debitCardId: null,
        relatedEntityId: oldFdrId,
        note: `Matured — renewed into ${newFdr.name.trim()}`,
        date: now,
        tags: [],
        splitGroupId: null,
        createdAt: now,
        updatedAt: now,
      }
      const maturityEntry: LedgerEntry = {
        id: generateId(),
        transactionId: maturityTxId,
        accountId,
        amount: maturedAmount,
        direction: 'credit',
        date: now,
        createdAt: now,
      }
      await db.transactions.add(maturityTransaction)
      await db.ledgerEntries.add(maturityEntry)

      // 2) Debit the renewal amount, opening the new FDR.
      const newFdrId = generateId()
      const openingTxId = generateId()
      const openingTransaction: Transaction = {
        id: openingTxId,
        type: 'fdr',
        amount: renewalAmount,
        currency: account.currency,
        accountId,
        toAccountId: null,
        categoryId: null,
        creditCardId: null,
        debitCardId: null,
        relatedEntityId: newFdrId,
        note: `Opened FDR — ${newFdr.name.trim()} (renewed from ${oldFdrRow.name})`,
        date: newFdr.startDate,
        tags: [],
        splitGroupId: null,
        createdAt: now,
        updatedAt: now,
      }
      const openingEntry: LedgerEntry = {
        id: generateId(),
        transactionId: openingTxId,
        accountId,
        amount: -renewalAmount,
        direction: 'debit',
        date: newFdr.startDate,
        createdAt: now,
      }
      await db.transactions.add(openingTransaction)
      await db.ledgerEntries.add(openingEntry)

      await reconcileAccountBalanceCache(accountId)

      // Auditable record of the matured payout that funded the renewal —
      // same table/shape as a normal maturity payout.
      const payout: FdrPayout = {
        id: generateId(),
        fdrId: oldFdrId,
        principalAmount: oldFdrRow.principal,
        profitAmount,
        amount: maturedAmount,
        accountId,
        transactionId: maturityTxId,
        type: 'maturity',
        notes: `Renewed into ${newFdr.name.trim()}`,
        date: now,
        createdAt: now,
      }
      await db.fdrPayouts.add(payout)
      await db.fdrs.update(oldFdrId, { status: 'renewed', updatedAt: now })

      const newFdrRecord: Fdr = {
        id: newFdrId,
        name: newFdr.name.trim(),
        institution: newFdr.institution.trim(),
        referenceNumber: newFdr.referenceNumber?.trim() || null,
        accountId,
        principal: renewalAmount,
        currency: account.currency,
        interestRate: newFdr.interestRate ?? null,
        tenureMonths: newFdr.tenureMonths,
        startDate: newFdr.startDate,
        maturityDate: newFdr.maturityDate ?? null,
        maturityAmount: newFdr.maturityAmount ?? null,
        notes: newFdr.notes?.trim() ?? '',
        status: 'active',
        previousFdrId: oldFdrId,
        createdAt: now,
        updatedAt: now,
      }
      await db.fdrs.add(newFdrRecord)

      const updatedOld = await db.fdrs.get(oldFdrId)
      return { oldFdr: updatedOld as Fdr, newFdr: newFdrRecord }
    })
  } catch (error) {
    throw toAppDbError(error)
  }
}

export interface PrematureWithdrawFdrInput {
  fdrId: string
  accountId: string
  withdrawalAmount: number // integer, smallest unit, > 0 — the actual amount to receive, entered/confirmed by the user (no penalty formula is calculated)
  date?: number
  notes?: string
}

/**
 * Closes an active FDR before its maturity date, crediting the chosen
 * account with an amount the user enters/confirms directly — the
 * system has no bank-specific penalty rules, so nothing is calculated.
 * principalAmount is always the FDR's stored principal; profitAmount is
 * withdrawalAmount - principalAmount and may be negative if a penalty
 * brought the payout below principal. Sets status to 'withdrawn'
 * (distinct from the normal 'paid_out' maturity flow) and can only
 * happen once per FDR.
 */
export async function withdrawFdrPrematurely(input: PrematureWithdrawFdrInput): Promise<FdrPayout> {
  const { fdrId, accountId, withdrawalAmount, date = Date.now(), notes } = input

  if (!Number.isInteger(withdrawalAmount) || withdrawalAmount <= 0) {
    throw new AppDbError('INVALID_DATA', 'Withdrawal amount must be a positive integer in the smallest currency unit.')
  }

  const fdrBefore = await db.fdrs.get(fdrId)
  if (!fdrBefore) throw toAppDbError(new AppDbError('NOT_FOUND', 'FDR not found.'))
  if (fdrBefore.status !== 'active') {
    throw toAppDbError(new AppDbError('INVALID_DATA', 'Only an active FDR can be withdrawn prematurely.'))
  }
  const existingPayoutBefore = await db.fdrPayouts.where('fdrId').equals(fdrId).first()
  if (existingPayoutBefore) {
    throw toAppDbError(new AppDbError('INVALID_DATA', 'This FDR has already been paid out.'))
  }

  try {
    return await db.transaction('rw', db.transactions, db.ledgerEntries, db.accounts, db.fdrs, db.fdrPayouts, async () => {
      const fdr = await db.fdrs.get(fdrId)
      if (!fdr) throw new AppDbError('NOT_FOUND', 'FDR not found.')
      if (fdr.status !== 'active') {
        throw new AppDbError('INVALID_DATA', 'Only an active FDR can be withdrawn prematurely.')
      }
      const existingPayout = await db.fdrPayouts.where('fdrId').equals(fdrId).first()
      if (existingPayout) {
        throw new AppDbError('INVALID_DATA', 'This FDR has already been paid out.')
      }

      const account = await db.accounts.get(accountId)
      if (!account) throw new AppDbError('INVALID_DATA', 'Account does not exist.')
      if (account.isArchived) throw new AppDbError('INVALID_DATA', 'This account is archived and cannot be used.')

      const principalAmount = fdr.principal
      const profitAmount = withdrawalAmount - principalAmount

      const now = Date.now()
      const transactionId = generateId()

      const transaction: Transaction = {
        id: transactionId,
        type: 'fdr',
        amount: withdrawalAmount,
        currency: account.currency,
        accountId,
        toAccountId: null,
        categoryId: null,
        creditCardId: null,
        debitCardId: null,
        relatedEntityId: fdrId,
        note: `Premature withdrawal — ${fdr.name}`,
        date,
        tags: [],
        splitGroupId: null,
        createdAt: now,
        updatedAt: now,
      }
      const ledgerEntry: LedgerEntry = {
        id: generateId(),
        transactionId,
        accountId,
        amount: withdrawalAmount,
        direction: 'credit',
        date,
        createdAt: now,
      }

      await db.transactions.add(transaction)
      await db.ledgerEntries.add(ledgerEntry)
      await reconcileAccountBalanceCache(accountId)

      const payout: FdrPayout = {
        id: generateId(),
        fdrId,
        principalAmount,
        profitAmount,
        amount: withdrawalAmount,
        accountId,
        transactionId,
        type: 'premature',
        notes: notes?.trim() ?? '',
        date,
        createdAt: now,
      }
      await db.fdrPayouts.add(payout)
      await db.fdrs.update(fdrId, { status: 'withdrawn', updatedAt: now })

      return payout
    })
  } catch (error) {
    throw toAppDbError(error)
  }
}
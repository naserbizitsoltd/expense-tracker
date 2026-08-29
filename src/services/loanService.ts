// Loan money-movement engine: disbursement, and repayment, both as
// real ledger movements against a real Account (type 'loan', traced
// back to the loan via relatedEntityId — kept out of Expense/Income/
// Category/Budget totals since those only look at 'expense'/'income'
// transactions). Mirrors goalService.ts.
//
// Outstanding PRINCIPAL is never stored on the Loan record. It is
// always derived as principal - sum(repayment.principalPortion) — see
// getLoanOutstanding. interestPortion never reduces it.

import { db } from '@/db/schema'
import { AppDbError, toAppDbError } from '@/db/errors'
import { generateId } from '@/db/id'
import { reconcileAccountBalanceCache, getAccountBalance } from './balanceService'
import type { Loan, LoanRepayment, Transaction, LedgerEntry } from '@/types/entities'

export interface DisburseLoanInput {
  direction: 'given' | 'taken'
  counterpartyName: string
  principal: number // integer, smallest unit, > 0 — the full amount owed
  currency: Loan['currency']
  accountId: string
  interestRate?: number | null
  interestRateType?: 'monthly' | 'yearly' | null // how interestRate should be read; null when interestRate is null
  tenureMonths?: number | null // loan duration in months, user-entered
  startDate: number
  dueDate?: number | null
  notes?: string
  processingFee?: number // integer, smallest unit, >= 0 — only meaningful for 'taken' loans; ignored (forced to 0) for 'given'
}

export interface RepayLoanInput {
  loanId: string
  accountId: string
  amount: number // integer, smallest unit, > 0 — total actually paid, manually entered by the user (principal + interest)
  interestPortion?: number // integer, smallest unit, >= 0, <= amount — actual interest portion of `amount`. When omitted, it's derived automatically as whatever `amount` exceeds the outstanding principal by — so a manual full-settlement payment (e.g. paying 510 against 500 outstanding) just works without the user splitting it themselves.
  calculatedInterest?: number | null // kept for backward-compatible audit/display only; always null now that there's no calculator suggesting a figure
  isInterestOverridden?: boolean // kept for backward compatibility; always false now
  date?: number
  notes?: string
}

/** Real cash that lands in the account on disbursement — principal minus any processing fee. A processing fee only ever applies to a 'taken' loan (money you borrow); it's meaningless for 'given', so this always returns the full principal for those. Never reduces `principal`, the amount still owed. */
export function getLoanAmountReceived(loan: Pick<Loan, 'direction' | 'principal' | 'processingFee'>): number {
  if (loan.direction !== 'taken') return loan.principal
  return Math.max(0, loan.principal - loan.processingFee)
}

/** principal - sum(repayment.principalPortion) for a single loan. interestPortion never counts against this. Never let anywhere else store/cache this. */
export async function getLoanOutstanding(loanId: string): Promise<number> {
  try {
    const loan = await db.loans.get(loanId)
    if (!loan) throw new AppDbError('NOT_FOUND', 'Loan not found.')
    const repayments = await db.loanRepayments.where('loanId').equals(loanId).toArray()
    const principalRepaid = repayments.reduce((sum, r) => sum + r.principalPortion, 0)
    return Math.max(0, loan.principal - principalRepaid)
  } catch (error) {
    throw toAppDbError(error)
  }
}

/** Outstanding principal for several loans at once, keyed by loanId — avoids one query per row in a list. */
export async function getLoanOutstandings(loanIds: string[]): Promise<Record<string, number>> {
  try {
    if (loanIds.length === 0) return {}
    const loans = await db.loans.bulkGet(loanIds)
    const allRepayments = await db.loanRepayments.where('loanId').anyOf(loanIds).toArray()
    const principalRepaidByLoan: Record<string, number> = {}
    for (const r of allRepayments) {
      principalRepaidByLoan[r.loanId] = (principalRepaidByLoan[r.loanId] ?? 0) + r.principalPortion
    }

    const outstandings: Record<string, number> = {}
    loanIds.forEach((id, i) => {
      const loan = loans[i]
      if (!loan) return
      outstandings[id] = Math.max(0, loan.principal - (principalRepaidByLoan[id] ?? 0))
    })
    return outstandings
  } catch (error) {
    throw toAppDbError(error)
  }
}

/**
 * Creates a Loan and, in the same atomic transaction, writes the real
 * ledger movement for receiving/giving the principal:
 *   - taken (borrowed): money comes IN to accountId (credit) — reduced
 *     by processingFee, since that's the cash that actually lands.
 *     `principal` itself (the amount owed) is NEVER reduced by the fee.
 *   - given (lent):     money goes OUT of accountId (debit) — full principal, no fee.
 * Never a plain income/expense — always type 'loan', relatedEntityId
 * pointing back at the new loan.
 */
export async function disburseLoan(input: DisburseLoanInput): Promise<Loan> {
  const {
    direction,
    counterpartyName,
    principal,
    currency,
    accountId,
    interestRate = null,
    interestRateType = null,
    tenureMonths = null,
    startDate,
    dueDate = null,
    notes,
  } = input

  if (!Number.isInteger(principal) || principal <= 0) {
    throw new AppDbError('INVALID_DATA', 'Amount must be a positive integer in the smallest currency unit.')
  }
  if (!counterpartyName?.trim()) {
    throw new AppDbError('INVALID_DATA', 'Counterparty name is required.')
  }
  if (tenureMonths != null && (!Number.isInteger(tenureMonths) || tenureMonths <= 0)) {
    throw new AppDbError('INVALID_DATA', 'Tenure must be a positive whole number of months.')
  }

  // A processing fee only ever applies to money you borrow.
  const processingFee = direction === 'taken' ? (input.processingFee ?? 0) : 0
  if (!Number.isInteger(processingFee) || processingFee < 0) {
    throw new AppDbError('INVALID_DATA', 'Processing fee must be a non-negative integer in the smallest currency unit.')
  }
  if (processingFee >= principal) {
    throw new AppDbError('INVALID_DATA', 'Processing fee must be less than the loan principal.')
  }

  try {
    return await db.transaction(
      'rw',
      db.transactions,
      db.ledgerEntries,
      db.accounts,
      db.loans,
      async () => {
        const account = await db.accounts.get(accountId)
        if (!account) throw new AppDbError('INVALID_DATA', 'Account does not exist.')
        if (account.isArchived) {
          throw new AppDbError('INVALID_DATA', 'This account is archived and cannot be used.')
        }

        if (direction === 'given') {
          const balance = await getAccountBalance(accountId)
          if (principal > balance) {
            throw new AppDbError('INVALID_DATA', `Insufficient balance in ${account.name}.`)
          }
        }

        const now = Date.now()
        const loanId = generateId()
        const transactionId = generateId()

        // The real cash that lands in the account — principal minus the
        // fee for 'taken' (processingFee is always 0 for 'given').
        const amountReceived = principal - processingFee

        const loan: Loan = {
          id: loanId,
          direction,
          counterpartyName: counterpartyName.trim(),
          principal,
          currency,
          interestRate,
          interestRateType: interestRate != null ? interestRateType : null,
          tenureMonths,
          accountId,
          startDate,
          dueDate,
          status: 'active',
          notes: notes?.trim() ?? '',
          processingFee,
          createdAt: now,
          updatedAt: now,
        }

        // taken: money received -> credit (+), reduced by the fee.
        // given: money paid out -> debit (-), full principal.
        const ledgerAmount = direction === 'taken' ? amountReceived : -principal
        const transactionAmount = direction === 'taken' ? amountReceived : principal

        const transaction: Transaction = {
          id: transactionId,
          type: 'loan',
          amount: transactionAmount,
          currency: account.currency,
          accountId,
          toAccountId: null,
          categoryId: null,
          creditCardId: null,
          debitCardId: null,
          relatedEntityId: loanId,
          note:
            direction === 'taken'
              ? `Loan received from ${loan.counterpartyName}`
              : `Loan given to ${loan.counterpartyName}`,
          date: startDate,
          createdAt: now,
          updatedAt: now,
        }
        const ledgerEntry: LedgerEntry = {
          id: generateId(),
          transactionId,
          accountId,
          amount: ledgerAmount,
          direction: ledgerAmount >= 0 ? 'credit' : 'debit',
          date: startDate,
          createdAt: now,
        }

        await db.loans.add(loan)
        await db.transactions.add(transaction)
        await db.ledgerEntries.add(ledgerEntry)
        await reconcileAccountBalanceCache(accountId)

        return loan
      }
    )
  } catch (error) {
    throw toAppDbError(error)
  }
}

/**
 * Records a repayment against a loan as a real ledger movement, and
 * closes the loan automatically once outstanding PRINCIPAL hits zero.
 * `amount` is manually entered by the user — the full real cash that
 * moves. When `interestPortion` isn't explicitly passed, it's derived
 * as whatever `amount` exceeds the outstanding principal by: paying
 * less than or equal to outstanding is all principal; paying more
 * (an early full-settlement figure quoted by the lender, which is
 * usually less than the original schedule's total interest) has the
 * excess automatically counted as interest. This is what lets a user
 * simply type the lender's quoted settlement figure — e.g. 510 against
 * 500 outstanding — without working out the split themselves.
 */
export async function repayLoan(input: RepayLoanInput): Promise<LoanRepayment> {
  const {
    loanId,
    accountId,
    amount,
    interestPortion: interestPortionInput,
    calculatedInterest = null,
    isInterestOverridden = false,
    date = Date.now(),
    notes,
  } = input

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new AppDbError('INVALID_DATA', 'Amount must be a positive integer in the smallest currency unit.')
  }
  if (interestPortionInput !== undefined) {
    if (!Number.isInteger(interestPortionInput) || interestPortionInput < 0) {
      throw new AppDbError('INVALID_DATA', 'Interest portion must be a non-negative integer in the smallest currency unit.')
    }
    if (interestPortionInput > amount) {
      throw new AppDbError('INVALID_DATA', "Interest portion can't exceed the payment amount.")
    }
  }

  try {
    return await db.transaction(
      'rw',
      db.transactions,
      db.ledgerEntries,
      db.accounts,
      db.loans,
      db.loanRepayments,
      async () => {
        const loan = await db.loans.get(loanId)
        if (!loan) throw new AppDbError('NOT_FOUND', 'Loan not found.')
        if (loan.status === 'closed') {
          throw new AppDbError('INVALID_DATA', 'This loan is already closed.')
        }

        const account = await db.accounts.get(accountId)
        if (!account) throw new AppDbError('INVALID_DATA', 'Account does not exist.')
        if (account.isArchived) {
          throw new AppDbError('INVALID_DATA', 'This account is archived and cannot be used.')
        }

        const existingRepayments = await db.loanRepayments.where('loanId').equals(loanId).toArray()
        const alreadyRepaidPrincipal = existingRepayments.reduce((sum, r) => sum + r.principalPortion, 0)
        const outstandingPrincipal = Math.max(0, loan.principal - alreadyRepaidPrincipal)

        // Manual amount, auto-split: anything above outstanding principal is interest.
        const interestPortion = interestPortionInput ?? Math.max(0, amount - outstandingPrincipal)
        const principalPortion = amount - interestPortion

        if (principalPortion > outstandingPrincipal) {
          throw new AppDbError(
            'INVALID_DATA',
            "The principal portion of this payment can't exceed the loan's outstanding principal."
          )
        }

        // taken: paying the lender back -> money leaves the account. The
        // FULL amount (principal + interest) is what actually moves.
        if (loan.direction === 'taken') {
          const balance = await getAccountBalance(accountId)
          if (amount > balance) {
            throw new AppDbError('INVALID_DATA', `Insufficient balance in ${account.name}.`)
          }
        }

        const now = Date.now()
        const transactionId = generateId()

        // taken: money leaves the account (debit). given: borrower's repayment arrives (credit).
        const ledgerAmount = loan.direction === 'taken' ? -amount : amount

        const transaction: Transaction = {
          id: transactionId,
          type: 'loan',
          amount,
          currency: account.currency,
          accountId,
          toAccountId: null,
          categoryId: null,
          creditCardId: null,
          debitCardId: null,
          relatedEntityId: loanId,
          note:
            loan.direction === 'taken'
              ? `Repayment to ${loan.counterpartyName}`
              : `Repayment received from ${loan.counterpartyName}`,
          date,
          createdAt: now,
          updatedAt: now,
        }
        const ledgerEntry: LedgerEntry = {
          id: generateId(),
          transactionId,
          accountId,
          amount: ledgerAmount,
          direction: ledgerAmount >= 0 ? 'credit' : 'debit',
          date,
          createdAt: now,
        }

        await db.transactions.add(transaction)
        await db.ledgerEntries.add(ledgerEntry)
        await reconcileAccountBalanceCache(accountId)

        // Loan closes once outstanding PRINCIPAL is cleared — an early
        // settlement where the lender's actual interest differs from
        // the default estimate still closes the loan correctly, since
        // interestPortion never factors into this check.
        const newOutstandingPrincipal = outstandingPrincipal - principalPortion
        if (newOutstandingPrincipal <= 0) {
          await db.loans.update(loanId, { status: 'closed', updatedAt: now })
        }

        const repayment: LoanRepayment = {
          id: generateId(),
          loanId,
          amount,
          principalPortion,
          interestPortion,
          calculatedInterest,
          isInterestOverridden,
          accountId,
          transactionId,
          notes: notes?.trim() ?? '',
          date,
          createdAt: now,
        }
        await db.loanRepayments.add(repayment)

        return repayment
      }
    )
  } catch (error) {
    throw toAppDbError(error)
  }
}
// Loan money-movement engine: disbursement, and repayment, both as
// real ledger movements against a real Account (type 'loan', traced
// back to the loan via relatedEntityId — kept out of Expense/Income/
// Category/Budget totals since those only look at 'expense'/'income'
// transactions). Mirrors goalService.ts.
//
// Outstanding is never stored on the Loan record. It is always
// derived as principal - sum(repayments) — see getLoanOutstanding.

import { db } from '@/db/schema'
import { AppDbError, toAppDbError } from '@/db/errors'
import { generateId } from '@/db/id'
import { reconcileAccountBalanceCache, getAccountBalance } from './balanceService'
import type { Loan, LoanRepayment, Transaction, LedgerEntry } from '@/types/entities'

export interface DisburseLoanInput {
  direction: 'given' | 'taken'
  counterpartyName: string
  principal: number // integer, smallest unit, > 0
  currency: Loan['currency']
  accountId: string
  interestRate?: number | null
  startDate: number
  dueDate?: number | null
  notes?: string
}

export interface RepayLoanInput {
  loanId: string
  accountId: string
  amount: number // integer, smallest unit, > 0
  date?: number
  notes?: string
}

/** principal - sum(repayments) for a single loan. Never let anywhere else store/cache this. */
export async function getLoanOutstanding(loanId: string): Promise<number> {
  try {
    const loan = await db.loans.get(loanId)
    if (!loan) throw new AppDbError('NOT_FOUND', 'Loan not found.')
    const repayments = await db.loanRepayments.where('loanId').equals(loanId).toArray()
    const totalRepaid = repayments.reduce((sum, r) => sum + r.amount, 0)
    return Math.max(0, loan.principal - totalRepaid)
  } catch (error) {
    throw toAppDbError(error)
  }
}

/** Outstanding for several loans at once, keyed by loanId — avoids one query per row in a list. */
export async function getLoanOutstandings(loanIds: string[]): Promise<Record<string, number>> {
  try {
    if (loanIds.length === 0) return {}
    const loans = await db.loans.bulkGet(loanIds)
    const allRepayments = await db.loanRepayments.where('loanId').anyOf(loanIds).toArray()
    const repaidByLoan: Record<string, number> = {}
    for (const r of allRepayments) repaidByLoan[r.loanId] = (repaidByLoan[r.loanId] ?? 0) + r.amount

    const outstandings: Record<string, number> = {}
    loanIds.forEach((id, i) => {
      const loan = loans[i]
      if (!loan) return
      outstandings[id] = Math.max(0, loan.principal - (repaidByLoan[id] ?? 0))
    })
    return outstandings
  } catch (error) {
    throw toAppDbError(error)
  }
}

/**
 * Creates a Loan and, in the same atomic transaction, writes the real
 * ledger movement for receiving/giving the principal:
 *   - taken (borrowed): money comes IN to accountId (credit)
 *   - given (lent):     money goes OUT of accountId (debit)
 * Never a plain income/expense — always type 'loan', relatedEntityId
 * pointing back at the new loan.
 */
export async function disburseLoan(input: DisburseLoanInput): Promise<Loan> {
  const { direction, counterpartyName, principal, currency, accountId, interestRate = null, startDate, dueDate = null, notes } = input

  if (!Number.isInteger(principal) || principal <= 0) {
    throw new AppDbError('INVALID_DATA', 'Amount must be a positive integer in the smallest currency unit.')
  }
  if (!counterpartyName?.trim()) {
    throw new AppDbError('INVALID_DATA', 'Counterparty name is required.')
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

        const loan: Loan = {
          id: loanId,
          direction,
          counterpartyName: counterpartyName.trim(),
          principal,
          currency,
          interestRate,
          accountId,
          startDate,
          dueDate,
          status: 'active',
          notes: notes?.trim() ?? '',
          createdAt: now,
          updatedAt: now,
        }

        // taken: money received -> credit (+). given: money paid out -> debit (-).
        const ledgerAmount = direction === 'taken' ? principal : -principal

        const transaction: Transaction = {
          id: transactionId,
          type: 'loan',
          amount: principal,
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
 * closes the loan automatically once outstanding hits zero:
 *   - taken (borrowed): repaying back to lender -> money leaves accountId (debit)
 *   - given (lent):     borrower repays you -> money enters accountId (credit)
 * Never a plain income/expense — always type 'loan', relatedEntityId
 * pointing back at the loan. Outstanding is derived, never cached.
 */
export async function repayLoan(input: RepayLoanInput): Promise<LoanRepayment> {
  const { loanId, accountId, amount, date = Date.now(), notes } = input

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new AppDbError('INVALID_DATA', 'Amount must be a positive integer in the smallest currency unit.')
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
        const alreadyRepaid = existingRepayments.reduce((sum, r) => sum + r.amount, 0)
        const outstanding = Math.max(0, loan.principal - alreadyRepaid)

        if (amount > outstanding) {
          throw new AppDbError('INVALID_DATA', "You can't repay more than the loan's outstanding amount.")
        }

        // taken: paying the lender back -> money leaves the account.
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

                const newOutstanding = outstanding - amount
        if (newOutstanding <= 0) {
          await db.loans.update(loanId, { status: 'closed', updatedAt: now })
        }

        const repayment: LoanRepayment = {
          id: generateId(),
          loanId,
          amount,
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
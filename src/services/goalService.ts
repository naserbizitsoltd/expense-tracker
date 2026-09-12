// Savings Goal engine: moves real money between an Account and a
// Goal's tracked saved amount. Goal money is never a separate pool
// counted alongside account balances — contributing to a goal is a
// real ledger movement out of the source account (type 'adjustment',
// traced back to the goal via relatedEntityId, which keeps it out of
// Expense/Income/Category/Budget totals since those only look at
// 'expense'/'income' transactions), and the goal's own currentAmount
// is the only place the saved total lives. Nothing else in the app
// sums currentAmount into "total available", so nothing is ever
// double-counted.

import { db } from '@/db/schema'
import { AppDbError, toAppDbError } from '@/db/errors'
import { generateId } from '@/db/id'
import { reconcileAccountBalanceCache, getAccountBalance } from './balanceService'
import type { GoalTransaction, Transaction, LedgerEntry } from '@/types/entities'
export type GoalMoneyDirection = 'contribution' | 'withdrawal'

export interface MoveGoalMoneyInput {
  goalId: string
  accountId: string
  amount: number // integer, smallest unit, > 0
  note?: string
}

async function moveGoalMoney(direction: GoalMoneyDirection, input: MoveGoalMoneyInput): Promise<GoalTransaction> {
  const { goalId, accountId, amount, note } = input
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new AppDbError('INVALID_DATA', 'Amount must be a positive integer in the smallest currency unit.')
  }

  try {
    return await db.transaction(
      'rw',
      db.transactions,
      db.ledgerEntries,
      db.accounts,
      db.goals,
      db.goalTransactions,
      async () => {
        const goal = await db.goals.get(goalId)
        if (!goal) throw new AppDbError('NOT_FOUND', 'Goal not found.')
        if (goal.status === 'archived') {
          throw new AppDbError('INVALID_DATA', 'This goal is archived. Restore it before adding or withdrawing money.')
        }

        const account = await db.accounts.get(accountId)
        if (!account) throw new AppDbError('INVALID_DATA', 'Account does not exist.')
        if (account.isArchived) {
          throw new AppDbError('INVALID_DATA', 'This account is archived and cannot be used.')
        }

        if (direction === 'withdrawal' && amount > goal.currentAmount) {
          throw new AppDbError('INVALID_DATA', "You can't withdraw more than the goal's saved amount.")
        }

        if (direction === 'contribution') {
          const balance = await getAccountBalance(accountId)
          if (amount > balance) {
            throw new AppDbError('INVALID_DATA', `Insufficient balance in ${account.name}.`)
          }
        }

        const now = Date.now()
        const transactionId = generateId()
        // Single-entry ledger movement against the real account only.
        const ledgerAmount = direction === 'contribution' ? -amount : amount
        const transaction: Transaction = {
          id: transactionId,
          type: 'adjustment',
          amount,
          currency: account.currency,
          accountId,
          toAccountId: null,
          categoryId: null,
          creditCardId: null,
          debitCardId: null,        // Goal contributions/withdrawals aren't debit-card transactions
          relatedEntityId: goalId,
          note: note?.trim() || (direction === 'contribution' ? `Added to ${goal.name}` : `Withdrawn from ${goal.name}`),
          date: now,
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
          amount: ledgerAmount,
          direction: ledgerAmount >= 0 ? 'credit' : 'debit',
          date: now,
          createdAt: now,
        }

        await db.transactions.add(transaction)
        await db.ledgerEntries.add(ledgerEntry)
        await reconcileAccountBalanceCache(accountId)

        const newCurrentAmount = direction === 'contribution' ? goal.currentAmount + amount : goal.currentAmount - amount
        const isNowComplete = newCurrentAmount >= goal.targetAmount
        await db.goals.update(goalId, {
          currentAmount: newCurrentAmount,
          status: isNowComplete ? 'achieved' : goal.status === 'achieved' && !isNowComplete ? 'active' : goal.status,
          updatedAt: now,
        })

        const goalTransaction: GoalTransaction = {
          id: generateId(),
          goalId,
          type: direction,
          amount,
          accountId,
          transactionId,
          note: transaction.note,
          date: now,
          createdAt: now,
        }
        await db.goalTransactions.add(goalTransaction)

        return goalTransaction
      }
    )
  } catch (error) {
    throw toAppDbError(error)
  }
}

export async function addMoneyToGoal(input: MoveGoalMoneyInput): Promise<GoalTransaction> {
  return moveGoalMoney('contribution', input)
}

export async function withdrawFromGoal(input: MoveGoalMoneyInput): Promise<GoalTransaction> {
  return moveGoalMoney('withdrawal', input)
}
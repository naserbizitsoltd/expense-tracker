// Recurring transaction engine: computes next occurrence dates and
// generates real Expense/Income transactions from active recurring
// rules. This is the ONLY code that advances a RecurringTransaction's
// nextRunDate/lastRunDate or writes transactions on its behalf.
//
// Idempotency: every occurrence is generated inside a single atomic
// Dexie transaction that re-reads the recurring rule, checks its
// current nextRunDate still matches the occurrence being processed,
// writes the transaction + ledger entries, and advances nextRunDate —
// all before the transaction commits. Because nextRunDate is read
// fresh and advanced in the same atomic step, a rule can never
// generate the same occurrence twice, even if this function is
// called multiple times back to back (e.g. StrictMode, multiple tabs,
// or opening the app repeatedly).

import { addDays, addWeeks, addMonths, addYears } from 'date-fns'
import { db } from '@/db/schema'
import { toAppDbError } from '@/db/errors'
import { recurringTransactionRepository } from '@/db/repositories'
import { createExpense, createIncome } from './transactionService'
import { getAccountBalance } from './balanceService'
import type { RecurrenceFrequency, RecurringTransaction } from '@/types/entities'

// Why a rule at its due occurrence did NOT produce a transaction —
// used by the "due" review UI to explain the state instead of
// silently doing nothing.
export type SkipReason = 'insufficient_balance' | 'inactive_account' | 'inactive_category' | 'not_due'

// Safety cap on how many missed occurrences a single rule will catch
// up on in one pass — protects against a runaway loop if a rule was
// left active with a very old start date and a high-frequency cadence.
const MAX_CATCHUP_OCCURRENCES = 366

export function computeNextRunDate(from: number, frequency: RecurrenceFrequency, interval: number): number {
  const step = Math.max(1, interval)
  switch (frequency) {
    case 'daily':
      return addDays(from, step).getTime()
    case 'weekly':
      return addWeeks(from, step).getTime()
    case 'monthly':
      // date-fns addMonths clamps to the last valid day of the target
      // month (e.g. 31 Jan + 1 month -> 28/29 Feb), which is exactly
      // the "different number of days in a month" handling required.
      return addMonths(from, step).getTime()
    case 'yearly':
      return addYears(from, step).getTime()
  }
}

/**
 * Attempts to generate exactly one transaction for the rule at its
 * current nextRunDate, then advances the schedule. Returns true if a
 * transaction was generated, false if the rule was skipped (already
 * processed by a concurrent call, paused, or its account/category is
 * no longer usable — in which case the rule is paused instead of
 * silently generating an invalid transaction).
 */
async function generateOneOccurrence(
  ruleId: string,
  expectedOccurrenceDate: number
): Promise<{ generated: boolean; reason?: SkipReason }> {
  return await db.transaction(
    'rw',
    db.transactions,
    db.ledgerEntries,
    db.accounts,
    db.categories,
    db.recurringTransactions,
    async () => {
      const rule = await db.recurringTransactions.get(ruleId)
      // Already advanced past this occurrence by a concurrent call, or
      // paused/deleted since this batch started — nothing to do.
      if (!rule || !rule.isActive || rule.nextRunDate !== expectedOccurrenceDate) {
        return { generated: false, reason: 'not_due' as const }
      }

      const account = await db.accounts.get(rule.accountId)
      if (!account || account.isArchived) {
        // Don't silently generate a transaction against a missing or
        // archived account — pause the rule so it surfaces as needing
        // attention instead.
        await db.recurringTransactions.update(rule.id, { isActive: false, updatedAt: Date.now() })
        return { generated: false, reason: 'inactive_account' as const }
      }

      if (rule.categoryId) {
        const category = await db.categories.get(rule.categoryId)
        if (!category || !category.isActive) {
          await db.recurringTransactions.update(rule.id, { isActive: false, updatedAt: Date.now() })
          return { generated: false, reason: 'inactive_category' as const }
        }
      }

      // Never let a recurring rule silently push an account negative.
      // Rule stays due (nextRunDate untouched) so it keeps showing up
      // in the due-review UI until the user skips, tops up, or
      // repoints the rule at a different account.
      if (rule.templateType === 'expense') {
        const balance = await getAccountBalance(rule.accountId)
        if (balance < rule.amount) {
          return { generated: false, reason: 'insufficient_balance' as const }
        }
      }

      const commonInput = {
        amount: rule.amount,
        accountId: rule.accountId,
        categoryId: rule.categoryId,
        date: rule.nextRunDate,
        note: rule.note,
        relatedEntityId: rule.id, // traces this transaction back to its recurring rule
      }

      if (rule.templateType === 'expense') {
        await createExpense(commonInput)
      } else if (rule.templateType === 'income') {
        await createIncome(commonInput)
            } else {
        // Only expense/income recurring rules are supported.
        await db.recurringTransactions.update(rule.id, { isActive: false, updatedAt: Date.now() })
        return { generated: false, reason: 'not_due' as const }
      }

      const nextRunDate = computeNextRunDate(rule.nextRunDate, rule.frequency, rule.interval)
      const pastEnd = rule.endDate !== null && nextRunDate > rule.endDate
      await db.recurringTransactions.update(rule.id, {
        lastRunDate: rule.nextRunDate,
        nextRunDate,
        isActive: pastEnd ? false : rule.isActive,
        updatedAt: Date.now(),
      })
      return { generated: true }
    }
  )
}

/**
 * Advances a due rule's schedule past its current occurrence WITHOUT
 * generating a transaction — used when the user explicitly chooses
 * "Skip" in the due-review UI. Idempotent for the same reason
 * generateOneOccurrence is (re-reads and re-checks in one atomic step).
 */
export async function skipDueOccurrence(ruleId: string): Promise<boolean> {
  try {
    return await db.transaction('rw', db.recurringTransactions, async () => {
      const rule = await db.recurringTransactions.get(ruleId)
      if (!rule || !rule.isActive) return false

      const nextRunDate = computeNextRunDate(rule.nextRunDate, rule.frequency, rule.interval)
      const pastEnd = rule.endDate !== null && nextRunDate > rule.endDate
      await db.recurringTransactions.update(rule.id, {
        lastRunDate: rule.nextRunDate,
        nextRunDate,
        isActive: pastEnd ? false : rule.isActive,
        updatedAt: Date.now(),
      })
      return true
    })
  } catch (error) {
    throw toAppDbError(error)
  }
}

/**
 * Generates just the single currently-due occurrence for one rule
 * (not a full catch-up) — used by "Generate" on one due-review item.
 * Returns why nothing was generated when applicable (e.g. insufficient
 * balance) instead of failing silently.
 */
export async function generateDueOccurrence(ruleId: string): Promise<{ generated: boolean; reason?: SkipReason }> {
  try {
    const rule = await db.recurringTransactions.get(ruleId)
    if (!rule || !rule.isActive) return { generated: false, reason: 'not_due' }
    return await generateOneOccurrence(rule.id, rule.nextRunDate)
  } catch (error) {
    throw toAppDbError(error)
  }
}

export interface DueRecurringItem {
  rule: RecurringTransaction
  occurrenceDate: number
  insufficientBalance: boolean
}

/**
 * Read-only preview of every active rule that's currently due, flagged
 * with whether generating it now would hit insufficient balance —
 * powers the due-review list without mutating anything.
 */
export async function getDueRecurringItems(asOf: number = Date.now()): Promise<DueRecurringItem[]> {
  try {
    const due = await recurringTransactionRepository.getDue(asOf)
    const items: DueRecurringItem[] = []
    for (const rule of due) {
      let insufficientBalance = false
      if (rule.templateType === 'expense') {
        const balance = await getAccountBalance(rule.accountId)
        insufficientBalance = balance < rule.amount
      }
      items.push({ rule, occurrenceDate: rule.nextRunDate, insufficientBalance })
    }
    return items
  } catch (error) {
    throw toAppDbError(error)
  }
}

/**
 * Finds every active recurring rule whose next occurrence is due, and
 * generates all of its missed occurrences up to `asOf` (not just the
 * most recent one) — so a salary scheduled for 1 Aug that the app
 * never opened until 10 Aug still gets its 1 Aug transaction created,
 * with the schedule correctly advanced to 1 Sep afterward.
 */
export async function processDueRecurringTransactions(asOf: number = Date.now()): Promise<number> {
  try {
    let generatedCount = 0
    const due = await recurringTransactionRepository.getDue(asOf)

        for (const rule of due) {
      let occurrenceDate = rule.nextRunDate
      let iterations = 0
      while (occurrenceDate <= asOf && iterations < MAX_CATCHUP_OCCURRENCES) {
        const { generated } = await generateOneOccurrence(rule.id, occurrenceDate)
        if (!generated) break // paused, deleted, insufficient balance, or already handled

        const fresh = await db.recurringTransactions.get(rule.id)
        if (!fresh || !fresh.isActive) break
        occurrenceDate = fresh.nextRunDate
        generatedCount++
        iterations++
      }
    }

    return generatedCount
  } catch (error) {
    throw toAppDbError(error)
  }
}
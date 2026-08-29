// Financial Calendar engine: aggregates every existing scheduled
// financial event — recurring income/expense occurrences, DPS
// installments + maturity, loan due dates, credit card payment due
// dates, FDR maturity, and budget period deadlines — into a single
// sorted list for a given date range.
//
// Pure — reads nothing from the database itself; every entity list is
// already loaded by the caller (see features/calendar/useFinancialCalendar.ts),
// mirroring notificationService.buildReminderCandidates. Never writes
// anything and never creates a new recurring schedule — this only
// PREVIEWS occurrences the real engines (recurringService,
// dpsProgressService, creditCardBillingService, budgetService) would
// themselves produce.

import { startOfDay } from 'date-fns'
import { getRecurringOccurrencesInRange } from './recurringService'
import { getDpsInstallmentDatesInRange } from './dpsProgressService'
import { getDueDatesInRange } from './creditCardBillingService'
import { getCurrentBudgetWindow } from './budgetService'
import type { Account, Budget, CreditCard, CurrencyCode, Dps, Fdr, Loan, RecurringTransaction } from '@/types/entities'

export type CalendarEventType =
  | 'recurring_income'
  | 'recurring_expense'
  | 'dps_installment'
  | 'dps_maturity'
  | 'loan_payment'
  | 'credit_card_due'
  | 'fdr_maturity'
  | 'budget_deadline'

export interface CalendarEvent {
  id: string // stable per occurrence — type:entityId:date
  type: CalendarEventType
  date: number // epoch ms
  title: string
  amount: number | null // integer, smallest unit
  currency: CurrencyCode | null
  entityName: string // account/institution/counterparty display name
  entityId: string // id of the underlying record (recurring rule / dps / loan / card / fdr / budget)
  isPast: boolean
}

export interface BuildCalendarEventsInput {
  recurring: RecurringTransaction[]
  dpsList: Dps[]
  loans: Loan[]
  creditCards: CreditCard[]
  fdrs: Fdr[]
  budgets: Budget[]
  accountsById: Record<string, Account>
  rangeStart: number
  rangeEnd: number
  now: number
}

export function buildCalendarEvents({
  recurring,
  dpsList,
  loans,
  creditCards,
  fdrs,
  budgets,
  accountsById,
  rangeStart,
  rangeEnd,
  now,
}: BuildCalendarEventsInput): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const today = startOfDay(now).getTime()

  for (const rule of recurring) {
    if (!rule.isActive) continue
    if (rule.templateType !== 'income' && rule.templateType !== 'expense') continue
    const account = accountsById[rule.accountId]
    const occurrences = getRecurringOccurrencesInRange(rule, rangeStart, rangeEnd)
    for (const date of occurrences) {
      events.push({
        id: `recurring:${rule.id}:${date}`,
        type: rule.templateType === 'income' ? 'recurring_income' : 'recurring_expense',
        date,
        title: rule.note || (rule.templateType === 'income' ? 'Income' : 'Expense'),
        amount: rule.amount,
        currency: rule.currency,
        entityName: account?.name ?? 'Unknown account',
        entityId: rule.id,
        isPast: date < today,
      })
    }
  }

  for (const dps of dpsList) {
    if (dps.status === 'archived') continue
    const account = accountsById[dps.accountId]

    if (dps.status === 'active') {
      const dates = getDpsInstallmentDatesInRange(dps, rangeStart, rangeEnd)
      for (const date of dates) {
        events.push({
          id: `dps_installment:${dps.id}:${date}`,
          type: 'dps_installment',
          date,
          title: `DPS Installment — ${dps.name}`,
          amount: dps.monthlyInstallment,
          currency: dps.currency,
          entityName: account?.name ?? dps.institution,
          entityId: dps.id,
          isPast: date < today,
        })
      }
    }

    if (
      dps.maturityDate !== null &&
      dps.maturityDate >= rangeStart &&
      dps.maturityDate <= rangeEnd &&
      dps.status !== 'paid_out'
    ) {
      events.push({
        id: `dps_maturity:${dps.id}`,
        type: 'dps_maturity',
        date: dps.maturityDate,
        title: `DPS Maturity — ${dps.name}`,
        amount: null,
        currency: dps.currency,
        entityName: account?.name ?? dps.institution,
        entityId: dps.id,
        isPast: dps.maturityDate < today,
      })
    }
  }

  for (const loan of loans) {
    if (loan.status !== 'active') continue
    if (loan.dueDate === null) continue
    if (loan.dueDate < rangeStart || loan.dueDate > rangeEnd) continue
    const account = accountsById[loan.accountId]
    events.push({
      id: `loan:${loan.id}`,
      type: 'loan_payment',
      date: loan.dueDate,
      title: loan.direction === 'taken' ? `Loan Payment — ${loan.counterpartyName}` : `Loan Collection — ${loan.counterpartyName}`,
      amount: loan.principal,
      currency: loan.currency,
      entityName: account?.name ?? loan.counterpartyName,
      entityId: loan.id,
      isPast: loan.dueDate < today,
    })
  }

  for (const card of creditCards) {
    if (card.isArchived) continue
    const dueDates = getDueDatesInRange(card, rangeStart, rangeEnd)
    for (const date of dueDates) {
      events.push({
        id: `credit_card:${card.id}:${date}`,
        type: 'credit_card_due',
        date,
        title: `Credit Card Payment — ${card.name}`,
        amount: card.outstandingBalance > 0 ? card.outstandingBalance : null,
        currency: card.currency,
        entityName: card.name,
        entityId: card.id,
        isPast: date < today,
      })
    }
  }

  for (const fdr of fdrs) {
    if (fdr.maturityDate === null) continue
    if (fdr.maturityDate < rangeStart || fdr.maturityDate > rangeEnd) continue
    if (fdr.status === 'renewed' || fdr.status === 'withdrawn') continue
    const account = accountsById[fdr.accountId]
    events.push({
      id: `fdr_maturity:${fdr.id}`,
      type: 'fdr_maturity',
      date: fdr.maturityDate,
      title: `FDR Maturity — ${fdr.name}`,
      amount: fdr.maturityAmount ?? fdr.principal,
      currency: fdr.currency,
      entityName: account?.name ?? fdr.institution,
      entityId: fdr.id,
      isPast: fdr.maturityDate < today,
    })
  }

  // Weekly/monthly/yearly budgets reset multiple times inside a visible
  // month, so walk window-by-window (not just the window containing
  // rangeStart) to surface every deadline in range. Custom-period
  // budgets have a single fixed window and self-terminate after one hit.
  for (const budget of budgets) {
    if (!budget.isActive) continue
    let anchor = Math.max(rangeStart, budget.startDate)
    let guard = 0
    while (anchor <= rangeEnd && guard < 60) {
      const window = getCurrentBudgetWindow(budget, anchor)
      if (window.end >= rangeStart && window.end <= rangeEnd) {
        events.push({
          id: `budget:${budget.id}:${window.end}`,
          type: 'budget_deadline',
          date: window.end,
          title: `Budget Deadline — ${budget.name || 'Budget'}`,
          amount: budget.amount,
          currency: budget.currency,
          entityName: budget.name || 'Budget',
          entityId: budget.id,
          isPast: window.end < today,
        })
      }
      if (window.end <= anchor) break
      anchor = window.end + 24 * 60 * 60 * 1000
      guard++
    }
  }

  return events.sort((a, b) => a.date - b.date)
}
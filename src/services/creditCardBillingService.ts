// Credit Card billing engine: derives statement date, payment due date,
// days remaining, and payment status purely from the card's own fields
// (billingCycleDay, dueDay, outstandingBalance) plus "now". Reads
// nothing from the database and writes nothing — same pure-calculation
// pattern as budgetService. `outstandingBalance` is never recomputed
// here; it's the exact same field the Credit Card payment/purchase
// engine (transactionService) already maintains, so billing status is
// always consistent with the real transaction history.

import { addMonths, subMonths, setDate, lastDayOfMonth, startOfDay, differenceInCalendarDays } from 'date-fns'
import type { CreditCard } from '@/types/entities'

export type CreditCardPaymentStatus = 'no_payment_due' | 'due_soon' | 'due' | 'overdue'

export interface CreditCardBillingInfo {
  statementDate: number // most recently closed statement date (<= today)
  nextStatementDate: number // next upcoming statement date (> today)
  dueDate: number // payment due date tied to the current outstanding balance
  daysRemaining: number // dueDate - today in calendar days; negative when overdue
  status: CreditCardPaymentStatus
  statusLabel: string
}

const DUE_SOON_THRESHOLD_DAYS = 7

// Clamps a day-of-month (1-31) to the last valid day of the given
// month, so e.g. billingCycleDay 31 resolves correctly to 28/29 Feb.
function onDay(date: Date, day: number): Date {
  const clamped = Math.min(day, lastDayOfMonth(date).getDate())
  return setDate(date, clamped)
}

/** Most recently closed statement date (<= `from`). */
export function getCurrentStatementDate(card: CreditCard, from: number = Date.now()): number {
  const today = startOfDay(from)
  let candidate = onDay(today, card.billingCycleDay)
  if (candidate.getTime() > today.getTime()) {
    candidate = onDay(subMonths(today, 1), card.billingCycleDay)
  }
  return candidate.getTime()
}

/** Next upcoming statement date (> `from`). */
export function getNextStatementDate(card: CreditCard, from: number = Date.now()): number {
  const today = startOfDay(from)
  let candidate = onDay(today, card.billingCycleDay)
  if (candidate.getTime() <= today.getTime()) {
    candidate = onDay(addMonths(today, 1), card.billingCycleDay)
  }
  return candidate.getTime()
}

// First occurrence of `day` strictly after `afterDate` — used to place
// the due date after the statement date it belongs to.
function firstOccurrenceAfter(afterDate: Date, day: number): Date {
  let candidate = onDay(afterDate, day)
  if (candidate.getTime() <= afterDate.getTime()) {
    candidate = onDay(addMonths(afterDate, 1), day)
  }
  return candidate
}

/**
 * The payment due date tied to the current outstanding balance: the
 * dueDay occurrence that comes after the most recently closed
 * statement. Stays in the past (and grows more overdue) once its date
 * has passed, until the balance is paid down to 0.
 */
export function getCurrentDueDate(card: CreditCard, from: number = Date.now()): number {
  const statementDate = getCurrentStatementDate(card, from)
  return firstOccurrenceAfter(new Date(statementDate), card.dueDay).getTime()
}

function pluralDays(n: number): string {
  return `${n} day${n === 1 ? '' : 's'}`
}

/**
 * Full billing snapshot for a card at `from` (defaults to now). Purely
 * derived — recompute on every render, never cache it.
 */
export function getCreditCardBillingInfo(card: CreditCard, from: number = Date.now()): CreditCardBillingInfo {
  const today = startOfDay(from)
  const statementDate = getCurrentStatementDate(card, from)
  const nextStatementDate = getNextStatementDate(card, from)
  const dueDate = getCurrentDueDate(card, from)
  const daysRemaining = differenceInCalendarDays(dueDate, today)

  const base = { statementDate, nextStatementDate, dueDate, daysRemaining }

  if (card.outstandingBalance <= 0) {
    return { ...base, status: 'no_payment_due', statusLabel: 'Paid / No Payment Due' }
  }
  if (daysRemaining < 0) {
    return { ...base, status: 'overdue', statusLabel: `Overdue by ${pluralDays(Math.abs(daysRemaining))}` }
  }
  if (daysRemaining === 0) {
    return { ...base, status: 'due_soon', statusLabel: 'Due Today' }
  }
  if (daysRemaining === 1) {
    return { ...base, status: 'due_soon', statusLabel: 'Due Tomorrow' }
  }
  if (daysRemaining <= DUE_SOON_THRESHOLD_DAYS) {
    return { ...base, status: 'due_soon', statusLabel: `Due in ${pluralDays(daysRemaining)}` }
  }
  return { ...base, status: 'due', statusLabel: `Due in ${pluralDays(daysRemaining)}` }
}
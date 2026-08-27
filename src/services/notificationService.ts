// Local reminder/notification engine. Pure functions only — reads
// nothing from the database and writes nothing, same pattern as
// dpsProgressService.ts. Given already-loaded entities it works out
// which ones have a due/maturity/target date landing on one of the
// user's configured reminder offsets (e.g. "1 day before"), and can
// fire a browser Notification for one. Dedupe bookkeeping (so the
// same reminder never shows twice) lives in notificationLogRepository
// and is driven from features/notifications/useReminders.ts, not here.
//
// NOTE ON "PUSH": true Web Push (a notification arriving while the PWA
// is fully closed, sent from a server) requires a push server and a
// service-worker push handler — explicitly out of scope per spec
// ("Do NOT add a server just for notifications", "Do not promise ...
// exact time when the PWA is completely closed"). What this file
// implements instead is the Notification API fired from inside the
// running app (foreground or backgrounded-but-alive tab), checked on
// app start/resume — the most reliable mechanism available without a
// backend, per spec section 11.

import { differenceInCalendarDays, format } from 'date-fns'
import { formatAmount } from '@/lib/money'
import { getDpsProgress } from './dpsProgressService'
import type { Dps, Fdr, Goal, Loan, RecurringTransaction, ReminderType } from '@/types/entities'

export const DEFAULT_REMINDER_OFFSETS = [1, 3, 7]

export interface ReminderCandidate {
  id: string // stable dedupe key — see reminderKey()
  type: ReminderType
  entityId: string
  title: string
  body: string
  dueDate: number // epoch ms
  daysUntil: number
  offsetDays: number
}

/** Stable dedupe key: same entity + same calendar due-date + same offset never fires twice. */
export function reminderKey(type: ReminderType, entityId: string, dueDate: number, offsetDays: number): string {
  return `${type}:${entityId}:${format(dueDate, 'yyyy-MM-dd')}:${offsetDays}`
}

function dueSuffix(daysUntil: number): string {
  if (daysUntil <= 0) return 'today'
  if (daysUntil === 1) return 'tomorrow'
  return `in ${daysUntil} days`
}

interface BuildRemindersInput {
  recurring: RecurringTransaction[]
  dpsList: Array<{ dps: Dps; paidInstallments: number }>
  fdrs: Fdr[]
  loans: Loan[]
  loanOutstanding: Record<string, number>
  goals: Goal[]
  offsetDays: number[]
  now: number
}

/**
 * Scans every active recurring rule / DPS / FDR / loan / goal and
 * returns the ones whose next due-ish date lands exactly on one of
 * `offsetDays` days from `now` — e.g. offsetDays=[1,3,7] surfaces
 * something due tomorrow, in 3 days, or in 7 days, but not every day
 * in between (so the same event reminds at most once per offset).
 */
export function buildReminderCandidates({
  recurring,
  dpsList,
  fdrs,
  loans,
  loanOutstanding,
  goals,
  offsetDays,
  now,
}: BuildRemindersInput): ReminderCandidate[] {
  const offsets = [...new Set(offsetDays)].sort((a, b) => a - b)
  const candidates: ReminderCandidate[] = []

  function tryAdd(type: ReminderType, entityId: string, dueDate: number | null, title: string, makeBody: (suffix: string) => string) {
    if (dueDate === null) return
    const daysUntil = differenceInCalendarDays(dueDate, now)
    if (daysUntil < 0 || !offsets.includes(daysUntil)) return
    candidates.push({
      id: reminderKey(type, entityId, dueDate, daysUntil),
      type,
      entityId,
      title,
      body: makeBody(dueSuffix(daysUntil)),
      dueDate,
      daysUntil,
      offsetDays: daysUntil,
    })
  }

  for (const rule of recurring) {
    if (!rule.isActive) continue
    const label = rule.note || (rule.templateType === 'income' ? 'Income' : 'Expense')
    tryAdd('recurring', rule.id, rule.nextRunDate, label, (s) => `${formatAmount(rule.amount, rule.currency)} · Due ${s}`)
  }

  for (const { dps, paidInstallments } of dpsList) {
    if (dps.status !== 'active') continue
    const { nextContributionDate } = getDpsProgress(dps, paidInstallments)
    tryAdd('dps', dps.id, nextContributionDate, 'DPS Payment', (s) => `${formatAmount(dps.monthlyInstallment, dps.currency)} · Due ${s}`)
  }

  for (const fdr of fdrs) {
    if (fdr.status !== 'active') continue
    tryAdd('fdr', fdr.id, fdr.maturityDate, 'FDR Maturity', (s) => `${formatAmount(fdr.principal, fdr.currency)} · Matures ${s}`)
  }

  for (const loan of loans) {
    if (loan.status !== 'active') continue
    const title = loan.direction === 'taken' ? 'Loan Repayment' : 'Loan Collection'
    const amount = loanOutstanding[loan.id] ?? loan.principal
    tryAdd('loan', loan.id, loan.dueDate, title, (s) => `${formatAmount(amount, loan.currency)} · Due ${s}`)
  }

  for (const goal of goals) {
    if (goal.status !== 'active') continue
    tryAdd('goal', goal.id, goal.targetDate, goal.name, (s) => `Target date ${s}`)
  }

  return candidates.sort((a, b) => a.dueDate - b.dueDate)
}

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported'

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

/**
 * Requests browser notification permission exactly once — if the user
 * already granted or denied it, this returns the existing decision
 * without prompting again (spec: "Do not repeatedly ask for permission").
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

/** Fires a real OS/browser notification for one reminder. No-ops silently if unsupported or not granted. */
export function fireBrowserNotification(candidate: ReminderCandidate): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    // tag = the same dedupe id, so if this somehow fires twice in one
    // session the OS coalesces it into a single notification instead
    // of stacking duplicates.
    new Notification(candidate.title, { body: candidate.body, tag: candidate.id })
  } catch {
    // A handful of PWA/browser combinations (notably iOS Safari) throw
    // synchronously here instead of just not supporting it. The in-app
    // Notification Center still records the reminder either way — see
    // features/notifications/useReminders.ts — so this is safe to ignore.
  }
}
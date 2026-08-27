// Pure DPS progress calculation: schedule position, remaining
// installments, and the next contribution date — derived entirely
// from the DPS's own fields plus its actual contribution count.
// Reads nothing from the database and writes nothing — same pattern
// as creditCardBillingService.ts. Never used to derive "amount
// deposited"; that always comes from real contribution records (see
// dpsService.getDpsDeposited), since contributions can be partial or
// missed.

import { addMonths } from 'date-fns'
import type { Dps } from '@/types/entities'

export interface DpsProgress {
  paidInstallments: number
  remainingInstallments: number
  percentComplete: number // by installment count, 0-100
  // Next scheduled contribution date, or null once every installment
  // has a recorded contribution, or once the schedule would run past
  // an explicit maturity date.
  nextContributionDate: number | null
  isFullyScheduled: boolean
  // True only once every installment is recorded AND an explicit
  // maturity date has actually been reached — never derived from the
  // date alone (see schema.ts v13 comment / dpsService.ts). This is
  // what "Matured" vs "Completed" and DPS payout eligibility hinge on.
  isMatured: boolean
}

export function getDpsProgress(dps: Dps, contributionCount: number): DpsProgress {
  // Paid installments = real contribution records PLUS whatever was
  // already paid before this DPS was entered into the app (see
  // Dps.openingInstallmentsPaid) — an existing DPS's progress must
  // reflect its real-world state from the moment it's created.
  const paidInstallments = Math.max(0, dps.openingInstallmentsPaid + contributionCount)
  const remainingInstallments = Math.max(0, dps.tenureMonths - paidInstallments)
  const percentComplete = dps.tenureMonths > 0 ? Math.min(100, Math.round((paidInstallments / dps.tenureMonths) * 100)) : 0
  const isFullyScheduled = remainingInstallments === 0
  const isMatured = isFullyScheduled && dps.maturityDate !== null && Date.now() >= dps.maturityDate

  let nextContributionDate: number | null = null
  if (!isFullyScheduled) {
    const candidate = addMonths(dps.startDate, paidInstallments).getTime()
    nextContributionDate = dps.maturityDate !== null && candidate > dps.maturityDate ? null : candidate
  }

  return { paidInstallments, remainingInstallments, percentComplete, nextContributionDate, isFullyScheduled, isMatured }
}
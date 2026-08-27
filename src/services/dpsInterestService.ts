// Automatic DPS interest projection: pure, read-only estimate of how
// much a DPS is worth today given real compounding. Never written to
// the database and never substitutes for a manually entered
// Dps.openingInterestEarned or DpsPayout.profitAmount when those exist
// (see dpsService.ts) — those stay authoritative.
//
// Two sources of principal, handled differently:
//  - Real DpsContribution records (logged through the app): always
//    compounded from their own actual date.
//  - The opening snapshot (openingDepositedAmount /
//    openingInstallmentsPaid, entered for a pre-existing DPS): if the
//    user already told us the real accumulated interest
//    (openingInterestEarned), we trust that number as-is. Otherwise we
//    reconstruct the likely installment dates from the schedule
//    (startDate + one per month) and compound each virtual
//    installment the same way — same standard bank DPS math, applied
//    to a reconstructed history instead of unknown real dates.

import { addMonths, differenceInCalendarMonths } from 'date-fns'
import type { Dps, DpsContribution } from '@/types/entities'

export interface DpsInterestEstimate {
  totalPrincipal: number
  totalValueWithInterest: number
  estimatedInterest: number
  hasRate: boolean
  // True when the opening/pre-app portion had to be reconstructed
  // from the installment schedule rather than a real recorded value —
  // worth a small caption in the UI so it doesn't read as exact.
  isPartlyEstimatedFromSchedule: boolean
}

export function estimateDpsInterest(
  dps: Pick<Dps, 'interestRate' | 'startDate' | 'openingInstallmentsPaid' | 'openingDepositedAmount' | 'openingInterestEarned'>,
  contributions: Pick<DpsContribution, 'amount' | 'date'>[],
  asOfDate: number = Date.now()
): DpsInterestEstimate {
  const rate = dps.interestRate
  const hasRate = rate != null && rate > 0
  const monthlyRate = hasRate ? rate / 100 / 12 : 0

  const contributionsPrincipal = contributions.reduce((sum, c) => sum + c.amount, 0)
  const totalPrincipal = dps.openingDepositedAmount + contributionsPrincipal

  function grow(amount: number, date: number): number {
    if (!hasRate) return amount
    const months = Math.max(0, differenceInCalendarMonths(asOfDate, date))
    return amount * Math.pow(1 + monthlyRate, months)
  }

  const contributionsValue = contributions.reduce((sum, c) => sum + grow(c.amount, c.date), 0)

  let openingValue: number
  let isPartlyEstimatedFromSchedule = false

  if (dps.openingInterestEarned > 0) {
    // Real, user-provided number — don't second-guess it.
    openingValue = dps.openingDepositedAmount + dps.openingInterestEarned
  } else if (dps.openingDepositedAmount > 0 && dps.openingInstallmentsPaid > 0 && hasRate) {
    const count = dps.openingInstallmentsPaid
    const share = Math.floor(dps.openingDepositedAmount / count)
    const remainder = dps.openingDepositedAmount - share * count
    openingValue = 0
    for (let k = 0; k < count; k++) {
      const virtualAmount = share + (k === count - 1 ? remainder : 0)
      const virtualDate = addMonths(dps.startDate, k).getTime()
      openingValue += grow(virtualAmount, virtualDate)
    }
    isPartlyEstimatedFromSchedule = true
  } else {
    openingValue = dps.openingDepositedAmount
  }

  const totalValueWithInterest = Math.round(openingValue + contributionsValue)

  return {
    totalPrincipal,
    totalValueWithInterest,
    estimatedInterest: totalValueWithInterest - totalPrincipal,
    hasRate,
    isPartlyEstimatedFromSchedule,
  }
}
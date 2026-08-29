// DPS maturity projection: pure, read-only estimate of what a DPS
// will be worth at full tenure — as opposed to dpsInterestService's
// "value as of today". Supports an optional override (a hypothetical
// monthly installment / rate / tenure) for a What-if calculation that
// never touches the real Dps record. Mirrors dpsInterestService's
// compounding math and estimation caveats.

import { addMonths, differenceInCalendarMonths } from 'date-fns'
import type { Dps, DpsContribution } from '@/types/entities'
import { estimateDpsInterest } from './dpsInterestService'

export interface DpsMaturityOverrides {
  monthlyInstallment?: number
  interestRate?: number | null
  tenureMonths?: number
}

export interface DpsMaturityProjection {
  totalDepositedSoFar: number
  estimatedInterestSoFar: number
  remainingInstallments: number
  remainingContribution: number
  expectedMaturityDate: number
  projectedTotalDeposit: number
  projectedInterest: number
  projectedMaturityAmount: number
  hasRate: boolean
  isWhatIf: boolean
}

export function projectDpsMaturity(
  dps: Pick<Dps, 'startDate' | 'monthlyInstallment' | 'interestRate' | 'tenureMonths' | 'openingInstallmentsPaid' | 'openingDepositedAmount' | 'openingInterestEarned' | 'maturityDate'>,
  contributions: Pick<DpsContribution, 'amount' | 'date'>[],
  overrides: DpsMaturityOverrides = {}
): DpsMaturityProjection {
  const monthlyInstallment = overrides.monthlyInstallment ?? dps.monthlyInstallment
  const interestRate = overrides.interestRate !== undefined ? overrides.interestRate : dps.interestRate
  const tenureMonths = overrides.tenureMonths ?? dps.tenureMonths
  const isWhatIf =
    overrides.monthlyInstallment !== undefined || overrides.interestRate !== undefined || overrides.tenureMonths !== undefined

  const hasRate = interestRate != null && interestRate > 0
  const monthlyRate = hasRate ? interestRate / 100 / 12 : 0

  const soFar = estimateDpsInterest(dps, contributions)
  const paidInstallments = Math.max(0, dps.openingInstallmentsPaid + contributions.length)
  const remainingInstallments = Math.max(0, tenureMonths - paidInstallments)
  const remainingContribution = remainingInstallments * monthlyInstallment

  const expectedMaturityDate =
    !isWhatIf && dps.maturityDate !== null ? dps.maturityDate : addMonths(dps.startDate, tenureMonths).getTime()

  // Grow today's value to maturity, then add each future installment
  // compounding from its own scheduled date to maturity.
  const monthsToMaturity = Math.max(0, differenceInCalendarMonths(expectedMaturityDate, Date.now()))
  const currentValueAtMaturity = hasRate
    ? soFar.totalValueWithInterest * Math.pow(1 + monthlyRate, monthsToMaturity)
    : soFar.totalValueWithInterest

  let futureInstallmentsValue = 0
  for (let k = 0; k < remainingInstallments; k++) {
    const installmentDate = addMonths(dps.startDate, paidInstallments + k).getTime()
    const monthsCompounding = hasRate ? Math.max(0, differenceInCalendarMonths(expectedMaturityDate, installmentDate)) : 0
    futureInstallmentsValue += hasRate
      ? monthlyInstallment * Math.pow(1 + monthlyRate, monthsCompounding)
      : monthlyInstallment
  }

  const projectedTotalDeposit = soFar.totalPrincipal + remainingContribution
  const projectedMaturityAmount = Math.round(currentValueAtMaturity + futureInstallmentsValue)
  const projectedInterest = projectedMaturityAmount - projectedTotalDeposit

  return {
    totalDepositedSoFar: soFar.totalPrincipal,
    estimatedInterestSoFar: soFar.estimatedInterest,
    remainingInstallments,
    remainingContribution,
    expectedMaturityDate,
    projectedTotalDeposit,
    projectedInterest,
    projectedMaturityAmount,
    hasRate,
    isWhatIf,
  }
}
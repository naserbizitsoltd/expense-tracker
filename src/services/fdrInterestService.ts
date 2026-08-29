// FDR interest estimation: pure, read-only projection using monthly
// compounding on the stated annual rate — mirrors dpsInterestService's
// math. NEVER writes to the database and NEVER substitutes for
// Fdr.maturityAmount, which stays the only authoritative maturity
// figure (see fdrService.getFdrMaturitySummary). Supports an optional
// override for a What-if calculation that doesn't touch the real FDR.

import { addMonths, differenceInCalendarMonths } from 'date-fns'
import type { Fdr } from '@/types/entities'

export interface FdrInterestOverrides {
  principal?: number
  interestRate?: number | null
  tenureMonths?: number
}

export interface FdrInterestEstimate {
  principal: number
  estimatedInterest: number
  estimatedMaturityAmount: number
  maturityDate: number
  hasRate: boolean
  isWhatIf: boolean
}

export function estimateFdrInterest(
  fdr: Pick<Fdr, 'principal' | 'interestRate' | 'startDate' | 'tenureMonths' | 'maturityDate'>,
  overrides: FdrInterestOverrides = {}
): FdrInterestEstimate {
  const principal = overrides.principal ?? fdr.principal
  const interestRate = overrides.interestRate !== undefined ? overrides.interestRate : fdr.interestRate
  const tenureMonths = overrides.tenureMonths ?? fdr.tenureMonths
  const isWhatIf =
    overrides.principal !== undefined || overrides.interestRate !== undefined || overrides.tenureMonths !== undefined

  const hasRate = interestRate != null && interestRate > 0
  const monthlyRate = hasRate ? interestRate / 100 / 12 : 0

  const maturityDate =
    !isWhatIf && fdr.maturityDate !== null ? fdr.maturityDate : addMonths(fdr.startDate, tenureMonths).getTime()

  const months = Math.max(0, differenceInCalendarMonths(maturityDate, fdr.startDate))
  const estimatedMaturityAmount = hasRate ? Math.round(principal * Math.pow(1 + monthlyRate, months)) : principal
  const estimatedInterest = estimatedMaturityAmount - principal

  return { principal, estimatedInterest, estimatedMaturityAmount, maturityDate, hasRate, isWhatIf }
}
// Financial Health Score: a pure, transparent 0-100 score computed
// only from data already derived elsewhere (useMonthlySummary,
// useBudgetsWithProgress, useLoans, useCreditCards, useGoalsList,
// dashboard upcoming events, accounts total). Never fetches from the
// database itself and never invents a figure — a factor with nothing
// to measure is marked "Not enough data" and excluded from both the
// score and its maximum, rather than guessed at. This is not
// financial advice — just a transparent, reproducible breakdown of
// the app's own numbers.

import type { MonthlySummary } from '@/features/reports/reportsService'
import type { BudgetWithProgress } from '@/features/budgets/useBudgets'
import type { GoalWithProgress } from '@/features/goals/useGoals'

export type FinancialHealthFactorStatus = 'good' | 'warning' | 'insufficient_data'

export interface FinancialHealthFactor {
  key: string
  label: string
  status: FinancialHealthFactorStatus
  points: number // points earned
  maxPoints: number // points this factor could contribute
  message: string
}

export interface FinancialHealthResult {
  score: number | null // 0-100, or null if nothing could be scored at all
  factors: FinancialHealthFactor[]
  scoredMaxPoints: number // sum of maxPoints for factors that had data
  totalPossiblePoints: number // 100, always — for showing "scored out of X available"
}

export interface FinancialHealthInput {
  recentMonths: MonthlySummary[] // most recent first or last — order doesn't matter, only income/savingsRate are read
  budgets: Pick<BudgetWithProgress, 'status'>[]
  totalBorrowedOutstanding: number
  totalCreditCardOutstanding: number
  totalCreditCardLimit: number
  activeGoals: Pick<GoalWithProgress, 'percentComplete'>[]
  upcomingObligationsNext30Days: number
  totalAvailableCash: number
}

function factor(
  key: string,
  label: string,
  maxPoints: number,
  compute: () => { points: number; status: FinancialHealthFactorStatus; message: string } | null
): FinancialHealthFactor {
  const result = compute()
  if (!result) {
    return { key, label, status: 'insufficient_data', points: 0, maxPoints: 0, message: 'Not enough data' }
  }
  return { key, label, maxPoints, ...result }
}

export function calculateFinancialHealthScore(input: FinancialHealthInput): FinancialHealthResult {
  const {
    recentMonths,
    budgets,
    totalBorrowedOutstanding,
    totalCreditCardOutstanding,
    totalCreditCardLimit,
    activeGoals,
    upcomingObligationsNext30Days,
    totalAvailableCash,
  } = input

  const monthsWithIncome = recentMonths.filter((m) => m.income > 0)
  const avgSavingsRate =
    monthsWithIncome.length > 0
      ? monthsWithIncome.reduce((sum, m) => sum + (m.savingsRate ?? 0), 0) / monthsWithIncome.length
      : null
  const avgMonthlyIncome =
    monthsWithIncome.length > 0 ? monthsWithIncome.reduce((sum, m) => sum + m.income, 0) / monthsWithIncome.length : null

  // 1. Savings rate — 25 pts
  const savingsFactor = factor('savings_rate', 'Savings rate', 25, () => {
    if (avgSavingsRate === null) return null
    if (avgSavingsRate >= 20) return { points: 25, status: 'good', message: 'Good savings rate' }
    if (avgSavingsRate >= 10) return { points: 16, status: 'good', message: 'Fair savings rate' }
    if (avgSavingsRate >= 0) return { points: 8, status: 'warning', message: 'Savings rate is low' }
    return { points: 0, status: 'warning', message: "You're spending more than you earn" }
  })

  // 2. Budget performance — 20 pts
  const budgetFactor = factor('budget_performance', 'Budget performance', 20, () => {
    if (budgets.length === 0) return null
    const exceeded = budgets.filter((b) => b.status === 'exceeded').length
    const nearLimit = budgets.filter((b) => b.status === 'near_limit').length
    const exceededRatio = exceeded / budgets.length
    if (exceededRatio === 0 && nearLimit === 0) return { points: 20, status: 'good', message: 'Expenses within budget' }
    if (exceededRatio === 0) return { points: 14, status: 'good', message: 'Mostly within budget' }
    if (exceededRatio <= 0.5) return { points: 7, status: 'warning', message: 'Some budgets are being overspent' }
    return { points: 0, status: 'warning', message: 'Most budgets are overspent' }
  })

  // 3. Loan burden — 15 pts (outstanding vs annualized income)
  const loanFactor = factor('loan_burden', 'Loan repayment burden', 15, () => {
    if (totalBorrowedOutstanding === 0) return { points: 15, status: 'good', message: 'No outstanding loans' }
    if (avgMonthlyIncome === null) return null
    const annualIncome = avgMonthlyIncome * 12
    if (annualIncome === 0) return null
    const ratio = totalBorrowedOutstanding / annualIncome
    if (ratio <= 0.2) return { points: 15, status: 'good', message: 'Low loan burden' }
    if (ratio <= 0.5) return { points: 8, status: 'warning', message: 'Moderate loan burden' }
    return { points: 0, status: 'warning', message: 'Loan balance is high' }
  })

  // 4. Credit utilization — 10 pts
  const creditFactor = factor('credit_utilization', 'Credit utilization', 10, () => {
    if (totalCreditCardLimit === 0) {
      return totalCreditCardOutstanding === 0
        ? { points: 10, status: 'good', message: 'No credit card debt' }
        : null // outstanding exists but no limit on record — can't compute a ratio
    }
    const utilization = totalCreditCardOutstanding / totalCreditCardLimit
    if (utilization <= 0.3) return { points: 10, status: 'good', message: 'Low credit utilization' }
    if (utilization <= 0.5) return { points: 6, status: 'warning', message: 'Moderate credit utilization' }
    if (utilization <= 0.8) return { points: 3, status: 'warning', message: 'High credit utilization' }
    return { points: 0, status: 'warning', message: 'Very high credit utilization' }
  })

  // 5. Savings goals / emergency fund — 15 pts
  const goalsFactor = factor('savings_goals', 'Savings goals', 15, () => {
    if (activeGoals.length === 0) return null
    const avgProgress = activeGoals.reduce((sum, g) => sum + g.percentComplete, 0) / activeGoals.length
    if (avgProgress >= 50) return { points: 15, status: 'good', message: 'Savings goals on track' }
    if (avgProgress >= 20) return { points: 8, status: 'warning', message: 'Savings goals need attention' }
    return { points: 3, status: 'warning', message: 'Savings goals are far behind' }
  })

  // 6. Upcoming obligations vs available cash — 15 pts
  const obligationsFactor = factor('upcoming_obligations', 'Upcoming obligations', 15, () => {
    if (upcomingObligationsNext30Days === 0) return { points: 15, status: 'good', message: 'No major upcoming obligations' }
    if (totalAvailableCash === 0) return { points: 0, status: 'warning', message: 'Upcoming obligations are high' }
    const ratio = upcomingObligationsNext30Days / totalAvailableCash
    if (ratio <= 0.3) return { points: 15, status: 'good', message: 'Upcoming obligations are manageable' }
    if (ratio <= 0.6) return { points: 8, status: 'warning', message: 'Upcoming obligations are notable' }
    return { points: 0, status: 'warning', message: 'Upcoming obligations are high' }
  })

  const factors = [savingsFactor, budgetFactor, loanFactor, creditFactor, goalsFactor, obligationsFactor]
  const scoredFactors = factors.filter((f) => f.status !== 'insufficient_data')
  const scoredMaxPoints = scoredFactors.reduce((sum, f) => sum + f.maxPoints, 0)
  const earnedPoints = scoredFactors.reduce((sum, f) => sum + f.points, 0)

  const score = scoredMaxPoints > 0 ? Math.round((earnedPoints / scoredMaxPoints) * 100) : null

  return { score, factors, scoredMaxPoints, totalPossiblePoints: 100 }
}
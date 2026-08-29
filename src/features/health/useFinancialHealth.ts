import { useMemo } from 'react'
import { addDays } from 'date-fns'
import { useMonthlySummary } from '@/features/reports/useMonthlySummary'
import { useBudgetsWithProgress } from '@/features/budgets/useBudgets'
import { useLoans } from '@/features/loans/useLoans'
import { useCreditCards } from '@/features/credit-cards/useCreditCards'
import { useGoalsList } from '@/features/goals/useGoals'
import { useAccounts } from '@/features/accounts/useAccounts'
import { useDepositsOverview } from '@/features/deposits/useDepositsOverview'
import { useRecurringList } from '@/features/recurring/useRecurring'
import { calculateFinancialHealthScore } from '@/services/financialHealthService'
import { APP_CONFIG } from '@/config/app.config'

/** Composes existing reactive hooks (same pattern as useDashboard) into the Financial Health Score input — no new database reads. */
export function useFinancialHealth() {
  const { months } = useMonthlySummary(3)
  const budgets = useBudgetsWithProgress()
  const loans = useLoans()
  const creditCards = useCreditCards()
  const goals = useGoalsList()
  const accounts = useAccounts()
  const deposits = useDepositsOverview()
  const recurring = useRecurringList()

  const upcomingObligationsNext30Days = useMemo(() => {
    const cutoff = addDays(Date.now(), 30).getTime()
    const fromDeposits = deposits.upcomingEvents
      .filter((e) => e.date <= cutoff && e.currency === APP_CONFIG.defaultCurrency)
      .reduce((sum, e) => sum + (e.amount ?? 0), 0)
    const fromRecurring = recurring.items
      .filter(
        (i) =>
          i.rule.isActive &&
          i.rule.nextRunDate <= cutoff &&
          i.rule.currency === APP_CONFIG.defaultCurrency &&
          i.rule.templateType === 'expense'
      )
      .reduce((sum, i) => sum + i.rule.amount, 0)
    return fromDeposits + fromRecurring
  }, [deposits.upcomingEvents, recurring.items])

  const result = useMemo(
    () =>
      calculateFinancialHealthScore({
        recentMonths: months,
        budgets: budgets.items,
        totalBorrowedOutstanding: loans.totalBorrowedOutstanding,
        totalCreditCardOutstanding: creditCards.totalOutstanding,
        totalCreditCardLimit: creditCards.totalCreditLimit,
        activeGoals: goals.activeItems,
        upcomingObligationsNext30Days,
        totalAvailableCash: accounts.totalBalance,
      }),
    [months, budgets.items, loans.totalBorrowedOutstanding, creditCards.totalOutstanding, creditCards.totalCreditLimit, goals.activeItems, upcomingObligationsNext30Days, accounts.totalBalance]
  )

  return {
    ...result,
    isLoading: budgets.isLoading || creditCards.isLoading || goals.isLoading || accounts.isLoading,
  }
}
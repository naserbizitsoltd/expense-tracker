// Pure Reports calculation functions: date-range resolution and every
// grouping/summary derived from an already-fetched transaction list.
// Reads nothing from the database and writes nothing — same pattern as
// budgetService.ts / dpsProgressService.ts. Callers (useReports) own all
// fetching; this file only transforms data that's already in memory.
//
// Every function here relies on the app's existing transaction-type
// rules rather than inventing new ones:
//   - type 'income' / 'expense' are the ONLY types counted as ordinary
//     income/expense. Transfers, loan, dps, fdr, credit_card (bill
//     payment), and adjustment (goal) transactions are never included,
//     so nothing here can double-count a transfer or a card payment.
//   - A credit-card PURCHASE is stored as type 'expense' with
//     creditCardId set (see transactionService.createCreditCardExpense)
//     — it is already counted exactly once in ordinary Expense. The
//     later bill payment is type 'credit_card', which this file never
//     treats as expense/income, so paying the card off never adds a
//     second expense.

import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  subYears,
  startOfDay,
  endOfDay,
  eachMonthOfInterval,
  eachDayOfInterval,
  differenceInCalendarMonths,
  differenceInCalendarDays,
  format,
} from 'date-fns'
import { APP_CONFIG } from '@/config/app.config'
import type { Account, Category, DpsContribution, DpsPayout, Fdr, FdrPayout, Loan, LoanRepayment, Transaction } from '@/types/entities'

export type ReportPeriodOption = 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'last_year' | 'custom'

export interface ReportRange {
  start: number
  end: number
}

/** Resolves a period option to a concrete [start, end] range. Custom uses the caller's own picked dates, clamped to whole days. */
export function getReportRange(
  option: ReportPeriodOption,
  customStart: number | null,
  customEnd: number | null,
  now: number = Date.now()
): ReportRange {
  switch (option) {
    case 'this_month':
      return { start: startOfMonth(now).getTime(), end: endOfMonth(now).getTime() }
    case 'last_month': {
      const lastMonth = subMonths(now, 1)
      return { start: startOfMonth(lastMonth).getTime(), end: endOfMonth(lastMonth).getTime() }
    }
    case 'last_3_months':
      return { start: startOfMonth(subMonths(now, 2)).getTime(), end: endOfMonth(now).getTime() }
    case 'this_year':
      return { start: startOfYear(now).getTime(), end: endOfYear(now).getTime() }
    case 'last_year': {
      const lastYear = subYears(now, 1)
      return { start: startOfYear(lastYear).getTime(), end: endOfYear(lastYear).getTime() }
    }
    case 'custom':
    default: {
      const rawStart = customStart ?? startOfMonth(now).getTime()
      const rawEnd = customEnd ?? now
      return { start: startOfDay(rawStart).getTime(), end: endOfDay(Math.max(rawStart, rawEnd)).getTime() }
    }
  }
}

export interface IncomeExpenseSummary {
  income: number
  expense: number
  net: number
}

/** Sums real income/expense only. Never transfers, loan, dps, fdr, credit_card, or adjustment transactions. */
export function summarizeIncomeExpense(transactions: Transaction[]): IncomeExpenseSummary {
  let income = 0
  let expense = 0
  for (const t of transactions) {
    if (t.currency !== APP_CONFIG.defaultCurrency) continue
    if (t.type === 'income') income += t.amount
    else if (t.type === 'expense') expense += t.amount
  }
  return { income, expense, net: income - expense }
}

/** (Income − Expense) / Income × 100. Returns null (never divides by zero) when income is 0. */
export function computeSavingsRate(income: number, expense: number): number | null {
  if (income <= 0) return null
  return ((income - expense) / income) * 100
}

export interface CategoryBreakdownItem {
  categoryId: string | null
  name: string
  icon: string
  color: string
  amount: number
  percent: number
}

function groupByCategory(
  transactions: Transaction[],
  type: 'income' | 'expense',
  categoriesById: Map<string, Category>
): CategoryBreakdownItem[] {
  const sums = new Map<string, number>()
  let total = 0
  for (const t of transactions) {
    if (t.type !== type || t.currency !== APP_CONFIG.defaultCurrency) continue
    const key = t.categoryId ?? 'uncategorized'
    sums.set(key, (sums.get(key) ?? 0) + t.amount)
    total += t.amount
  }
  const items: CategoryBreakdownItem[] = []
  for (const [key, amount] of sums) {
    const category = key === 'uncategorized' ? undefined : categoriesById.get(key)
    items.push({
      categoryId: category?.id ?? null,
      name: category?.name ?? 'Uncategorized',
      icon: category?.icon ?? 'tag',
      color: category?.color ?? '#64748b',
      amount,
      percent: total > 0 ? Math.round((amount / total) * 100) : 0,
    })
  }
  return items.sort((a, b) => b.amount - a.amount)
}

/** Never invents categories — only categorizes using the real Category records already on each transaction. */
export function expenseByCategory(transactions: Transaction[], categoriesById: Map<string, Category>): CategoryBreakdownItem[] {
  return groupByCategory(transactions, 'expense', categoriesById)
}

export function incomeByCategory(transactions: Transaction[], categoriesById: Map<string, Category>): CategoryBreakdownItem[] {
  return groupByCategory(transactions, 'income', categoriesById)
}

export interface AccountFlowItem {
  accountId: string
  name: string
  income: number
  expense: number
  net: number
}

/** Per-account income/expense. Transfers are excluded here exactly like the headline totals, so a transfer between two accounts can never inflate either account's income or expense. */
export function accountFlow(transactions: Transaction[], accountsById: Map<string, Account>): AccountFlowItem[] {
  const sums = new Map<string, { income: number; expense: number }>()
  for (const t of transactions) {
    if (t.currency !== APP_CONFIG.defaultCurrency) continue
    if (t.type !== 'income' && t.type !== 'expense') continue
    if (!t.accountId) continue // credit-card-paid expenses have no real account
    const entry = sums.get(t.accountId) ?? { income: 0, expense: 0 }
    if (t.type === 'income') entry.income += t.amount
    else entry.expense += t.amount
    sums.set(t.accountId, entry)
  }
  const items: AccountFlowItem[] = []
  for (const [accountId, { income, expense }] of sums) {
    const account = accountsById.get(accountId)
    items.push({ accountId, name: account?.name ?? 'Unknown account', income, expense, net: income - expense })
  }
  return items.sort((a, b) => b.income + b.expense - (a.income + a.expense))
}

export interface TrendPoint {
  label: string
  income: number
  expense: number
}

/** Monthly buckets for ranges spanning more than one calendar month; daily buckets for a short custom range (so a single-month custom range doesn't collapse to one bar). */
export function monthlyTrend(transactions: Transaction[], range: ReportRange): TrendPoint[] {
  const relevant = transactions.filter(
    (t) => t.currency === APP_CONFIG.defaultCurrency && (t.type === 'income' || t.type === 'expense')
  )
  const spanMonths = differenceInCalendarMonths(range.end, range.start) + 1

  if (spanMonths <= 1) {
    return eachDayOfInterval({ start: range.start, end: range.end }).map((day) => {
      const dayStart = startOfDay(day).getTime()
      const dayEnd = endOfDay(day).getTime()
      const bucket = relevant.filter((t) => t.date >= dayStart && t.date <= dayEnd)
      return {
        label: format(day, 'd MMM'),
        income: bucket.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expense: bucket.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      }
    })
  }

  return eachMonthOfInterval({ start: range.start, end: range.end }).map((month) => {
    const monthStart = startOfMonth(month).getTime()
    const monthEnd = endOfMonth(month).getTime()
    const bucket = relevant.filter((t) => t.date >= monthStart && t.date <= monthEnd)
    return {
      label: format(month, 'MMM'),
      income: bucket.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: bucket.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    }
  })
}

export interface DailyExpensePoint {
  label: string
  date: number
  amount: number
}

export interface DailyExpenseResult {
  points: DailyExpensePoint[]
  available: boolean // false for ranges long enough that a daily view is no longer useful
}

const MAX_DAILY_RANGE_DAYS = 45

/** Only computed for ranges up to ~45 days — beyond that a monthly view (see monthlyTrend) is more useful and this skips the per-day scan entirely. */
export function computeDailyExpense(transactions: Transaction[], range: ReportRange): DailyExpenseResult {
  const spanDays = differenceInCalendarDays(range.end, range.start) + 1
  if (spanDays > MAX_DAILY_RANGE_DAYS) return { points: [], available: false }

  const expenses = transactions.filter((t) => t.type === 'expense' && t.currency === APP_CONFIG.defaultCurrency)
  const points = eachDayOfInterval({ start: range.start, end: range.end }).map((day) => {
    const dayStart = startOfDay(day).getTime()
    const dayEnd = endOfDay(day).getTime()
    const amount = expenses.filter((t) => t.date >= dayStart && t.date <= dayEnd).reduce((s, t) => s + t.amount, 0)
    return { label: format(day, 'd MMM'), date: dayStart, amount }
  })
  return { points, available: true }
}

export function highestSpendingDay(points: DailyExpensePoint[]): DailyExpensePoint | null {
  if (points.length === 0) return null
  return points.reduce((max, d) => (d.amount > max.amount ? d : max), points[0])
}

/** A credit-card purchase is already type 'expense' (see file header) — this is a breakdown of that same total, never an addition to it. */
export function creditCardSpending(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === 'expense' && t.creditCardId !== null && t.currency === APP_CONFIG.defaultCurrency)
    .reduce((sum, t) => sum + t.amount, 0)
}

export interface LoanReportSummary {
  lent: number
  borrowed: number
  repayments: number
}

/** Money Lent / Borrowed use each Loan's own startDate (the disbursement date — see loanService.disburseLoan) directly, never re-derived from transactions. Repayments are summed from the LoanRepayment audit trail, kept separate from principal so the two are never mixed. */
export function summarizeLoans(loans: Loan[], repayments: LoanRepayment[], range: ReportRange): LoanReportSummary {
  let lent = 0
  let borrowed = 0
  for (const loan of loans) {
    if (loan.currency !== APP_CONFIG.defaultCurrency) continue
    if (loan.startDate < range.start || loan.startDate > range.end) continue
    if (loan.direction === 'given') lent += loan.principal
    else borrowed += loan.principal
  }
  let repaymentsTotal = 0
  for (const r of repayments) {
    if (r.date < range.start || r.date > range.end) continue
    repaymentsTotal += r.amount
  }
  return { lent, borrowed, repayments: repaymentsTotal }
}

export interface DepositReportSummary {
  dpsContributions: number
  fdrPrincipalAdded: number
  fdrMaturityProfit: number
}

/** FDR principal added uses each Fdr's own startDate directly (mirrors summarizeLoans), never re-derived from transactions. Contributions/profit come from their own audit trails, never from ordinary expense/income. */
export function summarizeDeposits(
  dpsContributions: DpsContribution[],
  fdrs: Fdr[],
  fdrPayouts: FdrPayout[],
  range: ReportRange
): DepositReportSummary {
  let dpsTotal = 0
  for (const c of dpsContributions) {
    if (c.date < range.start || c.date > range.end) continue
    dpsTotal += c.amount
  }
  let fdrPrincipal = 0
  for (const fdr of fdrs) {
    if (fdr.currency !== APP_CONFIG.defaultCurrency) continue
    if (fdr.startDate < range.start || fdr.startDate > range.end) continue
    fdrPrincipal += fdr.principal
  }
  let fdrProfit = 0
  for (const p of fdrPayouts) {
    if (p.date < range.start || p.date > range.end) continue
    fdrProfit += p.profitAmount
  }
  return { dpsContributions: dpsTotal, fdrPrincipalAdded: fdrPrincipal, fdrMaturityProfit: fdrProfit }
}

// ---------------------------------------------------------------------
// CASH FLOW STATEMENT
//
// Unlike summarizeIncomeExpense above (which deliberately excludes
// loan/dps/fdr transactions from ordinary Income/Expense — see file
// header), a Cash Flow Statement counts every REAL movement of money
// into or out of the household: loan received/given/repaid, DPS
// installments, FDR investments, and maturity payouts. It still
// excludes transfers between the user's own accounts and credit-card
// bill payments — a bill payment just moves money to pay off a card,
// it isn't new spending (the spend was already counted as an Expense
// at purchase time, see transactionService.createCreditCardExpense),
// so counting the payment too would double it.
// ---------------------------------------------------------------------

export interface CashFlowItem {
  id: string
  label: string
  amount: number
}

export interface CashFlowSummary {
  totalInflow: number
  totalOutflow: number
  netCashFlow: number
  inflow: CashFlowItem[]
  outflow: CashFlowItem[]
}

export function computeCashFlow(
  transactions: Transaction[],
  loans: Loan[],
  loanRepayments: LoanRepayment[],
  dpsContributions: DpsContribution[],
  dpsPayouts: DpsPayout[],
  fdrs: Fdr[],
  fdrPayouts: FdrPayout[],
  range: ReportRange
): CashFlowSummary {
  const currency = APP_CONFIG.defaultCurrency
  const loansById = new Map(loans.map((l) => [l.id, l]))

  let income = 0
  let expense = 0
  for (const t of transactions) {
    if (t.currency !== currency) continue
    if (t.type === 'income') income += t.amount
    else if (t.type === 'expense') expense += t.amount
  }

  let loanReceived = 0
  let loanGiven = 0
  for (const loan of loans) {
    if (loan.currency !== currency) continue
    if (loan.startDate < range.start || loan.startDate > range.end) continue
    if (loan.direction === 'taken') loanReceived += loan.principal
    else loanGiven += loan.principal
  }

  let loanRepaidOut = 0 // taken: paying a lender back — real outflow
  let loanRepaidIn = 0 // given: a borrower repaying you — real inflow
  for (const r of loanRepayments) {
    if (r.date < range.start || r.date > range.end) continue
    const loan = loansById.get(r.loanId)
    if (!loan || loan.currency !== currency) continue
    if (loan.direction === 'taken') loanRepaidOut += r.amount
    else loanRepaidIn += r.amount
  }

  let dpsInstallments = 0
  for (const c of dpsContributions) {
    if (c.date < range.start || c.date > range.end) continue
    dpsInstallments += c.amount
  }

  let fdrInvested = 0
  for (const fdr of fdrs) {
    if (fdr.currency !== currency) continue
    if (fdr.startDate < range.start || fdr.startDate > range.end) continue
    fdrInvested += fdr.principal
  }

  let maturityPayouts = 0
  for (const p of dpsPayouts) {
    if (p.date < range.start || p.date > range.end) continue
    maturityPayouts += p.amount
  }
  for (const p of fdrPayouts) {
    if (p.date < range.start || p.date > range.end) continue
    maturityPayouts += p.amount
  }

  const inflow: CashFlowItem[] = [
    { id: 'income', label: 'Income', amount: income },
    { id: 'loan_received', label: 'Loan Received', amount: loanReceived },
    { id: 'loan_repaid_in', label: 'Loan Repayment Received', amount: loanRepaidIn },
    { id: 'maturity', label: 'Maturity Payout', amount: maturityPayouts },
  ].filter((i) => i.amount > 0)

  const outflow: CashFlowItem[] = [
    { id: 'expense', label: 'Expenses', amount: expense },
    { id: 'dps', label: 'DPS Installment', amount: dpsInstallments },
    { id: 'fdr', label: 'FDR Investment', amount: fdrInvested },
    { id: 'loan_repaid_out', label: 'Loan Repayment', amount: loanRepaidOut },
    { id: 'loan_given', label: 'Loan Given', amount: loanGiven },
  ].filter((i) => i.amount > 0)

  const totalInflow = inflow.reduce((s, i) => s + i.amount, 0)
  const totalOutflow = outflow.reduce((s, i) => s + i.amount, 0)

  return { totalInflow, totalOutflow, netCashFlow: totalInflow - totalOutflow, inflow, outflow }
}

// ---------------------------------------------------------------------
// MONTHLY FINANCIAL SUMMARY
//
// Savings Rate here is Savings / Income (what fraction of income was
// actually kept), distinct from the headline Reports "Savings Rate"
// card above (Net / Income) — both are legitimate, different questions;
// neither is invented, both are derived from the same underlying sums.
// ---------------------------------------------------------------------

export interface MonthlySummary {
  monthLabel: string
  monthStart: number
  income: number
  expenses: number
  savings: number
  investments: number // DPS installments + FDR principal invested this month
  loanRepayments: number // only 'taken' loans — money actually leaving this month
  netCashFlow: number // income - expenses
  savingsRate: number | null // savings / income * 100, null when income is 0
}

export function computeMonthlySummary(
  monthStart: number,
  monthEnd: number,
  transactions: Transaction[],
  loans: Loan[],
  loanRepayments: LoanRepayment[],
  dpsContributions: DpsContribution[],
  fdrs: Fdr[]
): MonthlySummary {
  const currency = APP_CONFIG.defaultCurrency
  const inMonth = transactions.filter((t) => t.date >= monthStart && t.date <= monthEnd)
  const { income, expense } = summarizeIncomeExpense(inMonth)
  const netCashFlow = income - expense

  const loansById = new Map(loans.map((l) => [l.id, l]))
  let loanRepaymentsOut = 0
  for (const r of loanRepayments) {
    if (r.date < monthStart || r.date > monthEnd) continue
    const loan = loansById.get(r.loanId)
    if (!loan || loan.currency !== currency || loan.direction !== 'taken') continue
    loanRepaymentsOut += r.amount
  }

  let investments = 0
  for (const c of dpsContributions) {
    if (c.date >= monthStart && c.date <= monthEnd) investments += c.amount
  }
  for (const fdr of fdrs) {
    if (fdr.currency !== currency) continue
    if (fdr.startDate >= monthStart && fdr.startDate <= monthEnd) investments += fdr.principal
  }

  const savings = netCashFlow - investments - loanRepaymentsOut

  return {
    monthLabel: format(monthStart, 'MMM yyyy'),
    monthStart,
    income,
    expenses: expense,
    savings,
    investments,
    loanRepayments: loanRepaymentsOut,
    netCashFlow,
    savingsRate: income > 0 ? (savings / income) * 100 : null,
  }
}

/** `monthsBack` consecutive months ending with the current month, oldest first — so index i-1 is always "previous month" for index i. */
export function computeMonthlySummaries(
  monthsBack: number,
  now: number,
  transactions: Transaction[],
  loans: Loan[],
  loanRepayments: LoanRepayment[],
  dpsContributions: DpsContribution[],
  fdrs: Fdr[]
): MonthlySummary[] {
  const months = eachMonthOfInterval({
    start: startOfMonth(subMonths(now, monthsBack - 1)),
    end: startOfMonth(now),
  })
  return months.map((m) => {
    const monthStart = startOfMonth(m).getTime()
    const monthEnd = endOfMonth(m).getTime()
    return computeMonthlySummary(monthStart, monthEnd, transactions, loans, loanRepayments, dpsContributions, fdrs)
  })
}
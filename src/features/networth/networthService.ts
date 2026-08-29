// Net Worth calculation: pure aggregation over already-derived totals
// from each domain's own service/hook (balanceService, loanService,
// dpsService, fdrService, useCreditCards, useGoalsList). Never
// recomputes a balance or ledger sum itself — mirrors the Net Worth
// formula already used on the Dashboard (useDashboard.ts) so the two
// numbers can never disagree.
//
// IMPORTANT — never double-counts money:
//  - A Debit Card is never summed on top of its linked Account (it has
//    no balance field of its own — see types/entities.ts).
//  - A credit-card PURCHASE is money already spent (an Expense); it is
//    never treated as a liability twice — only outstandingBalance is.
//  - Transfers between the user's own accounts move money between
//    Account balances only; they never appear here as a separate item.
//  - DPS/FDR principal leaves the source account's ledger the moment
//    it's contributed/invested (see dpsService/fdrService) — so it is
//    counted once, as its own asset line, never inside "accounts" too.

import { format } from 'date-fns'
import { APP_CONFIG } from '@/config/app.config'
import type { Account, Dps, DpsContribution, Fdr, FdrPayout, Loan, LoanRepayment, LedgerEntry } from '@/types/entities'

export interface NetWorthBreakdownItem {
  id: string
  label: string
  amount: number
}

export interface NetWorthResult {
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  assets: NetWorthBreakdownItem[]
  liabilities: NetWorthBreakdownItem[]
}

export interface NetWorthInputs {
  accounts: Account[] // active, same-currency accounts only
  dpsDeposited: number // dps.totalDeposited (see useDps)
  fdrPrincipal: number // fdr.totalPrincipal (see useFdrs)
  loansReceivable: number // given-loan outstanding — an asset (loans.totalReceivable)
  goalsEarmarked: number // money already moved into savings goals — an asset
  loansPayable: number // taken-loan outstanding — a liability (loans.totalBorrowedOutstanding)
  creditCardOutstanding: number // creditCards.totalOutstanding
  otherLiabilities?: number // reserved for future liability types
}

const ACCOUNT_TYPE_LABEL: Record<Account['type'], string> = {
  cash: 'Cash',
  bank: 'Bank Accounts',
  mobile_wallet: 'Mobile Wallets (bKash/Nagad/Rocket)',
  card: 'Card Accounts',
  savings: 'Savings Accounts',
  other: 'Other Accounts',
}

/** Groups accounts by type and sums each group's real ledger balance — the only place account balances feed into Net Worth. */
export function groupAccountsByType(accounts: Account[]): NetWorthBreakdownItem[] {
  const sums = new Map<Account['type'], number>()
  for (const a of accounts) {
    sums.set(a.type, (sums.get(a.type) ?? 0) + a.balance)
  }
  return Array.from(sums.entries())
    .map(([type, amount]) => ({ id: type, label: ACCOUNT_TYPE_LABEL[type], amount }))
    .filter((i) => i.amount !== 0)
    .sort((a, b) => b.amount - a.amount)
}

/** Current Net Worth snapshot with a full asset/liability breakdown. */
export function computeNetWorth(inputs: NetWorthInputs): NetWorthResult {
  const assets: NetWorthBreakdownItem[] = [
    ...groupAccountsByType(inputs.accounts),
    ...(inputs.dpsDeposited > 0 ? [{ id: 'dps', label: 'DPS (Current Value)', amount: inputs.dpsDeposited }] : []),
    ...(inputs.fdrPrincipal > 0 ? [{ id: 'fdr', label: 'FDR (Current Value)', amount: inputs.fdrPrincipal }] : []),
    ...(inputs.loansReceivable > 0
      ? [{ id: 'receivable', label: 'Money Owed to You (Loans Given)', amount: inputs.loansReceivable }]
      : []),
    ...(inputs.goalsEarmarked > 0 ? [{ id: 'goals', label: 'Savings Goals', amount: inputs.goalsEarmarked }] : []),
  ]

  const liabilities: NetWorthBreakdownItem[] = [
    ...(inputs.loansPayable > 0 ? [{ id: 'loans', label: 'Loans Outstanding', amount: inputs.loansPayable }] : []),
    ...(inputs.creditCardOutstanding > 0
      ? [{ id: 'cc', label: 'Credit Card Outstanding', amount: inputs.creditCardOutstanding }]
      : []),
    ...(inputs.otherLiabilities && inputs.otherLiabilities > 0
      ? [{ id: 'other', label: 'Other Liabilities', amount: inputs.otherLiabilities }]
      : []),
  ]

  const totalAssets = assets.reduce((s, i) => s + i.amount, 0)
  const totalLiabilities = liabilities.reduce((s, i) => s + i.amount, 0)

  return { totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities, assets, liabilities }
}

// ---------------------------------------------------------------------
// NET WORTH HISTORY
//
// Accounts, DPS, FDR and Loans are reconstructed accurately as of each
// past date from their own dated records (ledger entries, contributions,
// startDate + repayments) — nothing here is a second balance engine, it
// only re-filters records the app already stores by date. Credit-card
// outstanding and Savings-Goal totals have no historical ledger in this
// schema (only the current cached value is stored), so those two use
// today's value at every point in the trend — a documented, honest
// simplification rather than a fabricated history.
// ---------------------------------------------------------------------

export interface NetWorthTrendPoint {
  label: string
  date: number
  assets: number
  liabilities: number
  netWorth: number
}

export function computeNetWorthHistory(
  monthEnds: number[],
  accounts: Account[],
  ledgerEntries: LedgerEntry[],
  loans: Loan[],
  loanRepayments: LoanRepayment[],
  dps: Dps[],
  dpsContributions: DpsContribution[],
  fdrs: Fdr[],
  fdrPayouts: FdrPayout[],
  creditCardOutstandingNow: number,
  goalsCurrentTotal: number
): NetWorthTrendPoint[] {
  const currency = APP_CONFIG.defaultCurrency
  const relevantAccounts = accounts.filter((a) => a.currency === currency)

  const entriesByAccount = new Map<string, LedgerEntry[]>()
  for (const e of ledgerEntries) {
    const list = entriesByAccount.get(e.accountId) ?? []
    list.push(e)
    entriesByAccount.set(e.accountId, list)
  }

  const fdrPayoutByFdr = new Map(fdrPayouts.map((p) => [p.fdrId, p]))

  return monthEnds.map((asOf) => {
    let accountsTotal = 0
    for (const a of relevantAccounts) {
      let bal = a.openingBalance
      for (const e of entriesByAccount.get(a.id) ?? []) {
        if (e.date <= asOf) bal += e.amount
      }
      accountsTotal += bal
    }

    let dpsTotal = 0
    for (const d of dps) {
      if (d.currency === currency && d.createdAt <= asOf) dpsTotal += d.openingDepositedAmount
    }
    for (const c of dpsContributions) {
      if (c.date <= asOf) dpsTotal += c.amount
    }

    let fdrTotal = 0
    for (const f of fdrs) {
      if (f.currency !== currency || f.startDate > asOf) continue
      const payout = fdrPayoutByFdr.get(f.id)
      if (payout && payout.date <= asOf) continue // matured/renewed/withdrawn by this date — money already moved elsewhere
      fdrTotal += f.principal
    }

    let receivable = 0
    let payable = 0
    for (const l of loans) {
      if (l.currency !== currency || l.startDate > asOf) continue
      let repaid = 0
      for (const r of loanRepayments) {
        if (r.loanId === l.id && r.date <= asOf) repaid += r.amount
      }
      const outstanding = Math.max(0, l.principal - repaid)
      if (l.direction === 'given') receivable += outstanding
      else payable += outstanding
    }

    const assets = accountsTotal + dpsTotal + fdrTotal + receivable + goalsCurrentTotal
    const liabilities = payable + creditCardOutstandingNow

    return { label: format(asOf, 'MMM yyyy'), date: asOf, assets, liabilities, netWorth: assets - liabilities }
  })
}
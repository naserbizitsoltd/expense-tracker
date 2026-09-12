import { useState } from 'react'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  HandCoins,
  Wallet2,
  Lock,
  ChevronRight,
  Wallet,
  CreditCard as CreditCardIcon,
  Landmark,
  Receipt,
  Repeat,
} from 'lucide-react'
import { AppShell } from '@/layouts/AppShell'
import { BottomNav } from '@/layouts/BottomNav'
import { Card, Badge, BalanceCard, BottomSheet, EmptyState, LoadingState } from '@/components/ui'
import { AccountListItem } from '@/features/accounts/components/AccountListItem'
import { BudgetCard } from '@/features/budgets/components/BudgetCard'
import { GoalCard } from '@/features/goals/components/GoalCard'
import { TransactionRow, SplitTransactionGroupRow } from '@/features/transactions/components/TransactionRow'
import { ExpenseFormSheet } from '@/features/transactions/components/ExpenseFormSheet'
import { IncomeFormSheet } from '@/features/transactions/components/IncomeFormSheet'
import { TransferFormSheet } from '@/features/transactions/components/TransferFormSheet'
import { SuccessToast } from '@/features/transactions/components/SuccessToast'
import { LoanForm } from '@/features/loans/components/LoanForm'
import { DpsForm } from '@/features/dps/components/DpsForm'
import { FdrForm } from '@/features/fdr/FdrForm'
import { useDashboard } from '../useDashboard'
import { formatAmount } from '@/lib/money'
import { APP_CONFIG } from '@/config/app.config'
import { format } from 'date-fns'
import type { Account, Category, Transaction } from '@/types/entities'

interface DashboardPageProps {
  activeNav: string
  onNavChange: (key: string) => void
  onOpenMenu: () => void
  onOpenAccount: (id: string) => void
  onOpenTransactions: () => void
  onOpenLoans: () => void
  onOpenDps: () => void
  onOpenFdr: () => void
  onOpenBudgets: () => void
  onOpenGoals: () => void
  onOpenCreditCards: () => void
  onOpenDebitCards: () => void
}

type QuickActionFeedback =
  | { kind: 'income' | 'expense'; transaction: Transaction; category: Category; account: Account | null }
  | { kind: 'transfer'; transaction: Transaction; fromAccount: Account; toAccount: Account }

function SectionHeader({ title, onViewAll }: { title: string; onViewAll?: () => void }) {
  return (
    <div className="flex items-center justify-between px-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {onViewAll && (
        <button onClick={onViewAll} className="flex items-center gap-0.5 text-xs font-medium text-primary">
          View All <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

export function DashboardPage({
  activeNav,
  onNavChange,
  onOpenMenu,
  onOpenAccount,
  onOpenTransactions,
  onOpenLoans,
  onOpenDps,
  onOpenFdr,
  onOpenBudgets,
  onOpenGoals,
  onOpenCreditCards,
  onOpenDebitCards,
}: DashboardPageProps) {
  const dashboard = useDashboard()
  const currency = APP_CONFIG.defaultCurrency

  const [expenseOpen, setExpenseOpen] = useState(false)
  const [incomeOpen, setIncomeOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [loanOpen, setLoanOpen] = useState(false)
  const [dpsOpen, setDpsOpen] = useState(false)
  const [fdrOpen, setFdrOpen] = useState(false)
  const [feedback, setFeedback] = useState<QuickActionFeedback | null>(null)

  const hasLoans = dashboard.loans.totalBorrowedOutstanding > 0 || dashboard.loans.totalReceivable > 0
  const hasDeposits = dashboard.deposits.dpsItems.length > 0 || dashboard.deposits.fdrItems.length > 0
  const activeCreditCards = dashboard.creditCards.activeCards
  const activeDebitCards = dashboard.debitCards.activeCards
  const topBudgets = dashboard.budgets.slice(0, 2)
  const topGoals = dashboard.goals.slice(0, 2)

  const budgetTotals = dashboard.budgets.reduce(
    (acc, b) => {
      if (b.budget.currency !== currency) return acc
      acc.spent += b.spent
      acc.amount += b.budget.amount
      return acc
    },
    { spent: 0, amount: 0 }
  )
  const budgetPercent = budgetTotals.amount > 0 ? Math.round((budgetTotals.spent / budgetTotals.amount) * 100) : 0
  const budgetRemaining = budgetTotals.amount - budgetTotals.spent

  return (
    <AppShell title="Home" headerMenu={onOpenMenu} bottomNav={<BottomNav active={activeNav} onChange={onNavChange} />}>
      <div className="flex flex-col gap-6">
        {/* 1. Total Available Money */}
        <BalanceCard label="Total Available" amount={formatAmount(dashboard.totalAvailable, currency)} />

        {/* 2. Net Worth + Today + Month */}
        <div className="grid grid-cols-2 gap-2.5">
          <Card className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground">Net Worth</p>
            <p className="text-lg font-bold tabular-nums text-foreground">{formatAmount(dashboard.netWorth, currency)}</p>
          </Card>
          <Card className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground">Today</p>
            <p className={`text-lg font-bold tabular-nums ${dashboard.today.net >= 0 ? 'text-success' : 'text-danger'}`}>
              {formatAmount(dashboard.today.net, currency)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              +{formatAmount(dashboard.today.income, currency)} · -{formatAmount(dashboard.today.expense, currency)}
            </p>
          </Card>
        </div>

        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">This Month</p>
            <p className={`text-lg font-bold tabular-nums ${dashboard.month.net >= 0 ? 'text-success' : 'text-danger'}`}>
              {formatAmount(dashboard.month.net, currency)}
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="text-success">Income {formatAmount(dashboard.month.income, currency)}</p>
            <p className="text-danger">Expense {formatAmount(dashboard.month.expense, currency)}</p>
          </div>
        </Card>

        {/* 14. Quick Actions */}
        <div className="grid grid-cols-3 gap-2.5">
          <QuickAction icon={<ArrowDownCircle className="h-5 w-5 text-success" />} label="Income" onClick={() => setIncomeOpen(true)} />
          <QuickAction icon={<ArrowUpCircle className="h-5 w-5 text-danger" />} label="Expense" onClick={() => setExpenseOpen(true)} />
          <QuickAction icon={<ArrowLeftRight className="h-5 w-5 text-muted-foreground" />} label="Transfer" onClick={() => setTransferOpen(true)} />
          <QuickAction icon={<HandCoins className="h-5 w-5 text-primary" />} label="Loan" onClick={() => setLoanOpen(true)} />
          <QuickAction icon={<Wallet2 className="h-5 w-5 text-primary" />} label="DPS" onClick={() => setDpsOpen(true)} />
          <QuickAction icon={<Lock className="h-5 w-5 text-primary" />} label="FDR" onClick={() => setFdrOpen(true)} />
        </div>

        {/* 5. Account Summary */}
        <section className="flex flex-col gap-2.5">
          <SectionHeader title="Accounts" onViewAll={() => onNavChange('accounts')} />
          {dashboard.accountsLoading && <LoadingState label="Loading accounts..." />}
          {!dashboard.accountsLoading && dashboard.topAccounts.length === 0 && (
            <EmptyState icon={<Wallet className="h-6 w-6" />} title="No accounts yet" description="Add an account to see it here." />
          )}
          <div className="flex flex-col gap-2">
            {dashboard.topAccounts.map((account) => (
              <AccountListItem key={account.id} account={account} onClick={() => onOpenAccount(account.id)} />
            ))}
          </div>
        </section>

        {/* 6. Loans Summary */}
        <section className="flex flex-col gap-2.5">
          <SectionHeader title="Loans" onViewAll={onOpenLoans} />
          {hasLoans ? (
            <div className="grid grid-cols-2 gap-2.5">
              <Card className="flex flex-col gap-1" onClick={onOpenLoans}>
                <p className="text-xs font-medium text-muted-foreground">You Owe</p>
                <p className="text-base font-bold tabular-nums text-danger">
                  {formatAmount(dashboard.loans.totalBorrowedOutstanding, currency)}
                </p>
              </Card>
              <Card className="flex flex-col gap-1">
                <p className="text-xs font-medium text-muted-foreground">Others Owe You</p>
                <p className="text-base font-bold tabular-nums text-success">
                  {formatAmount(dashboard.loans.totalReceivable, currency)}
                </p>
              </Card>
            </div>
          ) : (
            <EmptyState icon={<HandCoins className="h-6 w-6" />} title="No active loans" description="Loans you give or take will show up here." />
          )}
        </section>

        {/* 7. DPS / FDR Summary */}
        <section className="flex flex-col gap-2.5">
          <SectionHeader title="DPS & FDR" onViewAll={onOpenDps} />
          {hasDeposits ? (
            <>
              <div className="grid grid-cols-3 gap-2.5">
                <Card className="flex flex-col gap-1" padding="sm" onClick={onOpenDps}>
                  <p className="text-[11px] font-medium text-muted-foreground">DPS</p>
                  <p className="text-sm font-bold tabular-nums text-foreground">{formatAmount(dashboard.deposits.dpsBalance, currency)}</p>
                </Card>
                <Card className="flex flex-col gap-1" padding="sm" onClick={onOpenFdr}>
                  <p className="text-[11px] font-medium text-muted-foreground">FDR</p>
                  <p className="text-sm font-bold tabular-nums text-foreground">{formatAmount(dashboard.deposits.fdrPrincipal, currency)}</p>
                </Card>
                <Card className="flex flex-col gap-1" padding="sm">
                  <p className="text-[11px] font-medium text-muted-foreground">Total</p>
                  <p className="text-sm font-bold tabular-nums text-primary">{formatAmount(dashboard.deposits.totalDeposits, currency)}</p>
                </Card>
              </div>
            </>
          ) : (
            <EmptyState icon={<Wallet2 className="h-6 w-6" />} title="No DPS or FDR yet" description="Locked savings will show up here." />
          )}
        </section>

        {/* 8. Credit / Debit Card Summary */}
        {(activeCreditCards.length > 0 || activeDebitCards.length > 0) && (
          <section className="flex flex-col gap-2.5">
            <SectionHeader title="Cards" />
            {activeCreditCards.length > 0 && (
              <Card onClick={onOpenCreditCards} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-muted text-primary">
                    <CreditCardIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Credit Cards</p>
                    <p className="text-xs text-muted-foreground">
                      Available {formatAmount(dashboard.creditCards.totalCreditLimit - dashboard.creditCards.totalOutstanding, currency)}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-bold tabular-nums text-danger">{formatAmount(dashboard.creditCards.totalOutstanding, currency)}</p>
              </Card>
            )}
            {activeDebitCards.slice(0, 3).map((card) => (
              <Card key={card.id} onClick={onOpenDebitCards} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-muted text-primary">
                    <Landmark className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{card.name}</p>
                    <p className="text-xs text-muted-foreground">•••• {card.last4}</p>
                  </div>
                </div>
                <p className="text-sm font-bold tabular-nums text-foreground">
                  {formatAmount(dashboard.debitCards.accountsById.get(card.accountId)?.balance ?? 0, currency)}
                </p>
              </Card>
            ))}
          </section>
        )}

        {/* 9. Budget Summary */}
        <section className="flex flex-col gap-2.5">
          <SectionHeader title="Budgets" onViewAll={onOpenBudgets} />
          {dashboard.budgets.length > 0 ? (
            <>
              <Card onClick={onOpenBudgets} className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-foreground">
                    {formatAmount(budgetTotals.spent, currency)} / {formatAmount(budgetTotals.amount, currency)}
                  </span>
                  <span className="text-muted-foreground">{budgetPercent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
                  <div
                    className={`h-full rounded-full ${budgetRemaining < 0 ? 'bg-danger' : 'bg-primary'}`}
                    style={{ width: `${Math.min(100, Math.max(0, budgetPercent))}%` }}
                  />
                </div>
                {budgetRemaining < 0 ? (
                  <Badge variant="danger">Over Budget {formatAmount(Math.abs(budgetRemaining), currency)}</Badge>
                ) : (
                  <p className="text-xs text-muted-foreground">Remaining {formatAmount(budgetRemaining, currency)}</p>
                )}
              </Card>
              {topBudgets.map((item) => (
                <BudgetCard key={item.budget.id} item={item} onClick={onOpenBudgets} />
              ))}
            </>
          ) : (
            <EmptyState icon={<Wallet className="h-6 w-6" />} title="No budgets yet" description="Set a budget to track your spending." />
          )}
        </section>

        {/* 10. Goals Summary */}
        <section className="flex flex-col gap-2.5">
          <SectionHeader title="Savings Goals" onViewAll={onOpenGoals} />
          {topGoals.length > 0 ? (
            topGoals.map((item) => <GoalCard key={item.goal.id} item={item} onClick={onOpenGoals} />)
          ) : (
            <EmptyState icon={<Wallet className="h-6 w-6" />} title="No goals yet" description="Create a savings goal to track progress." />
          )}
        </section>

        {/* 11. Recent Transactions */}
        <section className="flex flex-col gap-1">
          <SectionHeader title="Recent Transactions" onViewAll={onOpenTransactions} />
          {dashboard.transactionsLoading && <LoadingState label="Loading transactions..." />}
          {!dashboard.transactionsLoading && dashboard.recentTransactions.length === 0 && (
            <EmptyState icon={<Receipt className="h-6 w-6" />} title="No transactions yet" description="Your latest activity will show up here." />
          )}
          <div className="flex flex-col divide-y divide-border/60">
            {dashboard.recentTransactions.map((item) =>
              item.kind === 'split' ? (
                <SplitTransactionGroupRow key={item.splitGroupId} group={item} />
              ) : (
                <TransactionRow key={item.transaction.id} {...item} />
              )
            )}
          </div>
        </section>

        {/* 12. Upcoming Financial Events */}
        {dashboard.upcomingEvents.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <SectionHeader title="Upcoming" />
            <div className="flex flex-col gap-2">
              {dashboard.upcomingEvents.map((event) => (
                <Card key={event.id} className="flex items-center justify-between" padding="sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-muted text-primary">
                      <Repeat className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{event.label}</p>
                      <p className="text-xs text-muted-foreground">{format(event.date, 'd MMM')}</p>
                    </div>
                  </div>
                  {event.amount !== null && (
                    <p className="text-sm font-semibold tabular-nums text-foreground">{formatAmount(event.amount, event.currency)}</p>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Quick action sheets — reuse the exact same forms as every other screen */}
      <ExpenseFormSheet
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        onSaved={(transaction, category, account) => setFeedback({ kind: 'expense', transaction, category, account })}
      />
      <IncomeFormSheet
        open={incomeOpen}
        onClose={() => setIncomeOpen(false)}
        onSaved={(transaction, category, account) => setFeedback({ kind: 'income', transaction, category, account })}
      />
      <TransferFormSheet
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        onSaved={(transaction, fromAccount, toAccount) => setFeedback({ kind: 'transfer', transaction, fromAccount, toAccount })}
      />
      <BottomSheet open={loanOpen} onClose={() => setLoanOpen(false)} title="Add Loan">
        <LoanForm onDone={() => setLoanOpen(false)} />
      </BottomSheet>
      <BottomSheet open={dpsOpen} onClose={() => setDpsOpen(false)} title="Add DPS">
        <DpsForm onDone={() => setDpsOpen(false)} />
      </BottomSheet>
      <BottomSheet open={fdrOpen} onClose={() => setFdrOpen(false)} title="Add FDR">
        <FdrForm onDone={() => setFdrOpen(false)} />
      </BottomSheet>

      {feedback && feedback.kind !== 'transfer' && (
        <SuccessToast
          message={feedback.kind === 'income' ? 'Income added' : 'Expense added'}
          amount={feedback.kind === 'income' ? feedback.transaction.amount : -feedback.transaction.amount}
          currency={feedback.transaction.currency}
          onDismiss={() => setFeedback(null)}
        />
      )}
      {feedback && feedback.kind === 'transfer' && (
        <SuccessToast
          message="Transfer completed"
          detail={`${feedback.fromAccount.name} → ${feedback.toAccount.name}`}
          amount={feedback.transaction.amount}
          currency={feedback.transaction.currency}
          variant="neutral"
          onDismiss={() => setFeedback(null)}
        />
      )}
    </AppShell>
  )
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface py-3 text-xs font-semibold text-foreground transition-colors active:bg-surface-elevated"
    >
      {icon}
      {label}
    </button>
  )
}
import { Tags, ChevronRight, Repeat, PiggyBank, Target, CreditCard, Landmark, HandCoins, Wallet2, Lock, Layers } from 'lucide-react'
import { AppShell } from '@/layouts/AppShell'
import { BottomNav } from '@/layouts/BottomNav'
import { BackupRestoreSection } from '@/features/backup/components/BackupRestoreSection'

interface MoreMenuPageProps {
  activeNav: string
  onNavChange: (key: string) => void
    onOpenCategories: () => void
  onOpenRecurring: () => void
    onOpenBudgets: () => void
  onOpenGoals: () => void
    onOpenCreditCards: () => void
  onOpenDebitCards: () => void
  onOpenLoans: () => void
  onOpenDps: () => void
  onOpenFdr: () => void
  onOpenDeposits: () => void
}
export function MoreMenuPage({
  activeNav,
  onNavChange,
  onOpenCategories,
  onOpenRecurring,
    onOpenBudgets,
  onOpenGoals,
  onOpenCreditCards,
  onOpenDebitCards,
  onOpenLoans,
  onOpenDps,
  onOpenFdr,
  onOpenDeposits,
}: MoreMenuPageProps)  {
  return (
    <AppShell title="More" bottomNav={<BottomNav active={activeNav} onChange={onNavChange} />}>
      <div className="flex flex-col gap-2">
        <button
          onClick={onOpenCategories}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left transition-colors active:bg-surface-elevated"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-muted text-primary">
            <Tags className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Categories</p>
            <p className="text-xs text-muted-foreground">Manage expense & income categories</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          onClick={onOpenRecurring}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left transition-colors active:bg-surface-elevated"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-muted text-primary">
            <Repeat className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Recurring Transactions</p>
            <p className="text-xs text-muted-foreground">Bills, subscriptions & salary on autopilot</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          onClick={onOpenBudgets}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left transition-colors active:bg-surface-elevated"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-muted text-primary">
            <PiggyBank className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Budgets</p>
            <p className="text-xs text-muted-foreground">Track spending against limits by category</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          onClick={onOpenGoals}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left transition-colors active:bg-surface-elevated"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-muted text-primary">
            <Target className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Savings Goals</p>
            <p className="text-xs text-muted-foreground">Save toward something without opening a new account</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          onClick={onOpenCreditCards}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left transition-colors active:bg-surface-elevated"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-muted text-primary">
            <CreditCard className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Credit Cards</p>
            <p className="text-xs text-muted-foreground">Track limit and outstanding balance as a liability</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          onClick={onOpenDebitCards}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left transition-colors active:bg-surface-elevated"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-muted text-primary">
            <Landmark className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Debit Cards</p>
            <p className="text-xs text-muted-foreground">A quick face for spending straight from an account</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          onClick={onOpenLoans}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left transition-colors active:bg-surface-elevated"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-muted text-primary">
            <HandCoins className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Loans</p>
            <p className="text-xs text-muted-foreground">Track money borrowed or lent, with repayments</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          onClick={onOpenDps}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left transition-colors active:bg-surface-elevated"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-muted text-primary">
            <Wallet2 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">DPS</p>
            <p className="text-xs text-muted-foreground">Track recurring deposit schemes and contributions</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
                <button
          onClick={onOpenFdr}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left transition-colors active:bg-surface-elevated"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-muted text-primary">
            <Lock className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">FDR</p>
            <p className="text-xs text-muted-foreground">Track fixed deposits locked for a set term</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          onClick={onOpenDeposits}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left transition-colors active:bg-surface-elevated"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-muted text-primary">
            <Layers className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Savings & Deposits</p>
            <p className="text-xs text-muted-foreground">A unified overview of your DPS and FDR</p>
          </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>

        <BackupRestoreSection />
      </div>
    </AppShell>
  )
}
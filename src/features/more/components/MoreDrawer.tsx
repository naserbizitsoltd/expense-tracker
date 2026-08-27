import { Tags, ChevronRight, Repeat, PiggyBank, Target, CreditCard, Landmark, HandCoins, Wallet2, Lock, Layers, Bell } from 'lucide-react'
import { BottomSheet } from '@/components/ui'

interface MoreDrawerProps {
  open: boolean
  onClose: () => void
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
  onOpenSettings: () => void
}

const ITEMS = (props: MoreDrawerProps) => [
  { icon: Tags, label: 'Categories', desc: 'Manage expense & income categories', onClick: props.onOpenCategories },
  { icon: Repeat, label: 'Recurring Transactions', desc: 'Bills, subscriptions & salary on autopilot', onClick: props.onOpenRecurring },
  { icon: PiggyBank, label: 'Budgets', desc: 'Track spending against limits by category', onClick: props.onOpenBudgets },
  { icon: Target, label: 'Savings Goals', desc: 'Save toward something without opening a new account', onClick: props.onOpenGoals },
  { icon: CreditCard, label: 'Credit Cards', desc: 'Track limit and outstanding balance as a liability', onClick: props.onOpenCreditCards },
  { icon: Landmark, label: 'Debit Cards', desc: 'A quick face for spending straight from an account', onClick: props.onOpenDebitCards },
  { icon: HandCoins, label: 'Loans', desc: 'Track money borrowed or lent, with repayments', onClick: props.onOpenLoans },
  { icon: Wallet2, label: 'DPS', desc: 'Track recurring deposit schemes and contributions', onClick: props.onOpenDps },
  { icon: Lock, label: 'FDR', desc: 'Track fixed deposits locked for a set term', onClick: props.onOpenFdr },
  { icon: Layers, label: 'Savings & Deposits', desc: 'A unified overview of your DPS and FDR', onClick: props.onOpenDeposits },
  { icon: Bell, label: 'Settings', desc: 'Notifications, theme & backup', onClick: props.onOpenSettings },
]

export function MoreDrawer(props: MoreDrawerProps) {
  const { open, onClose } = props

  function handleSelect(action: () => void) {
    onClose()
    action()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="More">
      <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto pr-0.5">
        {ITEMS(props).map(({ icon: Icon, label, desc, onClick }) => (
          <button
            key={label}
            onClick={() => handleSelect(onClick)}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left transition-colors active:bg-surface-elevated"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-muted text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}
import { useState } from 'react'
import {
  Tags, ChevronRight, ChevronLeft, Repeat, PiggyBank, Target, CreditCard,
  Landmark, HandCoins, Wallet2, Lock, Layers, Bell, X,
} from 'lucide-react'
import { cn } from '@/lib/cn'

interface SidebarProps {
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

const ITEMS = (props: SidebarProps) => [
  { icon: Tags, label: 'Categories', onClick: props.onOpenCategories },
  { icon: Repeat, label: 'Recurring', onClick: props.onOpenRecurring },
  { icon: PiggyBank, label: 'Budgets', onClick: props.onOpenBudgets },
  { icon: Target, label: 'Savings Goals', onClick: props.onOpenGoals },
  { icon: CreditCard, label: 'Credit Cards', onClick: props.onOpenCreditCards },
  { icon: Landmark, label: 'Debit Cards', onClick: props.onOpenDebitCards },
  { icon: HandCoins, label: 'Loans', onClick: props.onOpenLoans },
  { icon: Wallet2, label: 'DPS', onClick: props.onOpenDps },
  { icon: Lock, label: 'FDR', onClick: props.onOpenFdr },
  { icon: Layers, label: 'Savings & Deposits', onClick: props.onOpenDeposits },
  { icon: Bell, label: 'Settings', onClick: props.onOpenSettings },
]

export function Sidebar(props: SidebarProps) {
  const { open, onClose } = props
  const [collapsed, setCollapsed] = useState(false)

  function handleSelect(action: () => void) {
    onClose()
    action()
  }

  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-200',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      {/* panel */}
      <aside
        className={cn(
          'safe-top safe-bottom fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-surface shadow-elevated transition-all duration-200 ease-out',
          collapsed ? 'w-[76px]' : 'w-[268px]',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-4 pt-4">
          {!collapsed && <span className="text-sm font-semibold text-foreground">Menu</span>}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-elevated"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
            <button
              onClick={onClose}
              aria-label="Close menu"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-elevated md:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav className="mt-3 flex-1 space-y-1 overflow-y-auto px-2.5 pb-4">
          {ITEMS(props).map(({ icon: Icon, label, onClick }) => (
            <button
              key={label}
              onClick={() => handleSelect(onClick)}
              title={collapsed ? label : undefined}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated active:scale-[0.98]',
                collapsed && 'justify-center px-0'
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-muted text-primary">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              {!collapsed && <span className="truncate">{label}</span>}
            </button>
          ))}
        </nav>
      </aside>
    </>
  )
}
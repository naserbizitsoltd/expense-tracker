import { useEffect, useState } from 'react'
import {
  Tags, ChevronRight, ChevronLeft, Repeat, PiggyBank, Target, CreditCard,
  Landmark, HandCoins, Wallet2, Lock, Layers, Bell, X, Scale, ArrowLeftRight, CalendarRange, CalendarDays,
  HeartPulse,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
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
  onOpenNetWorth: () => void
  onOpenCashFlow: () => void
  onOpenMonthlySummary: () => void
  onOpenFinancialCalendar: () => void
  onOpenFinancialHealth: () => void
  onOpenSettings: () => void
}

const ITEMS = (props: SidebarProps) => [
  { icon: Scale, label: 'Net Worth', onClick: props.onOpenNetWorth },
  { icon: HeartPulse, label: 'Financial Health', onClick: props.onOpenFinancialHealth },
  { icon: ArrowLeftRight, label: 'Cash Flow', onClick: props.onOpenCashFlow },
  { icon: CalendarRange, label: 'Monthly Summary', onClick: props.onOpenMonthlySummary },
  { icon: CalendarDays, label: 'Financial Calendar', onClick: props.onOpenFinancialCalendar },
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
  // While the drawer is opening or closing, its panel is a full-height
  // `glass-surface` (20px blur) sliding via transform. Re-blurring that
  // every frame while it's also moving — and while the page underneath is
  // running its own swap animation — is the main source of "sidebar
  // navigation feels laggy". Drop to a plain solid fill for the brief
  // window the panel is actually in motion, same trick as the page
  // transitions, then restore the frosted look once it's settled.
  const [isAnimating, setIsAnimating] = useState(false)

  function handleSelect(action: () => void) {
    setIsAnimating(true)
    onClose()
    action()
  }

  function handleClose() {
    setIsAnimating(true)
    onClose()
  }

  // Also cover the opening animation, not just closing — the panel is
  // just as much in motion (and just as expensive to blur) sliding in.
  useEffect(() => {
    setIsAnimating(true)
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* backdrop */}
          <motion.div
            key="sidebar-backdrop"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60"
          />

          {/* panel */}
          <motion.aside
            key="sidebar-panel"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => setIsAnimating(false)}
            className={cn(
              'safe-top safe-bottom glass-surface elevated-shadow fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border',
              collapsed ? 'w-[76px]' : 'w-[268px]',
              isAnimating && 'transition-active'
            )}
          >
            <div className="flex items-center justify-between px-4 pt-4">
              {!collapsed && (
                <span className="gradient-hero bg-clip-text text-sm font-bold text-transparent">Menu</span>
              )}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCollapsed((c) => !c)}
                  aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-elevated"
                >
                  {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
                <button
                  onClick={handleClose}
                  aria-label="Close menu"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-elevated md:hidden"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <nav className="mt-3 flex-1 space-y-1 overflow-y-auto px-2.5 pb-4">
              {ITEMS(props).map(({ icon: Icon, label, onClick }, i) => (
                <motion.button
                  key={label}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.03 * i, duration: 0.22, ease: 'easeOut' }}
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
                </motion.button>
              ))}
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
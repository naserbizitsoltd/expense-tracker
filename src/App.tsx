import { useState } from 'react'
import { type LucideIcon, PieChart } from 'lucide-react'
import { ToastProvider, EmptyState } from '@/components/ui'
import { PwaStatusLayer } from '@/components/pwa/PwaStatusLayer'
import { AppShell } from '@/layouts/AppShell'
import { RecurringDueBanner } from '@/features/recurring/components/RecurringDueBanner'
import { NotificationRunner } from '@/features/notifications/components/NotificationRunner'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'
import { BottomNav } from '@/layouts/BottomNav'
import { AccountsPage } from '@/features/accounts/pages/AccountsPage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { ReportsPage } from '@/features/reports/pages/ReportsPage'
import { AccountDetailsPage } from '@/features/accounts/pages/AccountDetailsPage'
import { TransactionsPage } from '@/features/transactions/pages/TransactionsPage'
import { MoreMenuPage } from '@/features/more/pages/MoreMenuPage'
import { CategoriesPage } from '@/features/categories/pages/CategoriesPage'
import { RecurringPage } from '@/features/recurring/pages/RecurringPage'
import { BudgetPage } from '@/features/budgets/pages/BudgetPage'
import { GoalPage } from '@/features/goals/pages/GoalPage'
import { CreditCardsPage } from '@/features/credit-cards/pages/CreditCardsPage'
import { DebitCardsPage } from '@/features/debit-cards/pages/DebitCardsPage'
import { LoanPage } from '@/features/loans/pages/LoanPage'
import { DpsPage } from '@/features/dps/pages/DpsPage'
import { FdrPage } from '@/features/fdr/pages/FdrPage'
import { DepositsOverviewPage } from '@/features/deposits/pages/DepositsOverviewPage'

type NavKey = 'home' | 'transactions' | 'accounts' | 'reports' | 'more'
type PlaceholderNavKey = Exclude<NavKey, 'accounts' | 'transactions' | 'more' | 'home'>

const COMING_SOON: Record<PlaceholderNavKey, { title: string; icon: LucideIcon; description: string }> = {
  reports: { title: 'Reports', icon: PieChart, description: 'Spending insights and charts will show up here.' },
}

function ComingSoonScreen({ navKey, onNavChange }: { navKey: PlaceholderNavKey; onNavChange: (key: NavKey) => void }) {
  const { title, icon: Icon, description } = COMING_SOON[navKey]
  return (
    <AppShell title={title} bottomNav={<BottomNav active={navKey} onChange={(key) => onNavChange(key as NavKey)} />}>
      <EmptyState icon={<Icon className="h-6 w-6" />} title="Coming soon" description={description} />
    </AppShell>
  )
}

// No placeholder tabs remain — every entry in NavKey now has a real screen above.

function AppContent() {
  const [activeNav, setActiveNav] = useState<NavKey>('accounts')
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [showCategories, setShowCategories] = useState(false)
  const [showRecurring, setShowRecurring] = useState(false)
  const [showBudgets, setShowBudgets] = useState(false)
  const [showGoals, setShowGoals] = useState(false)
  const [showCreditCards, setShowCreditCards] = useState(false)
  const [showDebitCards, setShowDebitCards] = useState(false)
  const [showLoans, setShowLoans] = useState(false)
  const [showDps, setShowDps] = useState(false)
  const [showFdr, setShowFdr] = useState(false)
  const [showDeposits, setShowDeposits] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Home tab - central dashboard
  if (activeNav === 'home') {
    if (selectedAccountId) {
      return <AccountDetailsPage accountId={selectedAccountId} onBack={() => setSelectedAccountId(null)} />
    }
    return (
      <DashboardPage
        activeNav={activeNav}
        onNavChange={(key) => setActiveNav(key as NavKey)}
        onOpenAccount={setSelectedAccountId}
        onOpenTransactions={() => setActiveNav('transactions')}
        onOpenLoans={() => {
          setActiveNav('more')
          setShowLoans(true)
        }}
        onOpenDps={() => {
          setActiveNav('more')
          setShowDps(true)
        }}
        onOpenFdr={() => {
          setActiveNav('more')
          setShowFdr(true)
        }}
        onOpenBudgets={() => {
          setActiveNav('more')
          setShowBudgets(true)
        }}
        onOpenGoals={() => {
          setActiveNav('more')
          setShowGoals(true)
        }}
        onOpenCreditCards={() => {
          setActiveNav('more')
          setShowCreditCards(true)
        }}
        onOpenDebitCards={() => {
          setActiveNav('more')
          setShowDebitCards(true)
        }}
      />
    )
  }

  // Accounts tab - shows account list or account detail
  if (activeNav === 'accounts') {
    if (selectedAccountId) {
      return <AccountDetailsPage accountId={selectedAccountId} onBack={() => setSelectedAccountId(null)} />
    }
    return (
      <AccountsPage
        activeNav={activeNav}
        onNavChange={(key) => setActiveNav(key as NavKey)}
        onOpenAccount={setSelectedAccountId}
      />
    )
  }

  // Transactions tab - shows expense list
  if (activeNav === 'transactions') {
    return <TransactionsPage activeNav={activeNav} onNavChange={(key) => setActiveNav(key as NavKey)} />
  }

  // Reports tab - financial analysis
  if (activeNav === 'reports') {
    return <ReportsPage activeNav={activeNav} onNavChange={(key) => setActiveNav(key as NavKey)} />
  }

  // More tab - shows the More menu, Category Management, Recurring Transactions, Budgets, or Goals
  if (activeNav === 'more') {
    if (showCategories) {
      return <CategoriesPage onBack={() => setShowCategories(false)} />
    }
    if (showRecurring) {
      return <RecurringPage onBack={() => setShowRecurring(false)} />
    }
    if (showBudgets) {
      return <BudgetPage onBack={() => setShowBudgets(false)} />
    }
    if (showGoals) {
      return <GoalPage onBack={() => setShowGoals(false)} />
    }
    if (showCreditCards) {
      return <CreditCardsPage onBack={() => setShowCreditCards(false)} />
    }
    if (showDebitCards) {
      return <DebitCardsPage onBack={() => setShowDebitCards(false)} />
    }
    if (showLoans) {
      return <LoanPage onBack={() => setShowLoans(false)} />
    }
    if (showDps) {
      return <DpsPage onBack={() => setShowDps(false)} />
    }
    if (showFdr) {
      return <FdrPage onBack={() => setShowFdr(false)} />
    }
    if (showDeposits) {
      return (
        <DepositsOverviewPage
          onBack={() => setShowDeposits(false)}
          onOpenDps={() => {
            setShowDeposits(false)
            setShowDps(true)
          }}
          onOpenFdr={() => {
            setShowDeposits(false)
            setShowFdr(true)
          }}
        />
      )
    }
    if (showSettings) {
      return <SettingsPage onBack={() => setShowSettings(false)} />
    }
    return (
      <MoreMenuPage
        activeNav={activeNav}
        onNavChange={(key) => setActiveNav(key as NavKey)}
        onOpenCategories={() => setShowCategories(true)}
        onOpenRecurring={() => setShowRecurring(true)}
        onOpenBudgets={() => setShowBudgets(true)}
        onOpenGoals={() => setShowGoals(true)}
        onOpenCreditCards={() => setShowCreditCards(true)}
        onOpenDebitCards={() => setShowDebitCards(true)}
        onOpenLoans={() => setShowLoans(true)}
        onOpenDps={() => setShowDps(true)}
        onOpenFdr={() => setShowFdr(true)}
        onOpenDeposits={() => setShowDeposits(true)}
        onOpenSettings={() => setShowSettings(true)}
      />
    )
  }

  // Remaining tab (reports) shows Coming Soon
  return <ComingSoonScreen navKey={activeNav as PlaceholderNavKey} onNavChange={setActiveNav} />
}

function App() {
  return (
    <ToastProvider>
      <PwaStatusLayer />
      <RecurringDueBanner />
      <NotificationRunner />
      <AppContent />
    </ToastProvider>
  )
}

export default App
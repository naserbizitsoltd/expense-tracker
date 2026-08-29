import { useState } from 'react'
import { type LucideIcon, PieChart } from 'lucide-react'
import { ToastProvider, EmptyState } from '@/components/ui'
import { PwaStatusLayer } from '@/components/pwa/PwaStatusLayer'
import { AppShell } from '@/layouts/AppShell'
import { RecurringDueBanner } from '@/features/recurring/components/RecurringDueBanner'
import { NotificationRunner } from '@/features/notifications/components/NotificationRunner'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'
import { ThemeApplier } from '@/features/settings/ThemeApplier'
import { BottomNav } from '@/layouts/BottomNav'
import { Sidebar } from '@/layouts/Sidebar'
import { AccountsPage } from '@/features/accounts/pages/AccountsPage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { ReportsPage } from '@/features/reports/pages/ReportsPage'
import { AccountDetailsPage } from '@/features/accounts/pages/AccountDetailsPage'
import { TransactionsPage } from '@/features/transactions/pages/TransactionsPage'
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
import { NetWorthPage } from '@/features/networth/pages/NetWorthPage'
import { CashFlowPage } from '@/features/reports/pages/CashFlowPage'
import { MonthlySummaryPage } from '@/features/reports/pages/MonthlySummaryPage'
import { FinancialCalendarPage } from '@/features/calender/pages/FinancialCalendarPage'
import { FinancialHealthPage } from '@/features/health/pages/FinancialHealthPage'

type NavKey = 'home' | 'transactions' | 'accounts' | 'reports'
type PlaceholderNavKey = Exclude<NavKey, 'accounts' | 'transactions' | 'home'>

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

function AppContent() {
  const [activeNav, setActiveNav] = useState<NavKey>('home')
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
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
  const [showNetWorth, setShowNetWorth] = useState(false)
  const [showCashFlow, setShowCashFlow] = useState(false)
  const [showMonthlySummary, setShowMonthlySummary] = useState(false)
  const [showFinancialCalendar, setShowFinancialCalendar] = useState(false)
  const [showFinancialHealth, setShowFinancialHealth] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  function handleNavChange(key: string) {
    setActiveNav(key as NavKey)
  }

  // Full-screen pushed pages opened from the sidebar. These replace the tab
  // content entirely (back arrow, no bottom nav) — same as before, just no
  // longer gated behind activeNav === 'more'.
  if (showCategories) return <CategoriesPage onBack={() => setShowCategories(false)} />
  if (showRecurring) return <RecurringPage onBack={() => setShowRecurring(false)} />
  if (showBudgets) return <BudgetPage onBack={() => setShowBudgets(false)} />
  if (showGoals) return <GoalPage onBack={() => setShowGoals(false)} />
  if (showCreditCards) return <CreditCardsPage onBack={() => setShowCreditCards(false)} />
  if (showDebitCards) return <DebitCardsPage onBack={() => setShowDebitCards(false)} />
  if (showLoans) return <LoanPage onBack={() => setShowLoans(false)} />
  if (showDps) return <DpsPage onBack={() => setShowDps(false)} />
  if (showFdr) return <FdrPage onBack={() => setShowFdr(false)} />
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
  if (showNetWorth) return <NetWorthPage onBack={() => setShowNetWorth(false)} />
  if (showCashFlow) return <CashFlowPage onBack={() => setShowCashFlow(false)} />
  if (showMonthlySummary) return <MonthlySummaryPage onBack={() => setShowMonthlySummary(false)} />
  if (showFinancialCalendar) return <FinancialCalendarPage onBack={() => setShowFinancialCalendar(false)} />
  if (showFinancialHealth) return <FinancialHealthPage onBack={() => setShowFinancialHealth(false)} />
  if (showSettings) return <SettingsPage onBack={() => setShowSettings(false)} />

  const sidebar = (
    <Sidebar
      open={sidebarOpen}
      onClose={() => setSidebarOpen(false)}
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
      onOpenNetWorth={() => setShowNetWorth(true)}
      onOpenCashFlow={() => setShowCashFlow(true)}
      onOpenMonthlySummary={() => setShowMonthlySummary(true)}
      onOpenFinancialCalendar={() => setShowFinancialCalendar(true)}
      onOpenFinancialHealth={() => setShowFinancialHealth(true)}
      onOpenSettings={() => setShowSettings(true)}
    />
  )
  // Home tab - central dashboard
  if (activeNav === 'home') {
    if (selectedAccountId) {
      return <AccountDetailsPage accountId={selectedAccountId} onBack={() => setSelectedAccountId(null)} />
    }
    return (
      <>
        <DashboardPage
          activeNav={activeNav}
          onNavChange={handleNavChange}
          onOpenMenu={() => setSidebarOpen(true)}
          onOpenAccount={setSelectedAccountId}
          onOpenTransactions={() => setActiveNav('transactions')}
          onOpenLoans={() => setShowLoans(true)}
          onOpenDps={() => setShowDps(true)}
          onOpenFdr={() => setShowFdr(true)}
          onOpenBudgets={() => setShowBudgets(true)}
          onOpenGoals={() => setShowGoals(true)}
          onOpenCreditCards={() => setShowCreditCards(true)}
          onOpenDebitCards={() => setShowDebitCards(true)}
        />
        {sidebar}
      </>
    )
  }

  // Accounts tab - shows account list or account detail
  if (activeNav === 'accounts') {
    if (selectedAccountId) {
      return <AccountDetailsPage accountId={selectedAccountId} onBack={() => setSelectedAccountId(null)} />
    }
    return (
      <>
        <AccountsPage 
          activeNav={activeNav} 
          onNavChange={handleNavChange} 
          onOpenMenu={() => setSidebarOpen(true)} 
          onOpenAccount={setSelectedAccountId} 
        />
        {sidebar}
      </>
    )
  }

  // Transactions tab - shows expense list
  if (activeNav === 'transactions') {
    return (
      <>
        <TransactionsPage 
          activeNav={activeNav} 
          onNavChange={handleNavChange} 
          onOpenMenu={() => setSidebarOpen(true)} 
        />
        {sidebar}
      </>
    )
  }

  // Reports tab - financial analysis
  if (activeNav === 'reports') {
    return (
      <>
        <ReportsPage 
          activeNav={activeNav} 
          onNavChange={handleNavChange} 
          onOpenMenu={() => setSidebarOpen(true)} 
        />
        {sidebar}
      </>
    )
  }

  // Unreachable in practice (every real NavKey is handled above) but kept
  // as a safe fallback, same as before.
  return (
    <>
      <ComingSoonScreen navKey={activeNav as PlaceholderNavKey} onNavChange={setActiveNav} />
      {sidebar}
    </>
  )
}

function App() {
  return (
    <ToastProvider>
      <ThemeApplier />
      <PwaStatusLayer />
      <RecurringDueBanner />
      <NotificationRunner />
      <AppContent />
    </ToastProvider>
  )
}

export default App
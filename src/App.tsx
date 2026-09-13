import { useState, type ReactNode } from 'react'
import { type LucideIcon, PieChart } from 'lucide-react'
import { ToastProvider, EmptyState, PageTransition, type PageTransitionKind } from '@/components/ui'
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

  // Every possible screen resolves to a single { key, kind, node } below,
  // instead of returning early. That lets one AnimatePresence own the whole
  // screen-to-screen transition — tabs cross-fade+rise, pushed pages
  // slide in from the right, account drill-downs slide too — no matter
  // which branch produced them.
  let key: string
  let kind: PageTransitionKind = 'push'
  let node: ReactNode

  if (showCategories) {
    key = 'categories'
    node = <CategoriesPage onBack={() => setShowCategories(false)} />
  } else if (showRecurring) {
    key = 'recurring'
    node = <RecurringPage onBack={() => setShowRecurring(false)} />
  } else if (showBudgets) {
    key = 'budgets'
    node = <BudgetPage onBack={() => setShowBudgets(false)} />
  } else if (showGoals) {
    key = 'goals'
    node = <GoalPage onBack={() => setShowGoals(false)} />
  } else if (showCreditCards) {
    key = 'credit-cards'
    node = <CreditCardsPage onBack={() => setShowCreditCards(false)} />
  } else if (showDebitCards) {
    key = 'debit-cards'
    node = <DebitCardsPage onBack={() => setShowDebitCards(false)} />
  } else if (showLoans) {
    key = 'loans'
    node = <LoanPage onBack={() => setShowLoans(false)} />
  } else if (showDps) {
    key = 'dps'
    node = <DpsPage onBack={() => setShowDps(false)} />
  } else if (showFdr) {
    key = 'fdr'
    node = <FdrPage onBack={() => setShowFdr(false)} />
  } else if (showDeposits) {
    key = 'deposits'
    node = (
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
  } else if (showNetWorth) {
    key = 'net-worth'
    node = <NetWorthPage onBack={() => setShowNetWorth(false)} />
  } else if (showCashFlow) {
    key = 'cash-flow'
    node = <CashFlowPage onBack={() => setShowCashFlow(false)} />
  } else if (showMonthlySummary) {
    key = 'monthly-summary'
    node = <MonthlySummaryPage onBack={() => setShowMonthlySummary(false)} />
  } else if (showFinancialCalendar) {
    key = 'financial-calendar'
    node = <FinancialCalendarPage onBack={() => setShowFinancialCalendar(false)} />
  } else if (showFinancialHealth) {
    key = 'financial-health'
    node = <FinancialHealthPage onBack={() => setShowFinancialHealth(false)} />
  } else if (showSettings) {
    key = 'settings'
    node = <SettingsPage onBack={() => setShowSettings(false)} />
  } else if (activeNav === 'home' && selectedAccountId) {
    key = `account-${selectedAccountId}`
    node = <AccountDetailsPage accountId={selectedAccountId} onBack={() => setSelectedAccountId(null)} />
  } else if (activeNav === 'accounts' && selectedAccountId) {
    key = `account-${selectedAccountId}`
    node = <AccountDetailsPage accountId={selectedAccountId} onBack={() => setSelectedAccountId(null)} />
  } else if (activeNav === 'home') {
    key = 'tab-home'
    kind = 'tab'
    node = (
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
    )
  } else if (activeNav === 'accounts') {
    key = 'tab-accounts'
    kind = 'tab'
    node = (
      <AccountsPage
        activeNav={activeNav}
        onNavChange={handleNavChange}
        onOpenMenu={() => setSidebarOpen(true)}
        onOpenAccount={setSelectedAccountId}
      />
    )
  } else if (activeNav === 'transactions') {
    key = 'tab-transactions'
    kind = 'tab'
    node = <TransactionsPage activeNav={activeNav} onNavChange={handleNavChange} onOpenMenu={() => setSidebarOpen(true)} />
  } else if (activeNav === 'reports') {
    key = 'tab-reports'
    kind = 'tab'
    node = <ReportsPage activeNav={activeNav} onNavChange={handleNavChange} onOpenMenu={() => setSidebarOpen(true)} />
  } else {
    // Unreachable in practice (every real NavKey is handled above) but kept
    // as a safe fallback, same as before.
    key = 'coming-soon'
    kind = 'tab'
    node = <ComingSoonScreen navKey={activeNav as PlaceholderNavKey} onNavChange={setActiveNav} />
  }

  return (
    <>
      <div className="relative">
        <PageTransition key={key} kind={kind}>
          {node}
        </PageTransition>
      </div>
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

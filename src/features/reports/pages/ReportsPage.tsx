import { useState } from 'react'
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart as RPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'
import {
  Filter,
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  CreditCard as CreditCardIcon,
  X as XIcon,
} from 'lucide-react'
import { AppShell } from '@/layouts/AppShell'
import { BottomNav } from '@/layouts/BottomNav'
import { Card, IconButton, BottomSheet, Select, Input, Button, EmptyState, LoadingState } from '@/components/ui'
import { CategoryIcon } from '@/lib/lucideIcon'
import { formatAmount } from '@/lib/money'
import { toDecimal } from '@/types/money'
import { APP_CONFIG } from '@/config/app.config'
import { useReports } from '../useReports'
import type { ReportPeriodOption } from '../reportsService'
import { format } from 'date-fns'

interface ReportsPageProps {
  activeNav: string
  onNavChange: (key: string) => void
  onOpenMenu: () => void
}

const PERIOD_OPTIONS: { key: ReportPeriodOption; label: string }[] = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'last_3_months', label: 'Last 3 Months' },
  { key: 'this_year', label: 'This Year' },
  { key: 'last_year', label: 'Last Year' },
  { key: 'custom', label: 'Custom' },
]

const currency = APP_CONFIG.defaultCurrency

function toChartValue(amount: number): number {
  return toDecimal({ amount, currency })
}

function tooltipStyle() {
  return {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    fontSize: 12,
    color: 'var(--foreground)',
  }
}

function SectionHeader({ title }: { title: string }) {
  return <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
}

export function ReportsPage({ activeNav, onNavChange, onOpenMenu }: ReportsPageProps) {
  const reports = useReports()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const activeFilterCount = [reports.filters.accountId, reports.filters.categoryId, reports.filters.type].filter(
    Boolean
  ).length

  return (
    <AppShell
      title="Reports"
      subtitle={format(reports.range.start, 'd MMM')  + ' – ' + format(reports.range.end, 'd MMM yyyy')}
      headerMenu={onOpenMenu}
      bottomNav={<BottomNav active={activeNav} onChange={onNavChange} />}
      headerAction={
        <IconButton aria-label="Filters" onClick={() => setFiltersOpen(true)} className="relative">
          <Filter className="h-[18px] w-[18px]" />
          {activeFilterCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </IconButton>
      }
    >
      <div className="flex flex-col gap-6">
        {/* 1. Report Period */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => reports.setPeriod(opt.key)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                reports.period === opt.key
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-surface text-muted-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {reports.period === 'custom' && (
          <div className="grid grid-cols-2 gap-2.5">
            <Input
              type="date"
              label="From"
              value={reports.customStart ? format(reports.customStart, 'yyyy-MM-dd') : ''}
              onChange={(e) => reports.setCustomStart(e.target.value ? new Date(e.target.value).getTime() : null)}
            />
            <Input
              type="date"
              label="To"
              value={reports.customEnd ? format(reports.customEnd, 'yyyy-MM-dd') : ''}
              onChange={(e) => reports.setCustomEnd(e.target.value ? new Date(e.target.value).getTime() : null)}
            />
          </div>
        )}

        {reports.isLoading && <LoadingState label="Loading report..." />}

        {!reports.isLoading && !reports.hasData && (
          <EmptyState
            icon={<PieChartIcon className="h-6 w-6" />}
            title="No financial activity for this period"
            description="Add transactions or pick a different period to see your report."
          />
        )}

        {!reports.isLoading && reports.hasData && (
          <>
            {/* 16. Summary Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <Card className="flex flex-col gap-1">
                <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5 text-success" /> Income
                </p>
                <p className="text-base font-bold tabular-nums text-success">{formatAmount(reports.summary.income, currency)}</p>
              </Card>
              <Card className="flex flex-col gap-1">
                <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <TrendingDown className="h-3.5 w-3.5 text-danger" /> Expense
                </p>
                <p className="text-base font-bold tabular-nums text-danger">{formatAmount(reports.summary.expense, currency)}</p>
              </Card>
              <Card className="flex flex-col gap-1">
                <p className="text-xs font-medium text-muted-foreground">Net</p>
                <p className={`text-base font-bold tabular-nums ${reports.summary.net >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatAmount(reports.summary.net, currency)}
                </p>
              </Card>
              <Card className="flex flex-col gap-1">
                <p className="text-xs font-medium text-muted-foreground">Savings Rate</p>
                <p className="text-base font-bold tabular-nums text-foreground">
                  {reports.savingsRate === null ? 'N/A' : `${reports.savingsRate.toFixed(1)}%`}
                </p>
              </Card>
            </div>

            {/* 3. Monthly Trend */}
            <section className="flex flex-col gap-2.5">
              <SectionHeader title="Trend" />
              <Card>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={reports.trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip
                      contentStyle={tooltipStyle()}
                      formatter={(value) => formatAmount(Math.round(Number(value) * 100), currency)}
                    />
                    <Bar
                      dataKey={(d: { income: number }) => toChartValue(d.income)}
                      name="Income"
                      fill="var(--success)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey={(d: { expense: number }) => toChartValue(d.expense)}
                      name="Expense"
                      fill="var(--danger)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </section>

            {/* 4. Expense by Category */}
            {reports.expenseCategories.length > 0 && (
              <section className="flex flex-col gap-2.5">
                <SectionHeader title="Expense by Category" />
                <Card>
                  <ResponsiveContainer width="100%" height={160}>
                    <RPieChart>
                      <Pie
                        data={reports.expenseCategories}
                        dataKey={(d: { amount: number }) => toChartValue(d.amount)}
                        nameKey="name"
                        innerRadius={40}
                        outerRadius={64}
                        paddingAngle={2}
                      >
                        {reports.expenseCategories.map((entry) => (
                          <Cell key={entry.categoryId ?? 'uncategorized'} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle()}
                        formatter={(value) => formatAmount(Math.round(Number(value) * 100), currency)}
                      />
                    </RPieChart>
                  </ResponsiveContainer>
                </Card>
                <div className="flex flex-col gap-2">
                  {reports.expenseCategories.map((item) => (
                    <div key={item.categoryId ?? 'uncategorized'} className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${item.color}26` }}
                      >
                        <CategoryIcon name={item.icon} size={16} color={item.color} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
                          <div className="h-full rounded-full" style={{ width: `${item.percent}%`, backgroundColor: item.color }} />
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums text-foreground">{formatAmount(item.amount, currency)}</p>
                        <p className="text-[11px] text-muted-foreground">{item.percent}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 5. Top Expense Categories */}
            {reports.expenseCategories.length > 0 && (
              <section className="flex flex-col gap-2.5">
                <SectionHeader title="Top Expense Categories" />
                <Card className="flex flex-col gap-3">
                  {reports.expenseCategories.slice(0, 4).map((item, index) => (
                    <div key={item.categoryId ?? 'uncategorized'} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-muted text-[11px] font-bold text-primary">
                        {index + 1}
                      </span>
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{item.name}</p>
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{formatAmount(item.amount, currency)}</p>
                    </div>
                  ))}
                </Card>
              </section>
            )}

            {/* 6. Income Sources */}
            <section className="flex flex-col gap-2.5">
              <SectionHeader title="Income Sources" />
              {reports.incomeSources.length > 0 ? (
                <Card className="flex flex-col gap-3">
                  {reports.incomeSources.map((item) => (
                    <div key={item.categoryId ?? 'uncategorized'} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-9 w-9 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${item.color}26` }}
                        >
                          <CategoryIcon name={item.icon} size={16} color={item.color} />
                        </span>
                        <p className="text-sm font-medium text-foreground">{item.name}</p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums text-success">{formatAmount(item.amount, currency)}</p>
                    </div>
                  ))}
                </Card>
              ) : (
                <p className="px-1 text-xs text-muted-foreground">No categorized income this period.</p>
              )}
            </section>

            {/* 7. Account Flow */}
            {reports.flow.length > 0 && (
              <section className="flex flex-col gap-2.5">
                <SectionHeader title="Account Flow" />
                <div className="flex flex-col gap-2">
                  {reports.flow.map((item) => (
                    <Card key={item.accountId} className="flex items-center justify-between" padding="sm">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          <span className="text-success">+{formatAmount(item.income, currency)}</span>
                          {'  ·  '}
                          <span className="text-danger">-{formatAmount(item.expense, currency)}</span>
                        </p>
                      </div>
                      <p className={`text-sm font-bold tabular-nums ${item.net >= 0 ? 'text-success' : 'text-danger'}`}>
                        {item.net >= 0 ? '+' : ''}
                        {formatAmount(item.net, currency)}
                      </p>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* 8. Daily Expense */}
            <section className="flex flex-col gap-2.5">
              <SectionHeader title="Daily Expense" />
              {reports.dailyAvailable ? (
                <Card>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={reports.daily} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
                        axisLine={false}
                        tickLine={false}
                        interval={Math.max(0, Math.floor(reports.daily.length / 6) - 1)}
                      />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={36} />
                      <Tooltip
                        contentStyle={tooltipStyle()}
                        formatter={(value) => formatAmount(Math.round(Number(value ?? 0) * 100), currency)}
                      />
                      <Bar dataKey={(d: { amount: number }) => toChartValue(d.amount)} name="Expense" fill="var(--danger)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              ) : (
                <p className="px-1 text-xs text-muted-foreground">Select a shorter period to see the daily breakdown.</p>
              )}
            </section>

            {/* 9 & 10. Average Spending + Highest Spending Day */}
            <div className="grid grid-cols-2 gap-2.5">
              <Card className="flex flex-col gap-1">
                <p className="text-xs font-medium text-muted-foreground">Avg Daily Expense</p>
                <p className="text-base font-bold tabular-nums text-foreground">{formatAmount(reports.averageDailyExpense, currency)}</p>
                <p className="text-[11px] text-muted-foreground">over {reports.spanDays} days</p>
              </Card>
              <Card className="flex flex-col gap-1">
                <p className="text-xs font-medium text-muted-foreground">Highest Spending Day</p>
                {reports.highestDay && reports.highestDay.amount > 0 ? (
                  <>
                    <p className="text-base font-bold tabular-nums text-foreground">{formatAmount(reports.highestDay.amount, currency)}</p>
                    <p className="text-[11px] text-muted-foreground">{reports.highestDay.label}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </Card>
            </div>

            {/* 13. Credit Card Reporting */}
            {reports.ccSpending > 0 && (
              <section className="flex flex-col gap-2.5">
                <SectionHeader title="Credit Card" />
                <Card className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-muted text-primary">
                    <CreditCardIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground">Credit Card Spending</p>
                    <p className="text-base font-bold tabular-nums text-foreground">{formatAmount(reports.ccSpending, currency)}</p>
                  </div>
                </Card>
              </section>
            )}

            {/* 14. Loan Reporting */}
            {(reports.loanSummary.lent > 0 || reports.loanSummary.borrowed > 0 || reports.loanSummary.repayments > 0) && (
              <section className="flex flex-col gap-2.5">
                <SectionHeader title="Loans" />
                <div className="grid grid-cols-3 gap-2.5">
                  <Card className="flex flex-col gap-1" padding="sm">
                    <p className="text-[11px] font-medium text-muted-foreground">Lent</p>
                    <p className="text-sm font-bold tabular-nums text-foreground">{formatAmount(reports.loanSummary.lent, currency)}</p>
                  </Card>
                  <Card className="flex flex-col gap-1" padding="sm">
                    <p className="text-[11px] font-medium text-muted-foreground">Borrowed</p>
                    <p className="text-sm font-bold tabular-nums text-foreground">{formatAmount(reports.loanSummary.borrowed, currency)}</p>
                  </Card>
                  <Card className="flex flex-col gap-1" padding="sm">
                    <p className="text-[11px] font-medium text-muted-foreground">Repayments</p>
                    <p className="text-sm font-bold tabular-nums text-foreground">{formatAmount(reports.loanSummary.repayments, currency)}</p>
                  </Card>
                </div>
              </section>
            )}

            {/* 15. DPS / FDR Reporting */}
            {(reports.depositSummary.dpsContributions > 0 ||
              reports.depositSummary.fdrPrincipalAdded > 0 ||
              reports.depositSummary.fdrMaturityProfit > 0) && (
              <section className="flex flex-col gap-2.5">
                <SectionHeader title="DPS & FDR" />
                <div className="grid grid-cols-3 gap-2.5">
                  <Card className="flex flex-col gap-1" padding="sm">
                    <p className="text-[11px] font-medium text-muted-foreground">DPS Added</p>
                    <p className="text-sm font-bold tabular-nums text-foreground">
                      {formatAmount(reports.depositSummary.dpsContributions, currency)}
                    </p>
                  </Card>
                  <Card className="flex flex-col gap-1" padding="sm">
                    <p className="text-[11px] font-medium text-muted-foreground">FDR Added</p>
                    <p className="text-sm font-bold tabular-nums text-foreground">
                      {formatAmount(reports.depositSummary.fdrPrincipalAdded, currency)}
                    </p>
                  </Card>
                  <Card className="flex flex-col gap-1" padding="sm">
                    <p className="text-[11px] font-medium text-muted-foreground">FDR Profit</p>
                    <p className="text-sm font-bold tabular-nums text-success">
                      {formatAmount(reports.depositSummary.fdrMaturityProfit, currency)}
                    </p>
                  </Card>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* 19. Filters */}
      <BottomSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        <div className="flex flex-col gap-4 pb-2">
          <Select
            label="Account"
            value={reports.filters.accountId ?? ''}
            onChange={(e) => reports.setFilters((f) => ({ ...f, accountId: e.target.value || null }))}
            options={[{ value: '', label: 'All Accounts' }, ...reports.accounts.map((a) => ({ value: a.id, label: a.name }))]}
          />
          <Select
            label="Category"
            value={reports.filters.categoryId ?? ''}
            onChange={(e) => reports.setFilters((f) => ({ ...f, categoryId: e.target.value || null }))}
            options={[{ value: '', label: 'All Categories' }, ...reports.categories.map((c) => ({ value: c.id, label: c.name }))]}
          />
          <Select
            label="Transaction Type"
            value={reports.filters.type ?? ''}
            onChange={(e) =>
              reports.setFilters((f) => ({
                ...f,
                type: (e.target.value || null) as typeof f.type,
              }))
            }
            options={[
              { value: '', label: 'All Types' },
              { value: 'income', label: 'Income' },
              { value: 'expense', label: 'Expense' },
              { value: 'transfer', label: 'Transfer' },
            ]}
          />
          <div className="flex gap-2.5">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => reports.setFilters({ accountId: null, categoryId: null, type: null })}
            >
              <XIcon className="h-4 w-4" /> Clear
            </Button>
            <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
              Apply
            </Button>
          </div>
        </div>
      </BottomSheet>
    </AppShell>
  )
}
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { AppShell } from '@/layouts/AppShell'
import { Card, LoadingState } from '@/components/ui'
import { formatAmount } from '@/lib/money'
import { toDecimal } from '@/types/money'
import { APP_CONFIG } from '@/config/app.config'
import { useMonthlySummary } from '../useMonthlySummary'

interface MonthlySummaryPageProps {
  onBack: () => void
}

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

function DeltaBadge({ percent }: { percent: number | null }) {
  if (percent === null) return null
  const positive = percent >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${positive ? 'text-success' : 'text-danger'}`}>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(percent).toFixed(0)}%
    </span>
  )
}

export function MonthlySummaryPage({ onBack }: MonthlySummaryPageProps) {
  const { comparisons, isLoading } = useMonthlySummary(6)
  const latest = comparisons[comparisons.length - 1]

  const chartData = comparisons.map((c) => ({
    label: c.current.monthLabel,
    income: c.current.income,
    expenses: c.current.expenses,
  }))

  return (
    <AppShell title="Monthly Summary" headerBack={onBack}>
      <div className="flex flex-col gap-6">
        {isLoading && <LoadingState label="Loading monthly summary..." />}

        {!isLoading && latest && (
          <>
            <Card className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{latest.current.monthLabel}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Income</p>
                  <p className="text-base font-bold tabular-nums text-success">{formatAmount(latest.current.income, currency)}</p>
                  <DeltaBadge percent={latest.incomeDeltaPercent} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expenses</p>
                  <p className="text-base font-bold tabular-nums text-danger">{formatAmount(latest.current.expenses, currency)}</p>
                  <DeltaBadge percent={latest.expenseDeltaPercent} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Savings</p>
                  <p className="text-base font-bold tabular-nums text-foreground">{formatAmount(latest.current.savings, currency)}</p>
                  <DeltaBadge percent={latest.savingsDeltaPercent} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Savings Rate</p>
                  <p className="text-base font-bold tabular-nums text-foreground">
                    {latest.current.savingsRate === null ? 'N/A' : `${latest.current.savingsRate.toFixed(1)}%`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Investments</p>
                  <p className="text-sm font-semibold tabular-nums text-foreground">{formatAmount(latest.current.investments, currency)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Loan Repayments</p>
                  <p className="text-sm font-semibold tabular-nums text-foreground">{formatAmount(latest.current.loanRepayments, currency)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Net Cash Flow</p>
                  <p className={`text-sm font-semibold tabular-nums ${latest.current.netCashFlow >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatAmount(latest.current.netCashFlow, currency)}
                  </p>
                </div>
              </div>
            </Card>

            <section className="flex flex-col gap-2.5">
              <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Income vs Expenses</p>
              <Card>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip
                      contentStyle={tooltipStyle()}
                      formatter={(value) => formatAmount(Math.round(Number(value) * 100), currency)}
                    />
                    <Bar dataKey={(d: { income: number }) => toChartValue(d.income)} name="Income" fill="var(--success)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={(d: { expenses: number }) => toChartValue(d.expenses)} name="Expenses" fill="var(--danger)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </section>

            <section className="flex flex-col gap-2.5">
              <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Past Months</p>
              <div className="flex flex-col gap-2">
                {[...comparisons].reverse().map((c) => (
                  <Card key={c.current.monthStart} className="flex items-center justify-between" padding="sm">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{c.current.monthLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="text-success">+{formatAmount(c.current.income, currency)}</span>
                        {'  ·  '}
                        <span className="text-danger">-{formatAmount(c.current.expenses, currency)}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold tabular-nums ${c.current.savings >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatAmount(c.current.savings, currency)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {c.current.savingsRate === null ? 'N/A' : `${c.current.savingsRate.toFixed(0)}% saved`}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  )
}
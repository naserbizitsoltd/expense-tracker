import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { AppShell } from '@/layouts/AppShell'
import { Card, BalanceCard, LoadingState, EmptyState } from '@/components/ui'
import { formatAmount } from '@/lib/money'
import { toDecimal } from '@/types/money'
import { APP_CONFIG } from '@/config/app.config'
import { useCashFlow } from '../useCashFlow'
import type { ReportPeriodOption } from '../reportsService'
import { format } from 'date-fns'

interface CashFlowPageProps {
  onBack: () => void
}

const currency = APP_CONFIG.defaultCurrency

const PERIOD_OPTIONS: { key: ReportPeriodOption; label: string }[] = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'last_3_months', label: '3 Months' },
  { key: 'this_year', label: 'This Year' },
  { key: 'custom', label: 'Custom' },
]

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

export function CashFlowPage({ onBack }: CashFlowPageProps) {
  const cf = useCashFlow()

  const chartData = [
    { label: 'Inflow', inflow: cf.summary.totalInflow, outflow: 0 },
    { label: 'Outflow', inflow: 0, outflow: cf.summary.totalOutflow },
  ]

  return (
    <AppShell
      title="Cash Flow"
      headerBack={onBack}
      subtitle={format(cf.range.start, 'd MMM') + ' – ' + format(cf.range.end, 'd MMM yyyy')}
    >
      <div className="flex flex-col gap-6">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => cf.setPeriod(opt.key)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                cf.period === opt.key
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-surface text-muted-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <BalanceCard
          label="Net Cash Flow"
          amount={formatAmount(cf.summary.netCashFlow, currency)}
        />

        {cf.isLoading && <LoadingState label="Loading cash flow..." />}

        {!cf.isLoading && (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <Card className="flex flex-col gap-1">
                <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <ArrowDownCircle className="h-3.5 w-3.5 text-success" /> Total Inflow
                </p>
                <p className="text-base font-bold tabular-nums text-success">{formatAmount(cf.summary.totalInflow, currency)}</p>
              </Card>
              <Card className="flex flex-col gap-1">
                <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <ArrowUpCircle className="h-3.5 w-3.5 text-danger" /> Total Outflow
                </p>
                <p className="text-base font-bold tabular-nums text-danger">{formatAmount(cf.summary.totalOutflow, currency)}</p>
              </Card>
            </div>

            <section className="flex flex-col gap-2.5">
              <SectionHeader title="Inflow vs Outflow" />
              <Card>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip
                      contentStyle={tooltipStyle()}
                      formatter={(value) => formatAmount(Math.round(Number(value) * 100), currency)}
                    />
                    <Bar dataKey={(d: { inflow: number }) => toChartValue(d.inflow)} name="Inflow" fill="var(--success)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={(d: { outflow: number }) => toChartValue(d.outflow)} name="Outflow" fill="var(--danger)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </section>

            <section className="flex flex-col gap-2.5">
              <SectionHeader title="Inflow Breakdown" />
              {cf.summary.inflow.length > 0 ? (
                <Card className="flex flex-col gap-3">
                  {cf.summary.inflow.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-sm font-semibold tabular-nums text-success">{formatAmount(item.amount, currency)}</p>
                    </div>
                  ))}
                </Card>
              ) : (
                <EmptyState icon={<ArrowDownCircle className="h-6 w-6" />} title="No inflow this period" description="Add income, a loan received, or a maturity payout to see it here." />
              )}
            </section>

            <section className="flex flex-col gap-2.5">
              <SectionHeader title="Outflow Breakdown" />
              {cf.summary.outflow.length > 0 ? (
                <Card className="flex flex-col gap-3">
                  {cf.summary.outflow.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-sm font-semibold tabular-nums text-danger">{formatAmount(item.amount, currency)}</p>
                    </div>
                  ))}
                </Card>
              ) : (
                <EmptyState icon={<ArrowUpCircle className="h-6 w-6" />} title="No outflow this period" description="Add expenses, DPS installments, or FDR investments to see it here." />
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  )
}
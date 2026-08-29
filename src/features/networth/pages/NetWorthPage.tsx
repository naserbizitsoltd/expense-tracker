import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { Wallet, Scale } from 'lucide-react'
import { AppShell } from '@/layouts/AppShell'
import { Card, BalanceCard, LoadingState, EmptyState } from '@/components/ui'
import { formatAmount } from '@/lib/money'
import { toDecimal } from '@/types/money'
import { APP_CONFIG } from '@/config/app.config'
import { useNetWorth } from '../useNetWorth'

interface NetWorthPageProps {
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

function SectionHeader({ title }: { title: string }) {
  return <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
}

function BreakdownRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-foreground">{formatAmount(amount, currency)}</p>
    </div>
  )
}

export function NetWorthPage({ onBack }: NetWorthPageProps) {
  const nw = useNetWorth()

  return (
    <AppShell title="Net Worth" headerBack={onBack}>
      <div className="flex flex-col gap-6">
        <BalanceCard label="Net Worth" amount={formatAmount(nw.netWorth, currency)} />

        {nw.isLoading && <LoadingState label="Loading net worth..." />}

        {!nw.isLoading && (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <Card className="flex flex-col gap-1">
                <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Wallet className="h-3.5 w-3.5 text-success" /> Total Assets
                </p>
                <p className="text-base font-bold tabular-nums text-success">{formatAmount(nw.totalAssets, currency)}</p>
              </Card>
              <Card className="flex flex-col gap-1">
                <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Scale className="h-3.5 w-3.5 text-danger" /> Total Liabilities
                </p>
                <p className="text-base font-bold tabular-nums text-danger">{formatAmount(nw.totalLiabilities, currency)}</p>
              </Card>
            </div>

            {/* Net Worth Trend */}
            <section className="flex flex-col gap-2.5">
              <SectionHeader title="Net Worth Trend (last 6 months)" />
              <Card>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={nw.history} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip
                      contentStyle={tooltipStyle()}
                      formatter={(value) => formatAmount(Math.round(Number(value) * 100), currency)}
                    />
                    <Line
                      type="monotone"
                      dataKey={(d: { netWorth: number }) => toChartValue(d.netWorth)}
                      name="Net Worth"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
              <p className="px-1 text-[11px] text-muted-foreground">
                Account, DPS, FDR and Loan balances are historically accurate. Credit card outstanding and Savings
                Goals use today's value at every point (no historical record is stored for those).
              </p>
            </section>

            {/* Asset Breakdown */}
            <section className="flex flex-col gap-2.5">
              <SectionHeader title="Asset Breakdown" />
              {nw.assets.length > 0 ? (
                <Card className="flex flex-col gap-3">
                  {nw.assets.map((item) => (
                    <BreakdownRow key={item.id} label={item.label} amount={item.amount} />
                  ))}
                </Card>
              ) : (
                <EmptyState icon={<Wallet className="h-6 w-6" />} title="No assets yet" description="Add an account, DPS, or FDR to see it here." />
              )}
            </section>

            {/* Liability Breakdown */}
            <section className="flex flex-col gap-2.5">
              <SectionHeader title="Liability Breakdown" />
              {nw.liabilities.length > 0 ? (
                <Card className="flex flex-col gap-3">
                  {nw.liabilities.map((item) => (
                    <BreakdownRow key={item.id} label={item.label} amount={item.amount} />
                  ))}
                </Card>
              ) : (
                <p className="px-1 text-xs text-muted-foreground">No liabilities recorded.</p>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  )
}
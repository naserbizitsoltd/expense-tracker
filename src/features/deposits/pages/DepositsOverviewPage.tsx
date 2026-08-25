import { format } from 'date-fns'
import { PiggyBank, Landmark, CalendarClock, ChevronRight } from 'lucide-react'
import { AppShell } from '@/layouts/AppShell'
import { Card, BalanceCard, Badge, EmptyState, LoadingState } from '@/components/ui'
import { useDepositsOverview } from '../useDepositsOverview'
import { dpsStatusLabel, dpsStatusBadgeVariant } from '@/features/dps/dpsConfig'
import { fdrStatusLabel, fdrStatusBadgeVariant } from '@/features/fdr/fdrConfig'
import { formatAmount } from '@/lib/money'
import { APP_CONFIG } from '@/config/app.config'

interface DepositsOverviewPageProps {
  onBack: () => void
  onOpenDps: () => void
  onOpenFdr: () => void
}

export function DepositsOverviewPage({ onBack, onOpenDps, onOpenFdr }: DepositsOverviewPageProps) {
  const { dpsItems, fdrItems, dpsBalance, fdrPrincipal, totalDeposits, upcomingEvents, isLoading } = useDepositsOverview()

  const nextEvent = upcomingEvents[0]

  return (
    <AppShell title="Savings & Deposits" subtitle="DPS + FDR, in one place" headerBack={onBack}>
      <div className="flex flex-col gap-6">
        <BalanceCard label="Total Deposits" amount={formatAmount(totalDeposits, APP_CONFIG.defaultCurrency)} />

        <div className="grid grid-cols-2 gap-3">
          <Card padding="sm" className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">DPS Balance</p>
            <p className="text-base font-semibold tabular-nums text-foreground">
              {formatAmount(dpsBalance, APP_CONFIG.defaultCurrency)}
            </p>
          </Card>
          <Card padding="sm" className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">FDR Principal</p>
            <p className="text-base font-semibold tabular-nums text-foreground">
              {formatAmount(fdrPrincipal, APP_CONFIG.defaultCurrency)}
            </p>
          </Card>
        </div>

        {nextEvent && (
          <Card padding="sm" className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-muted text-primary">
              <CalendarClock className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Upcoming</p>
              <p className="truncate text-sm font-medium text-foreground">
                {nextEvent.label} · {format(nextEvent.date, 'd MMM')}
              </p>
            </div>
          </Card>
        )}

        {isLoading && <LoadingState label="Loading deposits..." />}

        {!isLoading && dpsItems.length === 0 && fdrItems.length === 0 && (
          <EmptyState
            icon={<PiggyBank className="h-6 w-6" />}
            title="No DPS or FDR yet"
            description="Open a DPS or FDR to start tracking your locked savings."
          />
        )}

        {!isLoading && dpsItems.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <button
              onClick={onOpenDps}
              className="flex w-full items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              <span className="flex items-center gap-1.5">
                <PiggyBank className="h-3.5 w-3.5" /> DPS
              </span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <div className="flex flex-col gap-2">
              {dpsItems.map((item) => (
                <button
                  key={item.dps.id}
                  onClick={onOpenDps}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left transition-colors active:bg-surface-elevated"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{item.dps.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Deposited {formatAmount(item.deposited, item.dps.currency)} ·{' '}
                      {formatAmount(item.dps.monthlyInstallment, item.dps.currency)}/mo
                    </p>
                  </div>
                  <Badge variant={dpsStatusBadgeVariant(item.dps.status)}>{dpsStatusLabel(item.dps.status)}</Badge>
                </button>
              ))}
            </div>
          </section>
        )}

        {!isLoading && fdrItems.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <button
              onClick={onOpenFdr}
              className="flex w-full items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              <span className="flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5" /> FDR
              </span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <div className="flex flex-col gap-2">
              {fdrItems.map((item) => (
                <button
                  key={item.fdr.id}
                  onClick={onOpenFdr}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left transition-colors active:bg-surface-elevated"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{item.fdr.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Principal {formatAmount(item.fdr.principal, item.fdr.currency)}
                      {item.fdr.maturityDate ? ` · Matures ${format(item.fdr.maturityDate, 'd MMM yyyy')}` : ''}
                    </p>
                  </div>
                  <Badge variant={fdrStatusBadgeVariant(item.isMatured ? 'matured' : item.fdr.status)}>
                    {fdrStatusLabel(item.isMatured ? 'matured' : item.fdr.status)}
                  </Badge>
                </button>
              ))}
            </div>
          </section>
        )}

        {!isLoading && upcomingEvents.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Upcoming</p>
            <Card padding="none" className="flex flex-col divide-y divide-border">
              {upcomingEvents.slice(0, 8).map((event) => (
                <div key={event.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{event.label}</p>
                    <p className="text-xs text-muted-foreground">{format(event.date, 'd MMM yyyy')}</p>
                  </div>
                  {event.amount !== null && (
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                      {formatAmount(event.amount, event.currency)}
                    </p>
                  )}
                </div>
              ))}
            </Card>
          </section>
        )}
      </div>
    </AppShell>
  )
}
import { format } from 'date-fns'
import { getDpsIcon, dpsStatusLabel, dpsStatusBadgeVariant } from '../dpsConfig'
import { Badge } from '@/components/ui'
import { formatAmount } from '@/lib/money'
import type { DpsWithProgress } from '../useDps'

export function DpsCard({ item, onClick }: { item: DpsWithProgress; onClick: () => void }) {
  const { dps, deposited, progress } = item
  const Icon = getDpsIcon('PiggyBank')

  return (
    <button
      onClick={onClick}
      className="flex w-full flex-col gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left transition-colors active:bg-surface-elevated"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-muted text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{dps.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {dps.institution} · {formatAmount(dps.monthlyInstallment, dps.currency)}/month
          </p>
        </div>
        <Badge variant={dpsStatusBadgeVariant(dps.status)}>{dpsStatusLabel(dps.status)}</Badge>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${progress.percentComplete}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Deposited {formatAmount(deposited, dps.currency)} · {progress.paidInstallments}/{dps.tenureMonths}
        </span>
        <span className="text-muted-foreground">
          {progress.nextContributionDate ? `Next ${format(progress.nextContributionDate, 'd MMM')}` : dps.status === 'completed' ? 'Complete' : '—'}
        </span>
      </div>
    </button>
  )
}
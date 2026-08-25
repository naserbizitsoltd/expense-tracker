import { format } from 'date-fns'
import { getFdrIcon, fdrStatusLabel, fdrStatusBadgeVariant } from './fdrConfig'
import { Badge } from '@/components/ui'
import { formatAmount } from '@/lib/money'
import { getFdrMaturitySummary } from '@/services/fdrService'
import type { FdrWithMaturity } from './useFdr'

export function FdrCard({ item, onClick }: { item: FdrWithMaturity; onClick: () => void }) {
  const { fdr, isMatured } = item
  const Icon = getFdrIcon('Landmark')
  const displayStatus = isMatured ? 'matured' : fdr.status
  const summary = getFdrMaturitySummary(fdr)

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
          <p className="truncate text-sm font-semibold text-foreground">{fdr.name}</p>
          <p className="truncate text-xs text-muted-foreground">{fdr.institution}</p>
        </div>
        <Badge variant={fdrStatusBadgeVariant(displayStatus)}>{fdrStatusLabel(displayStatus)}</Badge>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Principal {formatAmount(fdr.principal, fdr.currency)}</span>
        <span className="text-muted-foreground">
          {summary.maturityAmount !== null ? `Maturity ${formatAmount(summary.maturityAmount, fdr.currency)}` : '—'}
        </span>
      </div>

      <div className="text-xs text-muted-foreground">
        {fdr.maturityDate ? `Matures ${format(fdr.maturityDate, 'd MMM yyyy')}` : 'No maturity date set'}
      </div>
    </button>
  )
}
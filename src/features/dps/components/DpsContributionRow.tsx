import { format } from 'date-fns'
import { formatAmount } from '@/lib/money'
import type { Account, DpsContribution } from '@/types/entities'

interface DpsContributionRowProps {
  contribution: DpsContribution
  account: Account | undefined
  currency: Account['currency']
}

export function DpsContributionRow({ contribution, account, currency }: DpsContributionRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{format(contribution.date, 'd MMM')}</p>
        {account && <p className="truncate text-xs text-muted-foreground">{account.name}</p>}
        {contribution.notes && <p className="truncate text-xs text-muted-foreground">{contribution.notes}</p>}
      </div>
      <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
        {formatAmount(contribution.amount, currency)}
      </p>
    </div>
  )
}
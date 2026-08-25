import { format } from 'date-fns'
import { getLoanIcon, loanOutstandingLabel } from '../loanConfig'
import { Badge } from '@/components/ui'
import { formatAmount } from '@/lib/money'
import type { Loan } from '@/types/entities'

interface LoanListItemProps {
  loan: Loan
  outstanding: number
  onClick: () => void
}

export function LoanListItem({ loan, outstanding, onClick }: LoanListItemProps) {
  const Icon = getLoanIcon(loan.direction === 'taken' ? 'Landmark' : 'User')
  const isClosed = loan.status === 'closed'

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left transition-colors active:bg-surface-elevated"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-muted text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{loan.counterpartyName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {loanOutstandingLabel(loan.direction)} {formatAmount(outstanding, loan.currency)}
          {' · '}Original {formatAmount(loan.principal, loan.currency)}
        </p>
        {loan.dueDate && !isClosed && (
          <p className="truncate text-[11px] text-muted-foreground">Due {format(loan.dueDate, 'd MMM')}</p>
        )}
      </div>
      <Badge variant={isClosed ? 'default' : loan.status === 'defaulted' ? 'danger' : 'success'}>
        {isClosed ? 'Closed' : loan.status === 'defaulted' ? 'Defaulted' : 'Active'}
      </Badge>
    </button>
  )
}
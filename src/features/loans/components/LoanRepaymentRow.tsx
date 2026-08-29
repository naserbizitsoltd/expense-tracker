import { format } from 'date-fns'
import { formatAmount } from '@/lib/money'
import type { LoanRepayment } from '@/types/entities'
import type { Account } from '@/types/entities'

interface LoanRepaymentRowProps {
  repayment: LoanRepayment
  account: Account | undefined
  currency: Account['currency']
}

export function LoanRepaymentRow({ repayment, account, currency }: LoanRepaymentRowProps) {
  const hasInterest = repayment.interestPortion > 0

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{format(repayment.date, 'd MMM')}</p>
        {account && <p className="truncate text-xs text-muted-foreground">{account.name}</p>}
        {hasInterest && (
          <p className="truncate text-xs text-muted-foreground">
            {formatAmount(repayment.principalPortion, currency)} principal · {formatAmount(repayment.interestPortion, currency)} interest
            {repayment.isInterestOverridden ? ' (actual)' : ''}
          </p>
        )}
        {repayment.notes && <p className="truncate text-xs text-muted-foreground">{repayment.notes}</p>}
      </div>
      <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
        {formatAmount(repayment.amount, currency)}
      </p>
    </div>
  )
}
import { format } from 'date-fns'
import { CategoryIcon } from '@/lib/lucideIcon'
import { formatAmount } from '@/lib/money'
import type { CreditCardTransactionItem } from '../useCreditCardTransactions'

export function CreditCardTransactionRow({ transaction, category }: CreditCardTransactionItem) {
  return (
    <div className="flex items-center gap-3 px-1 py-3">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${category?.color ?? '#666'}26` }}
      >
        <CategoryIcon name={category?.icon ?? 'tag'} size={18} color={category?.color ?? '#999'} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{transaction.note || category?.name || 'Purchase'}</p>
        <p className="truncate text-xs text-muted-foreground">{format(transaction.date, 'MMM d, h:mm a')}</p>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-danger">
        {'\u2212'}
        {formatAmount(transaction.amount, transaction.currency)}
      </span>
    </div>
  )
}
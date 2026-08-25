import { format } from 'date-fns'
import { ArrowLeftRight, CreditCard } from 'lucide-react'
import { CategoryIcon } from '@/lib/lucideIcon'
import { formatAmount } from '@/lib/money'
import { cn } from '@/lib/cn'
import type { AccountTransactionItem } from '../useAccountTransactions'

export function AccountTransactionRow({
  transaction,
  category,
  counterAccount,
  creditCard,
  direction,
}: AccountTransactionItem) {
  // Credit Card bill payment — clearly distinguished from an Expense:
  // its own icon/label, and it names the card being paid instead of a category.
  if (transaction.type === 'credit_card') {
    return (
      <div className="flex items-center gap-3 px-1 py-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-muted">
          <CreditCard className="h-[18px] w-[18px] text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">Credit Card Payment</p>
          <p className="truncate text-xs text-muted-foreground">
            {format(transaction.date, 'MMM d, h:mm a')} · To {creditCard?.name ?? 'card'}
            {creditCard?.last4 ? ` •••• ${creditCard.last4}` : ''}
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
          {'\u2212'}
          {formatAmount(transaction.amount, transaction.currency)}
        </span>
      </div>
    )
  }

  if (transaction.type === 'transfer') {
    const isOut = direction === 'out'
    return (
      <div className="flex items-center gap-3 px-1 py-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-muted">
          <ArrowLeftRight className="h-[18px] w-[18px] text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{transaction.note || 'Transfer'}</p>
          <p className="truncate text-xs text-muted-foreground">
            {format(transaction.date, 'MMM d, h:mm a')} · {isOut ? 'To' : 'From'} {counterAccount?.name ?? 'Unknown account'}
          </p>
        </div>
        <span className={cn('shrink-0 text-sm font-semibold tabular-nums', isOut ? 'text-foreground' : 'text-success')}>
          {isOut ? '\u2212' : '+'}
          {formatAmount(transaction.amount, transaction.currency)}
        </span>
      </div>
    )
  }

  const isIncome = transaction.type === 'income'

  return (
    <div className="flex items-center gap-3 px-1 py-3">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${category?.color ?? '#666'}26` }}
      >
        <CategoryIcon name={category?.icon ?? 'tag'} size={18} color={category?.color ?? '#999'} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {transaction.note || category?.name || (isIncome ? 'Income' : 'Expense')}
        </p>
        <p className="truncate text-xs text-muted-foreground">{format(transaction.date, 'MMM d, h:mm a')}</p>
      </div>

      <span className={cn('shrink-0 text-sm font-semibold tabular-nums', isIncome ? 'text-success' : 'text-danger')}>
        {isIncome ? '+' : '\u2212'}
        {formatAmount(transaction.amount, transaction.currency)}
      </span>
    </div>
  )
}
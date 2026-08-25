import { format } from 'date-fns'
import { ArrowLeftRight, CreditCard as CreditCardIcon } from 'lucide-react'
import { CategoryIcon } from '@/lib/lucideIcon'
import { formatAmount } from '@/lib/money'
import { cn } from '@/lib/cn'
import type { TransactionListItem } from '../useTransactions'

export function TransactionRow({ transaction, category, account, toAccount, creditCard }: TransactionListItem) {
  // Credit Card bill payment — a liability payment, never an Expense.
  if (transaction.type === 'credit_card') {
    return (
      <div className="flex items-center gap-3 px-1 py-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
          <CreditCardIcon size={16} className="text-white/60" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">Credit Card Payment</p>
          <p className="truncate text-xs text-white/40">
            {format(transaction.date, 'MMM d, h:mm a')} · {account?.name ?? 'Unknown'} →{' '}
            {creditCard?.name ?? 'Card'}
            {creditCard?.last4 ? ` •••• ${creditCard.last4}` : ''}
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-white/70">
          {formatAmount(transaction.amount, transaction.currency)}
        </span>
      </div>
    )
  }

  if (transaction.type === 'transfer') {
    return (
      <div className="flex items-center gap-3 px-1 py-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
          <ArrowLeftRight size={16} className="text-white/60" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{transaction.note || 'Transfer'}</p>
          <p className="truncate text-xs text-white/40">
            {format(transaction.date, 'MMM d, h:mm a')} · {account?.name ?? 'Unknown'} →{' '}
            {toAccount?.name ?? 'Unknown'}
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-white/70">
          {formatAmount(transaction.amount, transaction.currency)}
        </span>
      </div>
    )
  }

  const isIncome = transaction.type === 'income'
  const signedAmount = isIncome ? transaction.amount : -transaction.amount

  return (
    <div className="flex items-center gap-3 px-1 py-3">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${category?.color ?? '#666'}26` }}
      >
        <CategoryIcon name={category?.icon ?? 'tag'} size={18} color={category?.color ?? '#999'} />
      </span>

            <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium text-white">
          <span className="truncate">{transaction.note || category?.name || (isIncome ? 'Income' : 'Expense')}</span>
          {transaction.relatedEntityId && (
            <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/40">
              Recurring
            </span>
          )}
        </p>
                <p className="truncate text-xs text-white/40">
          {format(transaction.date, 'MMM d, h:mm a')} ·{' '}
          {creditCard ? `${creditCard.name} •••• ${creditCard.last4}` : account?.name ?? 'Unknown account'}
        </p>
      </div>

      <span className={cn('shrink-0 text-sm font-semibold', isIncome ? 'text-emerald-400' : 'text-rose-300/90')}>
        {isIncome ? '+' : ''}
        {formatAmount(signedAmount, transaction.currency)}
      </span>
    </div>
  )
}
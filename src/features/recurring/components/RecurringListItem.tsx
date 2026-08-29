import { format } from 'date-fns'
import { CategoryIcon } from '@/lib/lucideIcon'
import { formatAmount } from '@/lib/money'
import { cn } from '@/lib/cn'
import type { RecurringListItem as RecurringListItemData } from '../useRecurring'

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
}

export function RecurringListItem({ item, onClick }: { item: RecurringListItemData; onClick: () => void }) {
  const { rule, categoryName, categoryIcon, categoryColor, accountName } = item
  const isIncome = rule.templateType === 'income'
  const signedAmount = isIncome ? rule.amount : -rule.amount

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left active:bg-surface-elevated"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${categoryColor ?? '#666'}26` }}
      >
        <CategoryIcon name={categoryIcon ?? 'repeat'} size={18} color={categoryColor ?? '#999'} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {rule.note || categoryName || (isIncome ? 'Income' : 'Expense')}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {accountName ?? 'Unknown account'} · {FREQUENCY_LABELS[rule.frequency]} · Next: {format(rule.nextRunDate, 'd MMM')}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className={cn('text-sm font-semibold', isIncome ? 'text-emerald-400' : 'text-rose-300/90')}>
          {isIncome ? '+' : ''}
          {formatAmount(signedAmount, rule.currency)}
        </span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-medium',
            rule.isActive ? 'bg-emerald-400/15 text-emerald-300' : 'bg-border text-muted-foreground'
          )}
        >
          {rule.isActive ? 'Active' : 'Paused'}
        </span>
      </div>
    </button>
  )
}
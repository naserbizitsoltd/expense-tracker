import { AlertTriangle, XCircle } from 'lucide-react'
import { CategoryIcon } from '@/lib/lucideIcon'
import { formatAmount } from '@/lib/money'
import { cn } from '@/lib/cn'
import type { BudgetWithProgress } from '../useBudgets'

const STATUS_STYLES: Record<BudgetWithProgress['status'], { bar: string; badge: string; label: string }> = {
  safe: { bar: 'bg-success', badge: 'bg-success/10 text-success border border-success/20', label: 'Safe' },
  warning: { bar: 'bg-warning', badge: 'bg-warning/10 text-warning border border-warning/20', label: 'Warning' },
  near_limit: { bar: 'bg-warning', badge: 'bg-danger/10 text-danger border border-danger/20', label: 'Near limit' },
  exceeded: { bar: 'bg-danger', badge: 'bg-danger/10 text-danger border border-danger/20', label: 'Exceeded' },
}

export function BudgetCard({ item, onClick }: { item: BudgetWithProgress; onClick: () => void }) {
  const { budget, categoryName, categoryIcon, categoryColor, spent, remaining, percentUsed, status } = item
  const style = STATUS_STYLES[status]
  const displayName = budget.name || categoryName || 'Budget'
  const barWidth = Math.min(100, Math.max(0, percentUsed))

  return (
    <button
      onClick={onClick}
      className="flex w-full flex-col gap-3 rounded-2xl border border-border bg-surface px-4 py-4 text-left active:bg-surface-elevated"
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${categoryColor ?? '#666'}26` }}
        >
          <CategoryIcon name={categoryIcon ?? 'wallet'} size={18} color={categoryColor ?? '#999'} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
          <p className="truncate text-xs capitalize text-muted-foreground">
            {budget.period} budget{!budget.isActive ? ' · Paused' : ''}
          </p>
        </div>
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', style.badge)}>
          {style.label}
        </span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
        <div className={cn('h-full rounded-full transition-all duration-300', style.bar)} style={{ width: `${barWidth}%` }} />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {formatAmount(spent, budget.currency)} / {formatAmount(budget.amount, budget.currency)}
        </span>
        <span className="text-muted-foreground">{percentUsed}% used</span>
      </div>

      <p className={cn('text-xs', remaining < 0 ? 'text-danger' : 'text-muted-foreground')}>
        {remaining < 0
          ? `Over by ${formatAmount(Math.abs(remaining), budget.currency)}`
          : `${formatAmount(remaining, budget.currency)} remaining`}
      </p>

      {(status === 'warning' || status === 'near_limit' || status === 'exceeded') && (
        <div className={cn('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium', style.badge)}>
          {status === 'exceeded' ? <XCircle size={13} /> : <AlertTriangle size={13} />}
          {status === 'exceeded'
            ? "You've gone over this budget."
            : status === 'near_limit'
              ? "You're close to the limit."
              : "You're approaching the limit."}
        </div>
      )}
    </button>
  )
}
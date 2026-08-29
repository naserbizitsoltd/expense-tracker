import { format } from 'date-fns'
import { Pencil, AlertTriangle, XCircle } from 'lucide-react'
import { BottomSheet } from '@/features/transactions/components/BottomSheet'
import { CategoryIcon } from '@/lib/lucideIcon'
import { formatAmount } from '@/lib/money'
import { cn } from '@/lib/cn'
import { useBudgetDetails } from '../useBudgets'
import type { Budget } from '@/types/entities'

interface BudgetDetailsSheetProps {
  budgetId: string | null
  onClose: () => void
  onEdit: (budget: Budget) => void
}

const STATUS_STYLES = {
  safe: { badge: 'bg-emerald-400/15 text-emerald-300', bar: 'bg-emerald-400', label: 'Safe' },
  warning: { badge: 'bg-amber-400/15 text-amber-300', bar: 'bg-amber-400', label: 'Warning' },
  near_limit: { badge: 'bg-orange-400/15 text-orange-300', bar: 'bg-orange-400', label: 'Near limit' },
  exceeded: { badge: 'bg-rose-400/15 text-rose-300', bar: 'bg-rose-400', label: 'Exceeded' },
} as const

export function BudgetDetailsSheet({ budgetId, onClose, onEdit }: BudgetDetailsSheetProps) {
  const { details, isLoading } = useBudgetDetails(budgetId)

  return (
        <BottomSheet
      open={budgetId !== null}
      onClose={onClose}
      title={details?.budget.name || details?.categoryName || 'Budget details'}
    >
      {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>}

      {!isLoading && !details && <p className="py-8 text-center text-sm text-muted-foreground">Budget not found.</p>}

      {!isLoading && details && (
        <div className="flex flex-col gap-5 pb-2">
          <div className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${details.categoryColor ?? '#666'}26` }}
            >
              <CategoryIcon name={details.categoryIcon ?? 'wallet'} size={20} color={details.categoryColor ?? '#999'} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{details.categoryName}</p>
              <p className="truncate text-xs capitalize text-muted-foreground">
                {details.budget.period} · {details.budget.isActive ? 'Active' : 'Paused'}
              </p>
            </div>
            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', STATUS_STYLES[details.status].badge)}>
              {STATUS_STYLES[details.status].label}
            </span>
          </div>

          <div className="rounded-2xl border border-border bg-surface-elevated px-4 py-4">
            <div className="mb-2 flex items-end justify-between">
              <p className="text-2xl font-semibold text-foreground">{formatAmount(details.spent, details.budget.currency)}</p>
              <p className="text-xs text-muted-foreground">of {formatAmount(details.budget.amount, details.budget.currency)}</p>
            </div>
            <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
              <div
                className={cn('h-full rounded-full transition-all duration-300', STATUS_STYLES[details.status].bar)}
                style={{ width: `${Math.min(100, Math.max(0, details.percentUsed))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className={details.remaining < 0 ? 'text-rose-300' : 'text-muted-foreground'}>
                {details.remaining < 0
                  ? `${formatAmount(Math.abs(details.remaining), details.budget.currency)} over budget`
                  : `${formatAmount(details.remaining, details.budget.currency)} remaining`}
              </span>
              <span className="text-muted-foreground">{details.percentUsed}% used</span>
            </div>
            {(details.status === 'exceeded' || details.status === 'near_limit') && (
              <div className={cn('mt-3 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium', STATUS_STYLES[details.status].badge)}>
                {details.status === 'exceeded' ? <XCircle size={13} /> : <AlertTriangle size={13} />}
                {details.status === 'exceeded' ? "You've gone over this budget." : "You're close to the limit."}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Start date</p>
              <p className="text-foreground">{format(details.budget.startDate, 'd MMM yyyy')}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">End date</p>
              <p className="text-foreground">{details.budget.endDate ? format(details.budget.endDate, 'd MMM yyyy') : 'No end date'}</p>
            </div>
          </div>

          {details.budget.notes && (
            <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Notes</p>
              <p className="text-sm text-muted-foreground">{details.budget.notes}</p>
            </div>
          )}

          <div>
            <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Related expenses ({details.relatedExpenses.length})
            </p>
            {details.relatedExpenses.length === 0 ? (
              <p className="px-1 py-4 text-center text-xs text-muted-foreground">No expenses in this period yet.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {details.relatedExpenses.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl px-2 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-foreground/80">{t.note || details.categoryName}</p>
                      <p className="text-xs text-muted-foreground">{format(t.date, 'd MMM, h:mm a')}</p>
                    </div>
                    <span className="shrink-0 text-rose-300/90">{formatAmount(t.amount, t.currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onEdit(details.budget)}
            className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface-elevated py-3 text-sm font-semibold text-foreground"
          >
            <Pencil size={16} /> Edit budget
          </button>
        </div>
      )}
    </BottomSheet>
  )
}
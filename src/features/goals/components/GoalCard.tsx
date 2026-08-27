import { CategoryIcon } from '@/lib/lucideIcon'
import { formatAmount } from '@/lib/money'
import { cn } from '@/lib/cn'
import type { GoalWithProgress } from '../useGoals'

export function GoalCard({ item, onClick }: { item: GoalWithProgress; onClick: () => void }) {
  const { goal, remaining, percentComplete, isOverfunded, excess, daysRemaining, isOverdue } = item
  const isCompleted = goal.status === 'achieved'
  const isArchived = goal.status === 'archived'

  return (
    <button
      onClick={onClick}
      className="flex w-full flex-col gap-3 rounded-2xl border border-border bg-surface px-4 py-4 text-left active:bg-surface-elevated"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${goal.color}26` }}>
          <CategoryIcon name={goal.icon} size={18} color={goal.color} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{goal.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {goal.targetDate === null
              ? 'No target date'
              : isCompleted
                ? 'Completed'
                : isOverdue
                  ? 'Overdue'
                  : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`}
          </p>
        </div>
        {(isCompleted || isArchived) && (
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
              isCompleted ? 'bg-success/10 text-success border border-success/20' : 'bg-surface-elevated text-muted-foreground border border-border'
            )}
          >
            {isCompleted ? 'Completed' : 'Archived'}
          </span>
        )}
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
        <div
          className={cn('h-full rounded-full transition-all duration-300', isCompleted ? 'bg-success' : 'bg-success/70')}
          style={{ width: `${percentComplete}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {formatAmount(goal.currentAmount, goal.currency)} / {formatAmount(goal.targetAmount, goal.currency)}
        </span>
        <span className="text-muted-foreground">{percentComplete}% complete</span>
      </div>

      <p className={cn('text-xs', isOverfunded ? 'font-medium text-success' : 'text-muted-foreground')}>
        {isOverfunded
          ? `${formatAmount(excess, goal.currency)} over target 🎉`
          : isCompleted
            ? 'Goal reached 🎉'
            : `${formatAmount(remaining, goal.currency)} remaining`}
      </p>
    </button>
  )
}
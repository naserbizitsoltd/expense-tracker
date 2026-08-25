import { format, differenceInCalendarDays } from 'date-fns'
import { BottomSheet } from '@/features/transactions/components/BottomSheet'
import { formatAmount } from '@/lib/money'
import { cn } from '@/lib/cn'
import { useGoalHistory } from '../useGoals'
import { accountRepository, useLiveQuery } from '@/db'
import type { Goal } from '@/types/entities'

const STATUS_LABEL: Record<Goal['status'], string> = {
  active: 'Active',
  achieved: 'Completed',
  archived: 'Archived',
}

export function GoalHistorySheet({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const { entries, isLoading } = useGoalHistory(goal?.id ?? null)
  const accountsState = useLiveQuery(() => accountRepository.getAll(), [])
  const accountsById = new Map((accountsState.data ?? []).map((a) => [a.id, a]))

  if (!goal) return null

  const isOverfunded = goal.currentAmount > goal.targetAmount
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount)
  const excess = isOverfunded ? goal.currentAmount - goal.targetAmount : 0
  const percentComplete = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0
  const isOverdue = goal.targetDate !== null && goal.status !== 'achieved' && differenceInCalendarDays(goal.targetDate, Date.now()) < 0
  const statusLabel = isOverdue ? 'Overdue' : STATUS_LABEL[goal.status]
  const contributions = entries.filter((e) => e.type === 'contribution')
  const withdrawals = entries.filter((e) => e.type === 'withdrawal')

  return (
    <BottomSheet open={!!goal} onClose={onClose} title={goal.name}>
      <div className="flex flex-col gap-5 pb-2">
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4">
          <div className="mb-2 flex items-end justify-between">
            <p className="text-2xl font-semibold text-white">{formatAmount(goal.currentAmount, goal.currency)}</p>
            <p className="text-xs text-white/40">of {formatAmount(goal.targetAmount, goal.currency)}</p>
          </div>
          <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={cn('h-full rounded-full transition-all duration-300', isOverfunded ? 'bg-emerald-400' : 'bg-emerald-400/70')}
              style={{ width: `${percentComplete}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className={isOverfunded ? 'font-medium text-emerald-300' : 'text-white/50'}>
              {isOverfunded
                ? `${formatAmount(excess, goal.currency)} over target`
                : `${formatAmount(remaining, goal.currency)} remaining`}
            </span>
            <span className="text-white/40">{percentComplete}% complete</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-white/30">Target date</p>
            <p className="text-white">{goal.targetDate ? format(goal.targetDate, 'd MMM yyyy') : 'No target date'}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-white/30">Status</p>
            <p className={cn(isOverdue ? 'text-rose-300' : 'text-white')}>{statusLabel}</p>
          </div>
        </div>

        {goal.notes && (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
            <p className="mb-1 text-[10px] uppercase tracking-wide text-white/30">Notes</p>
            <p className="text-sm text-white/70">{goal.notes}</p>
          </div>
        )}

        <div>
          <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-white/40">
            Contributions ({contributions.length}) · Withdrawals ({withdrawals.length})
          </p>
          <div className="flex flex-col gap-2">
            {isLoading && <p className="py-8 text-center text-sm text-white/40">Loading…</p>}
            {!isLoading && entries.length === 0 && (
              <p className="py-8 text-center text-sm text-white/40">No activity yet for this goal.</p>
            )}
        {entries.map((entry) => {
          const isContribution = entry.type === 'contribution'
          const account = accountsById.get(entry.accountId)
          return (
            <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
              <div className="min-w-0">
                <p className={cn('text-sm font-semibold', isContribution ? 'text-emerald-400' : 'text-rose-300/90')}>
                  {isContribution ? '+' : '−'} {formatAmount(entry.amount, goal.currency)}
                </p>
                <p className="truncate text-xs text-white/40">
                  {isContribution ? 'From' : 'To'} {account?.name ?? 'Unknown account'} · {format(entry.date, 'MMM d, yyyy')}
                </p>
                                {entry.note && <p className="truncate text-xs text-white/30">{entry.note}</p>}
              </div>
            </div>
          )
        })}
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}
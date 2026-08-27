import { useState } from 'react'
import { ArrowLeft, Plus, Target, Archive } from 'lucide-react'
import { useGoalsList } from '../useGoals'
import { GoalCard } from '../components/GoalCard'
import { GoalFormSheet } from '../components/GoalFormSheet'
import { GoalActionsSheet } from '../components/GoalActionsSheet'
import { GoalMoneyFormSheet } from '../components/GoalMoneyFormSheet'
import { GoalHistorySheet } from '../components/GoalHistorySheet'
import { cn } from '@/lib/cn'
import { formatAmount } from '@/lib/money'
import type { Goal } from '@/types/entities'

interface GoalPageProps {
  onBack: () => void
}

export function GoalPage({ onBack }: GoalPageProps) {
  const { activeItems, archivedItems, isLoading } = useGoalsList()
  const [showArchived, setShowArchived] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null)
  const [moneySheet, setMoneySheet] = useState<{ goal: Goal; mode: 'contribution' | 'withdrawal' } | null>(null)
  const [historySheet, setHistorySheet] = useState<Goal | null>(null)

  const items = showArchived ? archivedItems : activeItems

  const totalGoals = activeItems.length
  const totalSaved = activeItems.reduce((sum, i) => sum + i.goal.currentAmount, 0)
  const totalTarget = activeItems.reduce((sum, i) => sum + i.goal.targetAmount, 0)
  const overallProgress = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0
  const completedCount = activeItems.filter((i) => i.goal.status === 'achieved').length

  return (
    <div className="flex min-h-full flex-col bg-background px-4 pb-24 pt-6">
      <div className="mb-4 flex items-center gap-3 px-1">
        <button onClick={onBack} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-elevated text-muted-foreground active:bg-border">
          <ArrowLeft size={18} />
        </button>
        <h1 className="flex-1 text-xl font-semibold text-foreground">Goals</h1>
        <button
          onClick={() => setShowArchived((v) => !v)}
          aria-label="Show archived goals"
          className={cn('flex h-9 w-9 items-center justify-center rounded-full', showArchived ? 'bg-primary-muted text-foreground' : 'bg-surface-elevated text-muted-foreground')}
        >
          <Archive size={16} />
        </button>
        <button
          onClick={() => {
            setEditingGoal(null)
            setFormOpen(true)
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-95 transition-transform"
          aria-label="Create goal"
        >
          <Plus size={20} />
        </button>
      </div>

      {!isLoading && totalGoals > 0 && !showArchived && (
        <div className="mb-5 rounded-2xl border border-border bg-surface px-4 py-4">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-2xl font-semibold text-foreground">{formatAmount(totalSaved, 'BDT')}</p>
              <p className="text-xs text-muted-foreground">of {formatAmount(totalTarget, 'BDT')} targeted</p>
            </div>
            <p className="text-sm font-medium text-success">{overallProgress}%</p>
          </div>
          <div className="flex items-center gap-4 border-t border-border pt-3 text-xs">
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{totalGoals}</span> goal{totalGoals === 1 ? '' : 's'}
            </span>
            <span className="text-muted-foreground">
              <span className="font-semibold text-success">{completedCount}</span> completed
            </span>
          </div>
        </div>
      )}

      {isLoading && <p className="px-1 text-sm text-muted-foreground">Loading…</p>}

      {!isLoading && items.length === 0 && !showArchived && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-elevated">
            <Target size={22} className="text-muted-foreground" />
          </span>
          <p className="text-sm font-medium text-foreground">No savings goals yet</p>
          <p className="text-xs text-muted-foreground">Create a goal and start building towards it.</p>
          <button
            onClick={() => {
              setEditingGoal(null)
              setFormOpen(true)
            }}
            className="mt-1 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            + Create Goal
          </button>
        </div>
      )}

      {!isLoading && items.length === 0 && showArchived && (
        <p className="py-8 text-center text-sm text-muted-foreground">No archived goals.</p>
      )}

      {!isLoading && items.length > 0 && (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <GoalCard key={item.goal.id} item={item} onClick={() => setActiveGoal(item.goal)} />
          ))}
        </div>
      )}

      <GoalFormSheet open={formOpen} onClose={() => setFormOpen(false)} goal={editingGoal} onSaved={() => setFormOpen(false)} />

      <GoalActionsSheet
        goal={activeGoal}
        onClose={() => setActiveGoal(null)}
        onEdit={() => {
          setEditingGoal(activeGoal)
          setActiveGoal(null)
          setFormOpen(true)
        }}
        onAddMoney={() => {
          if (activeGoal) setMoneySheet({ goal: activeGoal, mode: 'contribution' })
          setActiveGoal(null)
        }}
        onWithdraw={() => {
          if (activeGoal) setMoneySheet({ goal: activeGoal, mode: 'withdrawal' })
          setActiveGoal(null)
        }}
        onViewHistory={() => {
          setHistorySheet(activeGoal)
          setActiveGoal(null)
        }}
      />

      <GoalMoneyFormSheet
        open={!!moneySheet}
        onClose={() => setMoneySheet(null)}
        goal={moneySheet?.goal ?? null}
        mode={moneySheet?.mode ?? 'contribution'}
        onSaved={() => setMoneySheet(null)}
      />

      <GoalHistorySheet goal={historySheet} onClose={() => setHistorySheet(null)} />
    </div>
  )
}
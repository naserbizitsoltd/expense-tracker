import { useMemo } from 'react'
import { differenceInCalendarDays } from 'date-fns'
import { goalRepository, goalTransactionRepository, useLiveQuery } from '@/db'
import type { Goal } from '@/types/entities'

export interface GoalWithProgress {
  goal: Goal
  remaining: number
  percentComplete: number // clamped to 100 — for the progress bar width only
  isOverfunded: boolean
  excess: number // amount saved beyond the target; 0 unless isOverfunded
  daysRemaining: number | null // null = no target date
  isOverdue: boolean
}

function withProgress(goal: Goal, now: number): GoalWithProgress {
  const isOverfunded = goal.currentAmount > goal.targetAmount
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount)
  const excess = isOverfunded ? goal.currentAmount - goal.targetAmount : 0
  const percentComplete =
    goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0

  let daysRemaining: number | null = null
  let isOverdue = false
  if (goal.targetDate !== null) {
    const diff = differenceInCalendarDays(goal.targetDate, now)
    if (diff < 0 && goal.status !== 'achieved') {
      isOverdue = true
      daysRemaining = 0 // never show a misleading negative "days remaining"
    } else {
      daysRemaining = Math.max(0, diff)
    }
  }
  return { goal, remaining, percentComplete, isOverfunded, excess, daysRemaining, isOverdue }
}

export function useGoalsList() {
  const state = useLiveQuery(() => goalRepository.getAll(), [])
  const now = Date.now()

  const items = useMemo(() => (state.data ?? []).map((g) => withProgress(g, now)), [state.data, now])

  return {
    items,
    activeItems: items.filter((i) => i.goal.status !== 'archived'),
    archivedItems: items.filter((i) => i.goal.status === 'archived'),
    isLoading: state.isLoading,
    error: state.error,
  }
}

export function useGoalHistory(goalId: string | null) {
  const state = useLiveQuery(() => (goalId ? goalTransactionRepository.getByGoal(goalId) : Promise.resolve([])), [goalId])
  return { entries: state.data ?? [], isLoading: state.isLoading, error: state.error }
}
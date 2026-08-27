import { useState } from 'react'
import { ArrowLeft, Plus, PiggyBank } from 'lucide-react'
import { useBudgetsWithProgress } from '../useBudgets'
import { BudgetCard } from '../components/BudgetCard'
import { BudgetFormSheet } from '../components/BudgetFormSheet'
import { BudgetActionsSheet } from '../components/BudgetActionsSheet'
import { BudgetDetailsSheet } from '../components/BudgetDetailsSheet'
import { formatAmount } from '@/lib/money'
import type { Budget } from '@/types/entities'

interface BudgetPageProps {
  onBack: () => void
}

export function BudgetPage({ onBack }: BudgetPageProps) {
  const { items, isLoading } = useBudgetsWithProgress()
  const [formOpen, setFormOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null)
  const [detailsBudgetId, setDetailsBudgetId] = useState<string | null>(null)

  const activeItems = items.filter((i) => i.budget.isActive)
  const totalBudget = activeItems.reduce((sum, i) => sum + i.budget.amount, 0)
  const totalSpent = activeItems.reduce((sum, i) => sum + i.spent, 0)
  const totalRemaining = totalBudget - totalSpent
  const overBudgetCount = activeItems.filter((i) => i.remaining < 0).length

  return (
    <div className="flex min-h-full flex-col bg-background px-4 pb-24 pt-6">
      <div className="mb-4 flex items-center gap-3 px-1">
        <button
          onClick={onBack}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-elevated text-muted-foreground active:bg-border"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="flex-1 text-xl font-semibold text-foreground">Budgets</h1>
        <button
          onClick={() => {
            setEditingBudget(null)
            setFormOpen(true)
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-95 transition-transform"
          aria-label="Create budget"
        >
          <Plus size={20} />
        </button>
      </div>

      {!isLoading && activeItems.length > 0 && (
        <div className="mb-5 rounded-2xl border border-border bg-surface px-4 py-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Overall Spending</p>
                    <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-semibold text-foreground">{formatAmount(totalSpent, 'BDT')}</p>
              <p className="text-xs text-muted-foreground">of {formatAmount(totalBudget, 'BDT')} budgeted</p>
            </div>
            <p className={totalRemaining < 0 ? 'text-sm font-medium text-danger' : 'text-sm font-medium text-success'}>
              {totalRemaining < 0
                ? `${formatAmount(Math.abs(totalRemaining), 'BDT')} over`
                : `${formatAmount(totalRemaining, 'BDT')} left`}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-4 border-t border-border pt-3 text-xs">
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{activeItems.length}</span> active budget
              {activeItems.length === 1 ? '' : 's'}
            </span>
            {overBudgetCount > 0 && (
              <span className="text-danger">
                <span className="font-semibold">{overBudgetCount}</span> over budget
              </span>
            )}
          </div>
        </div>
      )}
      {isLoading && <p className="px-1 text-sm text-muted-foreground">Loading…</p>}

      {!isLoading && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-elevated">
            <PiggyBank size={22} className="text-muted-foreground" />
          </span>
          <p className="text-sm font-medium text-foreground">No budgets yet</p>
          <p className="text-xs text-muted-foreground">Create a budget to control your spending.</p>
          <button
            onClick={() => {
              setEditingBudget(null)
              setFormOpen(true)
            }}
            className="mt-1 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            + Create Budget
          </button>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <BudgetCard key={item.budget.id} item={item} onClick={() => setSelectedBudget(item.budget)} />
          ))}
        </div>
      )}

      <BudgetFormSheet open={formOpen} onClose={() => setFormOpen(false)} budget={editingBudget} onSaved={() => setFormOpen(false)} />

            <BudgetActionsSheet
        budget={selectedBudget}
        onClose={() => setSelectedBudget(null)}
        onEdit={() => {
          setEditingBudget(selectedBudget)
          setSelectedBudget(null)
          setFormOpen(true)
        }}
        onViewDetails={() => {
          setDetailsBudgetId(selectedBudget?.id ?? null)
          setSelectedBudget(null)
        }}
      />

      <BudgetDetailsSheet
        budgetId={detailsBudgetId}
        onClose={() => setDetailsBudgetId(null)}
        onEdit={(budget) => {
          setEditingBudget(budget)
          setDetailsBudgetId(null)
          setFormOpen(true)
        }}
      />
    </div>
  )
}
import { useState } from 'react'
import { Pencil, Pause, Play, Trash2, Eye } from 'lucide-react'
import { BottomSheet } from '@/features/transactions/components/BottomSheet'
import { cn } from '@/lib/cn'
import { budgetRepository, getUserMessage } from '@/db'
import type { Budget } from '@/types/entities'

interface BudgetActionsSheetProps {
  budget: Budget | null
  onClose: () => void
  onEdit: () => void
  onViewDetails: () => void
}

export function BudgetActionsSheet({ budget, onClose, onEdit, onViewDetails }: BudgetActionsSheetProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!budget) return null

  async function toggleActive() {
    try {
      await budgetRepository.update(budget!.id, { isActive: !budget!.isActive })
      onClose()
    } catch (e) {
      setError(getUserMessage(e))
    }
  }

  async function remove() {
    try {
      // Deletes only the budget rule — every Expense transaction it
      // was tracking stays exactly as it is.
      await budgetRepository.delete(budget!.id)
      onClose()
    } catch (e) {
      setError(getUserMessage(e))
    }
  }

  return (
    <BottomSheet open={!!budget} onClose={onClose} title={budget.name || 'Budget'}>
      <div className="flex flex-col gap-2 pb-2">
        {error && <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{error}</p>}

                {!confirmingDelete ? (
          <>
            <button
              type="button"
              onClick={onViewDetails}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-left text-sm font-medium text-white"
            >
              <Eye size={18} className="text-white/60" /> View details
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-left text-sm font-medium text-white"
            >
              <Pencil size={18} className="text-white/60" /> Edit
            </button>
            <button
              type="button"
              onClick={toggleActive}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-left text-sm font-medium text-white"
            >
              {budget.isActive ? (
                <>
                  <Pause size={18} className="text-white/60" /> Pause
                </>
              ) : (
                <>
                  <Play size={18} className="text-white/60" /> Resume
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3.5 text-left text-sm font-medium text-red-300"
            >
              <Trash2 size={18} /> Delete
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="px-1 text-sm text-white/60">Delete this budget? Your expense transactions are not affected.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className={cn('flex-1 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white')}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={remove}
                className="flex-1 rounded-2xl bg-red-500 py-3 text-sm font-semibold text-white"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
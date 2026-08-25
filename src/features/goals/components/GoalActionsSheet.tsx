import { useState } from 'react'
import { Pencil, PlusCircle, MinusCircle, History, Archive, ArchiveRestore } from 'lucide-react'
import { BottomSheet } from '@/features/transactions/components/BottomSheet'
import { goalRepository, getUserMessage } from '@/db'
import type { Goal } from '@/types/entities'

interface GoalActionsSheetProps {
  goal: Goal | null
  onClose: () => void
  onEdit: () => void
  onAddMoney: () => void
  onWithdraw: () => void
  onViewHistory: () => void
}

export function GoalActionsSheet({ goal, onClose, onEdit, onAddMoney, onWithdraw, onViewHistory }: GoalActionsSheetProps) {
  const [error, setError] = useState<string | null>(null)
  if (!goal) return null

  const isArchived = goal.status === 'archived'

  async function toggleArchive() {
    try {
      await goalRepository.update(goal!.id, {
        status: isArchived ? (goal!.currentAmount >= goal!.targetAmount ? 'achieved' : 'active') : 'archived',
      })
      onClose()
    } catch (e) {
      setError(getUserMessage(e))
    }
  }

  return (
    <BottomSheet open={!!goal} onClose={onClose} title={goal.name}>
      <div className="flex flex-col gap-2 pb-2">
        {error && <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{error}</p>}

        {!isArchived && (
          <>
            <button
              type="button"
              onClick={onAddMoney}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-left text-sm font-medium text-white"
            >
              <PlusCircle size={18} className="text-emerald-400" /> Add Money
            </button>
            <button
              type="button"
              onClick={onWithdraw}
              disabled={goal.currentAmount <= 0}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-left text-sm font-medium text-white disabled:opacity-40"
            >
              <MinusCircle size={18} className="text-white/60" /> Withdraw
            </button>
          </>
        )}
                <button
          type="button"
          onClick={onViewHistory}
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-left text-sm font-medium text-white"
        >
          <History size={18} className="text-white/60" /> View Details
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
          onClick={toggleArchive}
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-left text-sm font-medium text-white"
        >
          {isArchived ? (
            <>
              <ArchiveRestore size={18} className="text-white/60" /> Restore
            </>
          ) : (
            <>
              <Archive size={18} className="text-white/60" /> Archive
            </>
          )}
        </button>
        {!isArchived && (
          <p className="px-1 text-center text-xs text-white/40">
            Archiving keeps this goal's saved amount and history — it just leaves the active list.
          </p>
        )}
      </div>
    </BottomSheet>
  )
}
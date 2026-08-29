import { useState } from 'react'
import { Pencil, Pause, Play, Trash2 } from 'lucide-react'
import { BottomSheet } from '@/features/transactions/components/BottomSheet'
import { cn } from '@/lib/cn'
import { recurringTransactionRepository, getUserMessage } from '@/db'
import type { RecurringTransaction } from '@/types/entities'

interface RecurringActionsSheetProps {
  rule: RecurringTransaction | null
  onClose: () => void
  onEdit: () => void
}

export function RecurringActionsSheet({ rule, onClose, onEdit }: RecurringActionsSheetProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!rule) return null

  async function toggleActive() {
    try {
      await recurringTransactionRepository.update(rule!.id, { isActive: !rule!.isActive })
      onClose()
    } catch (e) {
      setError(getUserMessage(e))
    }
  }

  async function remove() {
    try {
      await recurringTransactionRepository.delete(rule!.id)
      onClose()
    } catch (e) {
      setError(getUserMessage(e))
    }
  }

  return (
    <BottomSheet open={!!rule} onClose={onClose} title={rule.note || 'Recurring transaction'}>
      <div className="flex flex-col gap-2 pb-2">
        {error && <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{error}</p>}

        {!confirmingDelete ? (
          <>
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left text-sm font-medium text-foreground"
            >
              <Pencil size={18} className="text-muted-foreground" /> Edit
            </button>
            <button
              type="button"
              onClick={toggleActive}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left text-sm font-medium text-foreground"
            >
              {rule.isActive ? (
                <>
                  <Pause size={18} className="text-muted-foreground" /> Pause
                </>
              ) : (
                <>
                  <Play size={18} className="text-muted-foreground" /> Resume
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
            <p className="px-1 text-sm text-muted-foreground">
              Delete this recurring rule? Transactions already created from it will stay in your history.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className={cn('flex-1 rounded-2xl border border-border bg-surface py-3 text-sm font-semibold text-foreground')}
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
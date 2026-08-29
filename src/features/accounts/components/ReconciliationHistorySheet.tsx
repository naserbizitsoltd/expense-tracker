import { format } from 'date-fns'
import { History } from 'lucide-react'
import { BottomSheet, EmptyState, LoadingState } from '@/components/ui'
import { formatAmount } from '@/lib/money'
import { useReconciliationHistory } from '../useReconciliation'
import type { Account } from '@/types/entities'

interface ReconciliationHistorySheetProps {
  open: boolean
  onClose: () => void
  account: Account
}

export function ReconciliationHistorySheet({ open, onClose, account }: ReconciliationHistorySheetProps) {
  const { history, isLoading } = useReconciliationHistory(account.id)

  return (
    <BottomSheet open={open} onClose={onClose} title="Reconciliation History">
      <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto pb-1 pr-0.5">
        {isLoading && <LoadingState label="Loading history..." />}

        {!isLoading && history.length === 0 && (
          <EmptyState
            icon={<History className="h-6 w-6" />}
            title="No reconciliations yet"
            description="Reconcile this account to start building a history."
          />
        )}

        {!isLoading &&
          history.map((record) => {
            const hasAdjustment = record.difference !== 0
            return (
              <div key={record.id} className="rounded-2xl border border-border bg-surface px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{format(record.date, 'MMM d, yyyy · h:mm a')}</p>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      !hasAdjustment ? 'text-muted-foreground' : record.difference > 0 ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {hasAdjustment
                      ? `${record.difference > 0 ? '+' : '\u2212'}${formatAmount(Math.abs(record.difference), account.currency)}`
                      : 'No change'}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <p>App balance: {formatAmount(record.appBalance, account.currency)}</p>
                  <p>Actual balance: {formatAmount(record.actualBalance, account.currency)}</p>
                </div>
                {record.note && <p className="mt-2 text-xs text-muted-foreground">{record.note}</p>}
              </div>
            )
          })}
      </div>
    </BottomSheet>
  )
}
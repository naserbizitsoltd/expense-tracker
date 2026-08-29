import { useEffect, useState } from 'react'
import { BottomSheet, Button, CurrencyInput } from '@/components/ui'
import { formatAmount, parseAmountInput, currencySymbol } from '@/lib/money'
import { getAccountBalance } from '@/services/balanceService'
import { reconcileAccount } from '@/services/accountReconciliationService'
import { getUserMessage } from '@/db'
import type { Account, AccountReconciliation } from '@/types/entities'

interface ReconcileAccountSheetProps {
  open: boolean
  onClose: () => void
  account: Account
  onReconciled: (record: AccountReconciliation) => void
}

type Step = 'input' | 'review'

// Reconcile Account -> Enter Actual Balance -> Review Difference -> Confirm Adjustment
export function ReconcileAccountSheet({ open, onClose, account, onReconciled }: ReconcileAccountSheetProps) {
  const [step, setStep] = useState<Step>('input')
  const [appBalance, setAppBalance] = useState<number | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [actualInput, setActualInput] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setStep('input')
    setActualInput((account.balance / 100).toFixed(2))
    setNote('')
    setError(null)
    setIsLoadingBalance(true)
    getAccountBalance(account.id)
      .then((balance) => setAppBalance(balance))
      .catch(() => setAppBalance(account.balance))
      .finally(() => setIsLoadingBalance(false))
  }, [open, account.id, account.balance])

  function resetAndClose() {
    setStep('input')
    setError(null)
    onClose()
  }

  const parsedActual = parseAmountInput(actualInput, account.currency)
  const difference = appBalance !== null && parsedActual !== null ? parsedActual - appBalance : null

  function goToReview() {
    setError(null)
    if (appBalance === null) return
    if (parsedActual === null) {
      setError('Enter a valid balance.')
      return
    }
    if (!note.trim()) {
      setError('A reason/note is required to reconcile.')
      return
    }
    setStep('review')
  }

  async function confirmAdjustment() {
    if (parsedActual === null) return
    setIsSubmitting(true)
    setError(null)
    try {
      const record = await reconcileAccount({
        accountId: account.id,
        actualBalance: parsedActual,
        note,
      })
      onReconciled(record)
      resetAndClose()
    } catch (err) {
      setError(getUserMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={resetAndClose} title="Reconcile Account">
      <div className="flex flex-col gap-5">
        {step === 'input' && (
          <>
            <div className="rounded-2xl border border-border bg-surface px-4 py-3.5">
              <p className="text-xs text-muted-foreground">App balance</p>
              <p className="text-lg font-semibold tabular-nums text-foreground">
                {isLoadingBalance || appBalance === null ? '—' : formatAmount(appBalance, account.currency)}
              </p>
            </div>

            <CurrencyInput
              label="Actual balance"
              currencySymbol={currencySymbol(account.currency)}
              value={actualInput}
              onChange={(e) => setActualInput(e.target.value)}
            />

            <div>
              <label className="mb-1.5 block px-1 text-xs font-medium text-muted-foreground">Reason / note (required)</label>
              <textarea
                rows={2}
                placeholder="e.g. Counted cash in hand, bank statement dated today"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-emerald-400/60"
              />
            </div>

            {error && <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{error}</p>}

            <Button onClick={goToReview} disabled={isLoadingBalance}>
              Review Difference
            </Button>
          </>
        )}

        {step === 'review' && appBalance !== null && parsedActual !== null && difference !== null && (
          <>
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface px-4 py-4">
              <ReviewRow label="App balance" value={formatAmount(appBalance, account.currency)} />
              <ReviewRow label="Actual balance" value={formatAmount(parsedActual, account.currency)} />
              <div className="h-px bg-border" />
              <ReviewRow
                label="Difference"
                value={`${difference >= 0 ? '+' : '\u2212'}${formatAmount(Math.abs(difference), account.currency)}`}
                emphasis={difference === 0 ? undefined : difference > 0 ? 'success' : 'danger'}
              />
            </div>

            <p className="px-1 text-xs text-muted-foreground">
              {difference === 0
                ? 'No adjustment needed — the app balance already matches the actual balance. This reconciliation will still be recorded.'
                : `Confirming will create a ${difference > 0 ? 'credit' : 'debit'} adjustment transaction of ${formatAmount(
                    Math.abs(difference),
                    account.currency
                  )} to bring ${account.name} in line with the actual balance.`}
            </p>

            {error && <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{error}</p>}

            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep('input')} className="flex-1">
                Back
              </Button>
              <Button onClick={confirmAdjustment} disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Saving…' : 'Confirm Adjustment'}
              </Button>
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  )
}

function ReviewRow({ label, value, emphasis }: { label: string; value: string; emphasis?: 'success' | 'danger' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={`text-sm font-semibold tabular-nums ${
          emphasis === 'success' ? 'text-success' : emphasis === 'danger' ? 'text-danger' : 'text-foreground'
        }`}
      >
        {value}
      </span>
    </div>
  )
}
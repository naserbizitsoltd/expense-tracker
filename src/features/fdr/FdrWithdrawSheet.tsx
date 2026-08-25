import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { BottomSheet } from '@/features/transactions/components/BottomSheet'
import { AmountInput } from '@/features/transactions/components/AmountInput'
import { AccountSelectSheet } from '@/features/transactions/components/AccountSelectSheet'
import { ConfirmationDialog } from '@/components/ui'
import { CategoryIcon } from '@/lib/lucideIcon'
import { formatAmount, parseAmountInput } from '@/lib/money'
import { getFdrMaturitySummary, withdrawFdrPrematurely } from '@/services/fdrService'
import { getUserMessage } from '@/db'
import type { Account, Fdr, FdrPayout } from '@/types/entities'

interface FdrWithdrawSheetProps {
  open: boolean
  onClose: () => void
  fdr: Fdr
  onWithdrawn: (payout: FdrPayout, account: Account) => void
}

export function FdrWithdrawSheet({ open, onClose, fdr, onWithdrawn }: FdrWithdrawSheetProps) {
  const summary = getFdrMaturitySummary(fdr)
  const [accountSheetOpen, setAccountSheetOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [amountInput, setAmountInput] = useState('0.00')
  const [accountError, setAccountError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setSelectedAccount(null)
    setAmountInput((fdr.principal / 100).toFixed(2))
    setAccountError(null)
    setSubmitError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fdr.id])

  const withdrawalAmount = parseAmountInput(amountInput || '0', fdr.currency) ?? 0

  function resetAndClose() {
    setSelectedAccount(null)
    setSubmitError(null)
    setAccountError(null)
    onClose()
  }

  function onSubmit() {
    if (!selectedAccount) {
      setAccountError('Select an account to receive the withdrawal into.')
      return
    }
    if (parseAmountInput(amountInput || '0', fdr.currency) === null || withdrawalAmount <= 0) {
      setSubmitError('Enter a valid withdrawal amount.')
      return
    }
    setAccountError(null)
    setSubmitError(null)
    setConfirmOpen(true)
  }

  async function confirmWithdraw() {
    if (!selectedAccount) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const payout = await withdrawFdrPrematurely({
        fdrId: fdr.id,
        accountId: selectedAccount.id,
        withdrawalAmount,
      })
      onWithdrawn(payout, selectedAccount)
      resetAndClose()
    } catch (error) {
      setSubmitError(getUserMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <BottomSheet open={open} onClose={resetAndClose} title="Premature Withdrawal">
        <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pb-1 pr-0.5">
          <div className="rounded-2xl border border-border bg-surface-elevated px-4 py-3.5">
            <p className="text-sm font-medium text-foreground">{fdr.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">Principal</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">{formatAmount(fdr.principal, fdr.currency)}</p>
            <p className="mt-2 text-xs text-muted-foreground">Current maturity amount</p>
            <p className="text-sm font-medium text-foreground">
              {summary.maturityAmount !== null ? formatAmount(summary.maturityAmount, fdr.currency) : 'Not set'}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Expected withdrawal amount</label>
            <AmountInput value={amountInput} onChange={setAmountInput} currency={fdr.currency} />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Enter the actual amount your bank will pay out — early-withdrawal penalties aren't calculated automatically.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAccountSheetOpen(true)}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated px-4 py-3.5 text-left"
          >
            <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Receive into
            </span>
            {selectedAccount ? (
              <>
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${selectedAccount.color}26` }}
                >
                  <CategoryIcon name={selectedAccount.icon} size={16} color={selectedAccount.color} />
                </span>
                <span className="text-sm font-medium text-foreground">{selectedAccount.name}</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Select account</span>
            )}
            <ChevronRight size={18} className="ml-auto text-muted-foreground" />
          </button>
          {accountError && <p className="-mt-3 text-sm text-danger">{accountError}</p>}

          {submitError && <p className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm text-danger">{submitError}</p>}

          <div className="pt-2">
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting || !selectedAccount}
              className={`w-full rounded-2xl bg-danger py-4 text-center text-base font-semibold text-white transition-opacity ${
                isSubmitting || !selectedAccount ? 'opacity-50' : ''
              }`}
            >
              {isSubmitting ? 'Processing…' : 'Withdraw Prematurely'}
            </button>
          </div>
        </div>
      </BottomSheet>

      <AccountSelectSheet
        open={accountSheetOpen}
        onClose={() => setAccountSheetOpen(false)}
        onSelect={(account) => {
          setSelectedAccount(account)
          setAccountError(null)
        }}
        title="Receive into"
      />

      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmWithdraw}
        title="Confirm premature withdrawal?"
        description={
          selectedAccount
            ? `Receive ${formatAmount(withdrawalAmount, fdr.currency)} into ${selectedAccount.name}. This closes ${fdr.name} early and can't be undone.`
            : undefined
        }
        confirmLabel="Withdraw"
        variant="danger"
      />
    </>
  )
}
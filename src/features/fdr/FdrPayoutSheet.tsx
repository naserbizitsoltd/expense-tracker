import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { BottomSheet } from '@/features/transactions/components/BottomSheet'
import { AmountInput } from '@/features/transactions/components/AmountInput'
import { AccountSelectSheet } from '@/features/transactions/components/AccountSelectSheet'
import { ConfirmationDialog } from '@/components/ui'
import { CategoryIcon } from '@/lib/lucideIcon'
import { formatAmount, parseAmountInput } from '@/lib/money'
import { singleFlight } from '@/lib/singleFlight'
import { receiveFdrMaturity, getFdrMaturitySummary } from '@/services/fdrService'
import { getUserMessage } from '@/db'
import type { Account, Fdr, FdrPayout } from '@/types/entities'

interface FdrPayoutSheetProps {
  open: boolean
  onClose: () => void
  fdr: Fdr
  onReceived: (payout: FdrPayout, account: Account) => void
}

// Wrapped in singleFlight once, at module scope — same pattern as
// DpsPayoutSheet's submitPayout.
const submitPayout = singleFlight(receiveFdrMaturity)

export function FdrPayoutSheet({ open, onClose, fdr, onReceived }: FdrPayoutSheetProps) {
  const [accountSheetOpen, setAccountSheetOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [profitInput, setProfitInput] = useState('0.00')
  const [accountError, setAccountError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const summary = getFdrMaturitySummary(fdr)

  useEffect(() => {
    if (!open) return
    setSelectedAccount(null)
    setProfitInput(summary.profitAmount !== null ? (summary.profitAmount / 100).toFixed(2) : '0.00')
    setAccountError(null)
    setSubmitError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fdr.id])

  const profitAmount = parseAmountInput(profitInput || '0', fdr.currency) ?? 0
  const maturityAmount = fdr.principal + profitAmount

  function resetAndClose() {
    setSelectedAccount(null)
    setProfitInput('0.00')
    setSubmitError(null)
    setAccountError(null)
    onClose()
  }

  function onSubmit() {
    if (!selectedAccount) {
      setAccountError('Select an account to receive the payout into.')
      return
    }
    if (parseAmountInput(profitInput || '0', fdr.currency) === null) {
      setSubmitError('Enter a valid profit amount (or leave it at 0).')
      return
    }
    setAccountError(null)
    setSubmitError(null)
    setConfirmOpen(true)
  }

  async function confirmPayout() {
    if (!selectedAccount) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const payout = await submitPayout({
        fdrId: fdr.id,
        accountId: selectedAccount.id,
        profitAmount,
      })
      onReceived(payout, selectedAccount)
      resetAndClose()
    } catch (error) {
      setSubmitError(getUserMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <BottomSheet open={open} onClose={resetAndClose} title="Receive Maturity">
        <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pb-1 pr-0.5">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5">
            <p className="text-sm font-medium text-white">{fdr.name}</p>
            <p className="mt-1 text-xs text-white/40">Principal</p>
            <p className="text-lg font-semibold tabular-nums text-white">{formatAmount(fdr.principal, fdr.currency)}</p>
          </div>

          <div>
            <label className="mb-1.5 block px-1 text-xs font-medium text-white/50">Profit / Interest</label>
            <AmountInput value={profitInput} onChange={setProfitInput} currency={fdr.currency} />
            <p className="mt-1.5 px-1 text-xs text-white/40">
              {summary.profitAmount !== null
                ? 'Pre-filled from the maturity amount you entered — still editable.'
                : 'Enter what was actually paid — nothing is calculated automatically.'}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5">
            <p className="text-xs text-white/40">Maturity Amount</p>
            <p className="text-lg font-semibold tabular-nums text-white">{formatAmount(maturityAmount, fdr.currency)}</p>
          </div>

          <button
            type="button"
            onClick={() => setAccountSheetOpen(true)}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-left"
          >
            <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-white/40">
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
                <span className="text-sm font-medium text-white">{selectedAccount.name}</span>
              </>
            ) : (
              <span className="text-sm text-white/40">Select account</span>
            )}
            <ChevronRight size={18} className="ml-auto text-white/30" />
          </button>
          {accountError && <p className="-mt-3 px-1 text-sm text-red-400">{accountError}</p>}

          {submitError && <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{submitError}</p>}

          <div className="pt-2">
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting || !selectedAccount}
              className={`w-full rounded-2xl py-4 text-center text-base font-semibold text-black transition-opacity bg-emerald-400 ${
                isSubmitting || !selectedAccount ? 'opacity-50' : ''
              }`}
            >
              {isSubmitting ? 'Processing…' : 'Receive Maturity'}
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
        onConfirm={confirmPayout}
        title="Confirm maturity payout?"
        description={
          selectedAccount
            ? `Receive ${formatAmount(maturityAmount, fdr.currency)} into ${selectedAccount.name}. This closes ${fdr.name} and can't be undone.`
            : undefined
        }
        confirmLabel="Confirm"
      />
    </>
  )
}
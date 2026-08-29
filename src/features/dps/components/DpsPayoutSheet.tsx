import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { BottomSheet } from '@/features/transactions/components/BottomSheet'
import { AmountInput } from '@/features/transactions/components/AmountInput'
import { AccountSelectSheet } from '@/features/transactions/components/AccountSelectSheet'
import { ConfirmationDialog } from '@/components/ui'
import { CategoryIcon } from '@/lib/lucideIcon'
import { formatAmount, parseAmountInput } from '@/lib/money'
import { singleFlight } from '@/lib/singleFlight'
import { receiveDpsMaturity } from '@/services/dpsService'
import { getUserMessage } from '@/db'
import type { Account, Dps, DpsPayout } from '@/types/entities'

interface DpsPayoutSheetProps {
  open: boolean
  onClose: () => void
  dps: Dps
  deposited: number
  onReceived: (payout: DpsPayout, account: Account) => void
}

const submitPayout = singleFlight(receiveDpsMaturity)

export function DpsPayoutSheet({ open, onClose, dps, deposited, onReceived }: DpsPayoutSheetProps) {
  const [accountSheetOpen, setAccountSheetOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [profitInput, setProfitInput] = useState('0.00')
  const [accountError, setAccountError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setSelectedAccount(null)
    setProfitInput('0.00')
    setAccountError(null)
    setSubmitError(null)
  }, [open, dps.id])

  const profitAmount = parseAmountInput(profitInput || '0', dps.currency) ?? 0
  const maturityAmount = deposited + profitAmount

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
    if (parseAmountInput(profitInput || '0', dps.currency) === null) {
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
        dpsId: dps.id,
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
          <div className="rounded-2xl border border-border bg-surface px-4 py-3.5">
            <p className="text-sm font-medium text-foreground">{dps.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">Deposited</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">{formatAmount(deposited, dps.currency)}</p>
          </div>

          <div>
            <label className="mb-1.5 block px-1 text-xs font-medium text-muted-foreground">Profit / Interest (optional)</label>
            <AmountInput value={profitInput} onChange={setProfitInput} currency={dps.currency} />
            <p className="mt-1.5 px-1 text-xs text-muted-foreground">
              Only an amount you enter here is added — nothing is calculated automatically.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface px-4 py-3.5">
            <p className="text-xs text-muted-foreground">Maturity Amount</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">{formatAmount(maturityAmount, dps.currency)}</p>
          </div>

          <button
            type="button"
            onClick={() => setAccountSheetOpen(true)}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left"
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
            ? `Receive ${formatAmount(maturityAmount, dps.currency)} into ${selectedAccount.name}. This closes ${dps.name} and can't be undone.`
            : undefined
        }
        confirmLabel="Confirm"
      />
    </>
  )
}
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronRight } from 'lucide-react'
import { BottomSheet } from '@/features/transactions/components/BottomSheet'
import { AmountInput } from '@/features/transactions/components/AmountInput'
import { AccountSelectSheet } from '@/features/transactions/components/AccountSelectSheet'
import { ConfirmationDialog } from '@/components/ui'
import { CategoryIcon } from '@/lib/lucideIcon'
import { formatAmount, parseAmountInput } from '@/lib/money'
import { singleFlight } from '@/lib/singleFlight'
import { repayLoan } from '@/services/loanService'
import { getUserMessage } from '@/db'
import { loanAccountLabel } from '../loanConfig'
import {
  loanRepaymentFormSchema,
  loanRepaymentFormDefaults,
  type LoanRepaymentFormValues,
} from '../loanRepaymentFormSchema'
import type { Account, Loan, LoanRepayment } from '@/types/entities'

interface LoanRepaymentSheetProps {
  open: boolean
  onClose: () => void
  loan: Loan
  outstanding: number
  onRepaid: (repayment: LoanRepayment, account: Account) => void
}

// Wrapped in singleFlight once, at module scope — same pattern as
// CreditCardPaymentSheet's submitPayment.
const submitRepayment = singleFlight(repayLoan)

export function LoanRepaymentSheet({ open, onClose, loan, outstanding, onRepaid }: LoanRepaymentSheetProps) {
  const [accountSheetOpen, setAccountSheetOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingAmount, setPendingAmount] = useState<number | null>(null)
  const [pendingDate, setPendingDate] = useState<number | null>(null)
  const [pendingNotes, setPendingNotes] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<LoanRepaymentFormValues>({
    resolver: zodResolver(loanRepaymentFormSchema),
    defaultValues: loanRepaymentFormDefaults(),
  })

  const amountInput = watch('amountInput')
  const amount = parseAmountInput(amountInput || '0', loan.currency) ?? 0
  const remaining = Math.max(0, outstanding - amount)

  function resetAndClose() {
    reset(loanRepaymentFormDefaults())
    setSelectedAccount(null)
    setSubmitError(null)
    onClose()
  }

  function payFullAmount() {
    const full = (outstanding / 100).toFixed(2)
    setValue('amountInput', full, { shouldValidate: true })
  }

  const onValidated = handleSubmit((values) => {
    if (!selectedAccount) return
    setSubmitError(null)
    const parsedAmount = parseAmountInput(values.amountInput, loan.currency)
    if (parsedAmount === null) {
      setSubmitError('Enter a valid amount.')
      return
    }
    if (parsedAmount > outstanding) {
      setSubmitError("Amount cannot exceed outstanding balance.")
      return
    }

    const [y, m, d] = values.date.split('-').map(Number)
    const date = new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0).getTime()

    setPendingAmount(parsedAmount)
    setPendingDate(date)
    setPendingNotes(values.notes?.trim() || '')
    setConfirmOpen(true)
  })

  async function confirmRepayment() {
    if (!selectedAccount || pendingAmount === null || pendingDate === null) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const repayment = await submitRepayment({
        loanId: loan.id,
        accountId: selectedAccount.id,
        amount: pendingAmount,
        date: pendingDate,
        notes: pendingNotes,
      })
      onRepaid(repayment, selectedAccount)
      resetAndClose()
    } catch (error) {
      setSubmitError(getUserMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const accountLabel = loanAccountLabel(loan.direction, 'repay')

  return (
    <>
      <BottomSheet open={open} onClose={resetAndClose} title={loan.direction === 'taken' ? 'Repay Loan' : 'Receive Repayment'}>
        <form onSubmit={onValidated} className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pb-1 pr-0.5">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5">
            <p className="text-sm font-medium text-white">{loan.counterpartyName}</p>
            <p className="mt-1 text-xs text-white/40">Current outstanding</p>
            <p className="text-lg font-semibold tabular-nums text-white">{formatAmount(outstanding, loan.currency)}</p>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between px-1">
              <label className="text-xs font-medium text-white/50">Payment amount</label>
              <button type="button" onClick={payFullAmount} className="text-xs font-semibold text-emerald-400">
                Pay Full Amount
              </button>
            </div>
            <AmountInput
              value={amountInput}
              onChange={(v) => setValue('amountInput', v, { shouldValidate: true })}
              currency={loan.currency}
              error={errors.amountInput?.message}
            />
            {amountInput && (
              <p className="mt-1.5 px-1 text-xs text-white/40">
                Remaining after this payment: <span className="font-medium text-white/70">{formatAmount(remaining, loan.currency)}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setAccountSheetOpen(true)}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-left"
          >
            <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-white/40">
              {accountLabel}
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
          {errors.accountId && <p className="-mt-3 px-1 text-sm text-red-400">{errors.accountId.message}</p>}

          <div>
            <label className="mb-1.5 block px-1 text-xs font-medium text-white/50">Date</label>
            <input
              type="date"
              {...register('date')}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400/60"
            />
          </div>

          <div>
            <label className="mb-1.5 block px-1 text-xs font-medium text-white/50">Notes (optional)</label>
            <textarea
              rows={2}
              placeholder="Anything else worth remembering"
              {...register('notes')}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-emerald-400/60"
            />
          </div>

          {submitError && <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{submitError}</p>}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !selectedAccount}
              className={`w-full rounded-2xl py-4 text-center text-base font-semibold text-black transition-opacity bg-emerald-400 ${
                isSubmitting || !selectedAccount ? 'opacity-50' : ''
              }`}
            >
              {isSubmitting ? 'Saving…' : 'Confirm Repayment'}
            </button>
          </div>
        </form>
      </BottomSheet>

      <AccountSelectSheet
        open={accountSheetOpen}
        onClose={() => setAccountSheetOpen(false)}
        onSelect={(account) => {
          setSelectedAccount(account)
          setValue('accountId', account.id, { shouldValidate: true })
        }}
        title={accountLabel}
      />

      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmRepayment}
        title="Confirm this repayment?"
        description={
          selectedAccount && pendingAmount !== null
            ? `${loan.direction === 'taken' ? 'Pay' : 'Receive'} ${formatAmount(pendingAmount, loan.currency)} ${
                loan.direction === 'taken' ? 'from' : 'into'
              } ${selectedAccount.name} for the loan with ${loan.counterpartyName}.`
            : undefined
        }
        confirmLabel="Confirm"
      />
    </>
  )
}
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
  // Purely a preview of the auto-split repayLoan will apply — same math, shown before you submit.
  const previewInterest = Math.max(0, amount - outstanding)

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
          <div className="rounded-2xl border border-border bg-surface px-4 py-3.5">
            <p className="text-sm font-medium text-foreground">{loan.counterpartyName}</p>
            <p className="mt-1 text-xs text-muted-foreground">Current outstanding</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">{formatAmount(outstanding, loan.currency)}</p>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between px-1">
              <label className="text-xs font-medium text-muted-foreground">Payment amount</label>
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
              <div className="mt-1.5 flex flex-col gap-0.5 px-1 text-xs text-muted-foreground">
                <p>
                  Remaining principal after this payment:{' '}
                  <span className="font-medium text-muted-foreground">{formatAmount(remaining, loan.currency)}</span>
                </p>
                {previewInterest > 0 && (
                  <p>
                    Of this, <span className="font-medium text-muted-foreground">{formatAmount(previewInterest, loan.currency)}</span>{' '}
                    is above the outstanding principal, so it's recorded as interest.
                  </p>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setAccountSheetOpen(true)}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left"
          >
            <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
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
                <span className="text-sm font-medium text-foreground">{selectedAccount.name}</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Select account</span>
            )}
            <ChevronRight size={18} className="ml-auto text-muted-foreground" />
          </button>
          {errors.accountId && <p className="-mt-3 px-1 text-sm text-red-400">{errors.accountId.message}</p>}

          <div>
            <label className="mb-1.5 block px-1 text-xs font-medium text-muted-foreground">Date</label>
            <input
              type="date"
              {...register('date')}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-emerald-400/60"
            />
          </div>

          <div>
            <label className="mb-1.5 block px-1 text-xs font-medium text-muted-foreground">Notes (optional)</label>
            <textarea
              rows={2}
              placeholder="Anything else worth remembering"
              {...register('notes')}
              className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-emerald-400/60"
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
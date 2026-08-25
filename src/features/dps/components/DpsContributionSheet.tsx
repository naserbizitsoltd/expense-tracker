import { useEffect, useState } from 'react'
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
import { contributeToDps } from '@/services/dpsService'
import { getUserMessage } from '@/db'
import {
  dpsContributionFormSchema,
  dpsContributionFormDefaults,
  type DpsContributionFormValues,
} from '../dpsContributionFormSchema'
import type { Account, Dps, DpsContribution } from '@/types/entities'

interface DpsContributionSheetProps {
  open: boolean
  onClose: () => void
  dps: Dps
  linkedAccount: Account | undefined
  onContributed: (contribution: DpsContribution, account: Account) => void
}

// Wrapped in singleFlight once, at module scope — same pattern as
// CreditCardPaymentSheet's submitPayment / LoanRepaymentSheet's submitRepayment.
const submitContribution = singleFlight(contributeToDps)

export function DpsContributionSheet({ open, onClose, dps, linkedAccount, onContributed }: DpsContributionSheetProps) {
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
  } = useForm<DpsContributionFormValues>({
    resolver: zodResolver(dpsContributionFormSchema),
    defaultValues: dpsContributionFormDefaults(),
  })

  const amountInput = watch('amountInput')

  // Pre-fill amount with the monthly installment, and account with the
  // DPS's linked account, each time the sheet opens — still editable.
  useEffect(() => {
    if (!open) return
    reset({
      ...dpsContributionFormDefaults(),
      amountInput: (dps.monthlyInstallment / 100).toFixed(2),
      accountId: linkedAccount?.id ?? '',
    })
    setSelectedAccount(linkedAccount ?? null)
    setSubmitError(null)
  }, [open, dps.id, dps.monthlyInstallment, linkedAccount, reset])

  function resetAndClose() {
    reset(dpsContributionFormDefaults())
    setSelectedAccount(null)
    setSubmitError(null)
    onClose()
  }

  const onValidated = handleSubmit((values) => {
    if (!selectedAccount) return
    setSubmitError(null)
    const parsedAmount = parseAmountInput(values.amountInput, dps.currency)
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

  async function confirmContribution() {
    if (!selectedAccount || pendingAmount === null || pendingDate === null) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const contribution = await submitContribution({
        dpsId: dps.id,
        accountId: selectedAccount.id,
        amount: pendingAmount,
        date: pendingDate,
        notes: pendingNotes,
      })
      onContributed(contribution, selectedAccount)
      resetAndClose()
    } catch (error) {
      setSubmitError(getUserMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <BottomSheet open={open} onClose={resetAndClose} title="Add Contribution">
        <form onSubmit={onValidated} className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pb-1 pr-0.5">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5">
            <p className="text-sm font-medium text-white">{dps.name}</p>
            <p className="mt-1 text-xs text-white/40">Installment</p>
            <p className="text-lg font-semibold tabular-nums text-white">{formatAmount(dps.monthlyInstallment, dps.currency)}</p>
          </div>

          <div>
            <label className="mb-1.5 block px-1 text-xs font-medium text-white/50">Amount</label>
            <AmountInput
              value={amountInput}
              onChange={(v) => setValue('amountInput', v, { shouldValidate: true })}
              currency={dps.currency}
              error={errors.amountInput?.message}
            />
          </div>

          <button
            type="button"
            onClick={() => setAccountSheetOpen(true)}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-left"
          >
            <span className="w-16 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-white/40">
              Pay from
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
              {isSubmitting ? 'Saving…' : 'Confirm Contribution'}
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
        title="Pay from"
      />

      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmContribution}
        title="Confirm this contribution?"
        description={
          selectedAccount && pendingAmount !== null
            ? `Pay ${formatAmount(pendingAmount, dps.currency)} from ${selectedAccount.name} into ${dps.name}.`
            : undefined
        }
        confirmLabel="Confirm"
      />
    </>
  )
}
import { useState, useEffect } from 'react'
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
import { payCreditCardBill, updateTransaction } from '@/services/transactionService'
import { getUserMessage } from '@/db'
import {
  creditCardPaymentFormSchema,
  creditCardPaymentFormDefaults,
  type CreditCardPaymentFormValues,
} from '../creditCardPaymentSchema'
import type { Account, CreditCard, Transaction } from '@/types/entities'
import type { TransactionListItem } from '@/features/transactions/useTransactions'

interface CreditCardPaymentSheetProps {
  open: boolean
  onClose: () => void
  card: CreditCard
  editing?: TransactionListItem | null
  onPaid: (transaction: Transaction, account: Account) => void
}

// Wrapped in singleFlight once, at module scope, so a rapid double-tap
// on Confirm Payment collapses into a single payCreditCardBill call.
const submitPayment = singleFlight(payCreditCardBill)
const submitPaymentEdit = singleFlight(updateTransaction)

export function CreditCardPaymentSheet({ open, onClose, card, editing, onPaid }: CreditCardPaymentSheetProps) {
  const [accountSheetOpen, setAccountSheetOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingAmount, setPendingAmount] = useState<number | null>(null)
  const [pendingDate, setPendingDate] = useState<number | null>(null)
  const [pendingNote, setPendingNote] = useState('')

  const isEditing = !!editing

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreditCardPaymentFormValues>({
    resolver: zodResolver(creditCardPaymentFormSchema),
    defaultValues: creditCardPaymentFormDefaults(),
  })

  const amountInput = watch('amountInput')

  useEffect(() => {
    if (!open) return
    if (editing) {
      const tx = editing.transaction
      const d = new Date(tx.date)
      reset({
        amountInput: (tx.amount / 100).toFixed(2),
        accountId: tx.accountId,
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
        notes: tx.note ?? '',
      })
      setSelectedAccount(editing.account ?? null)
    } else {
      reset(creditCardPaymentFormDefaults())
      setSelectedAccount(null)
    }
  }, [open, editing])

  function resetAndClose() {
    reset(creditCardPaymentFormDefaults())
    setSelectedAccount(null)
    setSubmitError(null)
    onClose()
  }

  function payFullAmount() {
    const full = (card.outstandingBalance / 100).toFixed(2)
    setValue('amountInput', full, { shouldValidate: true })
  }

  // Validates the form, then opens the confirmation dialog instead of
  // writing immediately — the actual payment happens in confirmPayment.
  const onValidated = handleSubmit((values) => {
    if (!selectedAccount) return
    setSubmitError(null)
    const amount = parseAmountInput(values.amountInput, selectedAccount.currency)
    if (amount === null) {
      setSubmitError('Enter a valid amount.')
      return
    }
    if (amount > card.outstandingBalance) {
      setSubmitError('Payment cannot exceed outstanding balance.')
      return
    }

    const [year, month, day] = values.date.split('-').map(Number)
    const [hours, minutes] = values.time ? values.time.split(':').map(Number) : [12, 0]
    const date = new Date(year, (month ?? 1) - 1, day ?? 1, hours ?? 12, minutes ?? 0).getTime()

    setPendingAmount(amount)
    setPendingDate(date)
    setPendingNote(values.notes?.trim() || '')
    setConfirmOpen(true)
  })

  async function confirmPayment() {
    if (!selectedAccount || pendingAmount === null || pendingDate === null) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const transaction = editing
        ? await submitPaymentEdit(editing.transaction.id, {
            amount: pendingAmount,
            accountId: selectedAccount.id,
            date: pendingDate,
            note: pendingNote,
          })
        : await submitPayment({
            amount: pendingAmount,
            accountId: selectedAccount.id,
            creditCardId: card.id,
            date: pendingDate,
            note: pendingNote,
          })
      onPaid(transaction, selectedAccount)
      resetAndClose()
    } catch (error) {
      setSubmitError(getUserMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <BottomSheet open={open} onClose={resetAndClose} title={isEditing ? 'Edit Payment' : 'Pay Card'}>
        <form onSubmit={onValidated} className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pb-1 pr-0.5">
          <div className="rounded-2xl border border-border bg-surface-elevated px-4 py-3.5">
            <p className="text-sm font-medium text-foreground">
              {card.name}
              {card.last4 ? ` •••• ${card.last4}` : ''}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Outstanding balance</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {formatAmount(card.outstandingBalance, card.currency)}
            </p>
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
              currency={card.currency}
              error={errors.amountInput?.message}
            />
          </div>

          <button
            type="button"
            onClick={() => setAccountSheetOpen(true)}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated px-4 py-3.5 text-left"
          >
            <span className="w-16 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
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
                <span className="text-sm font-medium text-foreground">{selectedAccount.name}</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Select account</span>
            )}
            <ChevronRight size={18} className="ml-auto text-muted-foreground" />
          </button>
          {errors.accountId && <p className="-mt-3 px-1 text-sm text-red-400">{errors.accountId.message}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block px-1 text-xs font-medium text-muted-foreground">Date</label>
              <input
                type="date"
                {...register('date')}
                className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/60"
              />
            </div>
            <div>
              <label className="mb-1.5 block px-1 text-xs font-medium text-muted-foreground">Time (optional)</label>
              <input
                type="time"
                {...register('time')}
                className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/60"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block px-1 text-xs font-medium text-muted-foreground">Notes (optional)</label>
            <textarea
              rows={2}
              placeholder="Anything else worth remembering"
              {...register('notes')}
              className="w-full resize-none rounded-xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
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
              {isSubmitting ? 'Paying…' : isEditing ? 'Save Changes' : 'Confirm Payment'}
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
        onConfirm={confirmPayment}
        title="Confirm this payment?"
        description={
          selectedAccount && pendingAmount !== null
            ? `Pay ${formatAmount(pendingAmount, card.currency)} from ${selectedAccount.name} toward ${card.name}${
                card.last4 ? ` •••• ${card.last4}` : ''
              }.`
            : undefined
        }
        confirmLabel="Pay"
      />
    </>
  )
}
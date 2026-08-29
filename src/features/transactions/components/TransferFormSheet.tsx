import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDownUp, ChevronRight } from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import { AmountInput } from './AmountInput'
import { AccountSelectSheet } from './AccountSelectSheet'
import { CategoryIcon } from '@/lib/lucideIcon'
import { cn } from '@/lib/cn'
import { singleFlight } from '@/lib/singleFlight'
import { parseAmountInput } from '@/lib/money'
import { createTransfer, updateTransaction } from '@/services/transactionService'
import { getUserMessage } from '@/db'
import { transferFormSchema, transferFormDefaults, type TransferFormValues } from '../transferFormSchema'
import type { Account, Transaction } from '@/types/entities'
import type { TransactionListItem } from '../useTransactions'

interface TransferFormSheetProps {
  open: boolean
  editing?: TransactionListItem | null
  onClose: () => void
  onSaved: (transaction: Transaction, fromAccount: Account, toAccount: Account) => void
}

const submitTransfer = singleFlight(createTransfer)
const submitTransferEdit = singleFlight(updateTransaction)

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function TransferFormSheet({ open, editing, onClose, onSaved }: TransferFormSheetProps) {
  const [fromSheetOpen, setFromSheetOpen] = useState(false)
  const [toSheetOpen, setToSheetOpen] = useState(false)
  const [fromAccount, setFromAccount] = useState<Account | null>(null)
  const [toAccount, setToAccount] = useState<Account | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: transferFormDefaults(),
  })

  const amountInput = watch('amountInput')
  const isEditing = !!editing

  useEffect(() => {
    if (!open) return
    if (editing) {
      const tx = editing.transaction
      const d = new Date(tx.date)
      reset({
        amountInput: (tx.amount / 100).toFixed(2),
        fromAccountId: tx.accountId,
        toAccountId: tx.toAccountId ?? '',
        date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
        description: tx.note ?? '',
        notes: '',
      })
      setFromAccount(editing.account ?? null)
      setToAccount(editing.toAccount ?? null)
    } else {
      reset(transferFormDefaults())
      setFromAccount(null)
      setToAccount(null)
    }
  }, [open, editing, reset])

  function resetAndClose() {
    reset(transferFormDefaults())
    setFromAccount(null)
    setToAccount(null)
    setSubmitError(null)
    onClose()
  }

  function swapAccounts() {
    const nextFrom = toAccount
    const nextTo = fromAccount
    setFromAccount(nextFrom)
    setToAccount(nextTo)
    setValue('fromAccountId', nextFrom?.id ?? '', { shouldValidate: true })
    setValue('toAccountId', nextTo?.id ?? '', { shouldValidate: true })
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!fromAccount || !toAccount) return
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      const amount = parseAmountInput(values.amountInput, fromAccount.currency)
      if (amount === null) {
        setSubmitError('Enter a valid amount.')
        return
      }
      if (fromAccount.id === toAccount.id) {
        setSubmitError('From and To accounts must be different.')
        return
      }

      const [year, month, day] = values.date.split('-').map(Number)
      const [hours, minutes] = values.time ? values.time.split(':').map(Number) : [12, 0]
      const date = new Date(year, (month ?? 1) - 1, day ?? 1, hours ?? 12, minutes ?? 0).getTime()
      const note = values.description?.trim() || values.notes?.trim() || ''

      const transaction = editing
        ? await submitTransferEdit(editing.transaction.id, {
            amount,
            accountId: fromAccount.id,
            toAccountId: toAccount.id,
            date,
            note,
          })
        : await submitTransfer({
            amount,
            accountId: fromAccount.id,
            toAccountId: toAccount.id,
            date,
            note,
          })

      onSaved(transaction, fromAccount, toAccount)
      resetAndClose()
    } catch (error) {
      setSubmitError(getUserMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  })

  return (
    <>
      <BottomSheet open={open} onClose={resetAndClose} title={isEditing ? 'Edit Transfer' : 'Transfer Money'}>
        <form onSubmit={onSubmit} className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pb-1 pr-0.5">
          <AmountInput
            value={amountInput}
            onChange={(v) => setValue('amountInput', v, { shouldValidate: true })}
            currency={fromAccount?.currency ?? 'BDT'}
            error={errors.amountInput?.message}
          />

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setFromSheetOpen(true)}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated px-4 py-3.5 text-left"
            >
              <span className="w-9 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                From
              </span>
              {fromAccount ? (
                <>
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${fromAccount.color}26` }}
                  >
                    <CategoryIcon name={fromAccount.icon} size={16} color={fromAccount.color} />
                  </span>
                  <span className="text-sm font-medium text-foreground">{fromAccount.name}</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Select source account</span>
              )}
              <ChevronRight size={18} className="ml-auto text-muted-foreground" />
            </button>

            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={swapAccounts}
                disabled={!fromAccount && !toAccount}
                aria-label="Swap From and To accounts"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400 text-black disabled:opacity-40 active:scale-95 transition-transform"
              >
                <ArrowDownUp size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setToSheetOpen(true)}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated px-4 py-3.5 text-left"
            >
              <span className="w-9 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                To
              </span>
              {toAccount ? (
                <>
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${toAccount.color}26` }}
                  >
                    <CategoryIcon name={toAccount.icon} size={16} color={toAccount.color} />
                  </span>
                  <span className="text-sm font-medium text-foreground">{toAccount.name}</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Select destination account</span>
              )}
              <ChevronRight size={18} className="ml-auto text-muted-foreground" />
            </button>
          </div>
          {(errors.fromAccountId || errors.toAccountId) && (
            <p className="-mt-3 px-1 text-sm text-red-400">
              {errors.fromAccountId?.message ?? errors.toAccountId?.message}
            </p>
          )}

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
            <label className="mb-1.5 block px-1 text-xs font-medium text-muted-foreground">Description (optional)</label>
            <input
              type="text"
              placeholder="e.g. Cash withdrawal"
              {...register('description')}
              className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
            />
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

          {submitError && (
            <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{submitError}</p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !fromAccount || !toAccount}
              className={cn(
                'w-full rounded-2xl py-4 text-center text-base font-semibold text-black transition-opacity',
                'bg-emerald-400',
                (isSubmitting || !fromAccount || !toAccount) && 'opacity-50'
              )}
            >
              {isSubmitting ? (isEditing ? 'Saving…' : 'Transferring…') : isEditing ? 'Save Changes' : 'Transfer Money'}
            </button>
          </div>
        </form>
      </BottomSheet>

      <AccountSelectSheet
        open={fromSheetOpen}
        onClose={() => setFromSheetOpen(false)}
        onSelect={(account) => {
          setFromAccount(account)
          setValue('fromAccountId', account.id, { shouldValidate: true })
        }}
        title="Transfer from"
        excludeAccountId={toAccount?.id}
      />
      <AccountSelectSheet
        open={toSheetOpen}
        onClose={() => setToSheetOpen(false)}
        onSelect={(account) => {
          setToAccount(account)
          setValue('toAccountId', account.id, { shouldValidate: true })
        }}
        title="Transfer to"
        excludeAccountId={fromAccount?.id}
      />
    </>
  )
}
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronRight } from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import { AmountInput } from './AmountInput'
import { CategorySelectSheet } from './CategorySelectSheet'
import { PaymentSourceSelectSheet } from './PaymentSourceSelectSheet'
import { CategoryIcon } from '@/lib/lucideIcon'
import { cn } from '@/lib/cn'
import { singleFlight } from '@/lib/singleFlight'
import { parseAmountInput } from '@/lib/money'
import { createExpense, updateTransaction } from '@/services/transactionService'
import { getUserMessage } from '@/db'
import { expenseFormSchema, expenseFormDefaults, type ExpenseFormValues } from '../expenseFormSchema'
import type { Account, Category, CreditCard, DebitCard, Transaction } from '@/types/entities'
import type { TransactionListItem } from '../useTransactions'

interface ExpenseFormSheetProps {
  open: boolean
  editing?: TransactionListItem | null
  onClose: () => void
  onSaved: (transaction: Transaction, category: Category, account: Account | null, creditCard?: CreditCard | null) => void
}

const submitExpense = singleFlight(createExpense)
const submitExpenseEdit = singleFlight(updateTransaction)

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function ExpenseFormSheet({ open, editing, onClose, onSaved }: ExpenseFormSheetProps) {
  const [categorySheetOpen, setCategorySheetOpen] = useState(false)
  const [sourceSheetOpen, setSourceSheetOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [selectedCreditCard, setSelectedCreditCard] = useState<CreditCard | null>(null)
  const [selectedDebitCard, setSelectedDebitCard] = useState<{ debitCard: DebitCard; account: Account } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: expenseFormDefaults(),
  })

  const amountInput = watch('amountInput')
  const sourceCurrency = selectedAccount?.currency ?? selectedDebitCard?.account.currency ?? selectedCreditCard?.currency ?? 'BDT'
  const isEditing = !!editing

  // Prefill the form whenever an "editing" transaction is handed in.
  useEffect(() => {
    if (!open) return
    if (editing) {
      const tx = editing.transaction
      const d = new Date(tx.date)
      reset({
        amountInput: (tx.amount / 100).toFixed(2),
        categoryId: tx.categoryId ?? '',
        accountId: tx.creditCardId ?? tx.accountId,
        date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
        description: tx.note ?? '',
        notes: '',
      })
      setSelectedCategory(editing.category ?? null)
      setSelectedDebitCard(null)
      if (editing.creditCard) {
        setSelectedCreditCard(editing.creditCard)
        setSelectedAccount(null)
      } else {
        setSelectedCreditCard(null)
        setSelectedAccount(editing.account ?? null)
      }
    } else {
      reset(expenseFormDefaults())
      setSelectedCategory(null)
      setSelectedAccount(null)
      setSelectedCreditCard(null)
      setSelectedDebitCard(null)
    }
  }, [open, editing, reset])

  function resetAndClose() {
    reset(expenseFormDefaults())
    setSelectedCategory(null)
    setSelectedAccount(null)
    setSelectedCreditCard(null)
    setSelectedDebitCard(null)
    setSubmitError(null)
    onClose()
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!selectedCategory || (!selectedAccount && !selectedCreditCard && !selectedDebitCard)) return
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      const amount = parseAmountInput(values.amountInput, sourceCurrency)
      if (amount === null) {
        setSubmitError('Enter a valid amount.')
        return
      }

      const [year, month, day] = values.date.split('-').map(Number)
      const [hours, minutes] = values.time ? values.time.split(':').map(Number) : [12, 0]
      const date = new Date(year, (month ?? 1) - 1, day ?? 1, hours ?? 12, minutes ?? 0).getTime()
      const note = values.description?.trim() || values.notes?.trim() || ''

      let transaction: Transaction
      if (editing) {
        // Payment source is locked during edit (see PaymentSourceSelectSheet
        // being disabled below) so we only ever send amount/category/date/note.
        transaction = await submitExpenseEdit(editing.transaction.id, {
          amount,
          categoryId: selectedCategory.id,
          date,
          note,
        })
      } else {
        transaction = selectedCreditCard
          ? await submitExpense({
              creditCardId: selectedCreditCard.id,
              amount,
              categoryId: selectedCategory.id,
              date,
              note,
            })
          : selectedDebitCard
            ? await submitExpense({
                accountId: selectedDebitCard.account.id,
                debitCardId: selectedDebitCard.debitCard.id,
                amount,
                categoryId: selectedCategory.id,
                date,
                note,
              })
            : await submitExpense({
                accountId: selectedAccount!.id,
                amount,
                categoryId: selectedCategory.id,
                date,
                note,
              })
      }

      onSaved(transaction, selectedCategory, selectedAccount ?? selectedDebitCard?.account ?? null, selectedCreditCard)
      resetAndClose()
    } catch (error) {
      setSubmitError(getUserMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  })

  return (
    <>
      <BottomSheet open={open} onClose={resetAndClose} title={isEditing ? 'Edit Expense' : 'Add Expense'}>
        <form onSubmit={onSubmit} className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pb-1 pr-0.5">
          <AmountInput
            value={amountInput}
            onChange={(v) => setValue('amountInput', v, { shouldValidate: true })}
            currency={sourceCurrency}
            error={errors.amountInput?.message}
          />

          <button
            type="button"
            onClick={() => setCategorySheetOpen(true)}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated px-4 py-3.5 text-left"
          >
            {selectedCategory ? (
              <>
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${selectedCategory.color}26` }}
                >
                  <CategoryIcon name={selectedCategory.icon} size={16} color={selectedCategory.color} />
                </span>
                <span className="text-sm font-medium text-foreground">{selectedCategory.name}</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Select category</span>
            )}
            <ChevronRight size={18} className="ml-auto text-muted-foreground" />
          </button>
          {errors.categoryId && <p className="-mt-3 px-1 text-sm text-red-400">{errors.categoryId.message}</p>}

          <button
            type="button"
            disabled={isEditing}
            onClick={() => setSourceSheetOpen(true)}
            className={cn(
              'flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated px-4 py-3.5 text-left',
              isEditing && 'opacity-60'
            )}
          >
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
            ) : selectedDebitCard ? (
              <>
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${selectedDebitCard.debitCard.color}26` }}
                >
                  <CategoryIcon name={selectedDebitCard.debitCard.icon} size={16} color={selectedDebitCard.debitCard.color} />
                </span>
                <span className="text-sm font-medium text-foreground">
                  {selectedDebitCard.debitCard.name} •••• {selectedDebitCard.debitCard.last4}
                </span>
              </>
            ) : selectedCreditCard ? (
              <>
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${selectedCreditCard.color}26` }}
                >
                  <CategoryIcon name={selectedCreditCard.icon} size={16} color={selectedCreditCard.color} />
                </span>
                <span className="text-sm font-medium text-foreground">
                  {selectedCreditCard.name} •••• {selectedCreditCard.last4}
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Pay from</span>
            )}
            {!isEditing && <ChevronRight size={18} className="ml-auto text-muted-foreground" />}
          </button>
          {isEditing && (
            <p className="-mt-3 px-1 text-xs text-muted-foreground">Payment source can't be changed once a transaction is created.</p>
          )}
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
            <label className="mb-1.5 block px-1 text-xs font-medium text-muted-foreground">Description (optional)</label>
            <input
              type="text"
              placeholder="e.g. Lunch with colleagues"
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

          {submitError && <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{submitError}</p>}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !selectedCategory || (!selectedAccount && !selectedCreditCard && !selectedDebitCard)}
              className={cn(
                'w-full rounded-2xl py-4 text-center text-base font-semibold text-black transition-opacity',
                'bg-emerald-400',
                (isSubmitting || !selectedCategory || (!selectedAccount && !selectedCreditCard && !selectedDebitCard)) && 'opacity-50'
              )}
            >
              {isSubmitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Save Expense'}
            </button>
          </div>
        </form>
      </BottomSheet>

      <CategorySelectSheet
        open={categorySheetOpen}
        onClose={() => setCategorySheetOpen(false)}
        onSelect={(category) => {
          setSelectedCategory(category)
          setValue('categoryId', category.id, { shouldValidate: true })
        }}
      />
      <PaymentSourceSelectSheet
        open={sourceSheetOpen}
        onClose={() => setSourceSheetOpen(false)}
        onSelect={(source) => {
          if (source.kind === 'account') {
            setSelectedAccount(source.account)
            setSelectedCreditCard(null)
            setSelectedDebitCard(null)
            setValue('accountId', source.account.id, { shouldValidate: true })
          } else if (source.kind === 'debitCard') {
            setSelectedDebitCard({ debitCard: source.debitCard, account: source.account })
            setSelectedAccount(null)
            setSelectedCreditCard(null)
            setValue('accountId', source.debitCard.id, { shouldValidate: true })
          } else {
            setSelectedCreditCard(source.creditCard)
            setSelectedAccount(null)
            setSelectedDebitCard(null)
            setValue('accountId', source.creditCard.id, { shouldValidate: true })
          }
        }}
      />
    </>
  )
}
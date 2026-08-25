import { useState } from 'react'
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
import { createExpense } from '@/services/transactionService'
import { getUserMessage } from '@/db'
import { expenseFormSchema, expenseFormDefaults, type ExpenseFormValues } from '../expenseFormSchema'
import type { Account, Category, CreditCard, DebitCard, Transaction } from '@/types/entities'

interface ExpenseFormSheetProps {
  open: boolean
  onClose: () => void
  onSaved: (transaction: Transaction, category: Category, account: Account | null, creditCard?: CreditCard | null) => void
}

// The actual DB write is wrapped in singleFlight once, at module scope,
// so a rapid double-tap on Save — even across re-renders — collapses
// into a single createExpense call instead of creating two expenses.
const submitExpense = singleFlight(createExpense)

export function ExpenseFormSheet({ open, onClose, onSaved }: ExpenseFormSheetProps) {
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

      const transaction = selectedCreditCard
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
      <BottomSheet open={open} onClose={resetAndClose} title="Add Expense">
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
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-left"
          >
            {selectedCategory ? (
              <>
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${selectedCategory.color}26` }}
                >
                  <CategoryIcon name={selectedCategory.icon} size={16} color={selectedCategory.color} />
                </span>
                <span className="text-sm font-medium text-white">{selectedCategory.name}</span>
              </>
            ) : (
              <span className="text-sm text-white/40">Select category</span>
            )}
            <ChevronRight size={18} className="ml-auto text-white/30" />
          </button>
          {errors.categoryId && <p className="-mt-3 px-1 text-sm text-red-400">{errors.categoryId.message}</p>}

          <button
            type="button"
            onClick={() => setSourceSheetOpen(true)}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-left"
          >
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
            ) : selectedDebitCard ? (
              <>
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${selectedDebitCard.debitCard.color}26` }}
                >
                  <CategoryIcon name={selectedDebitCard.debitCard.icon} size={16} color={selectedDebitCard.debitCard.color} />
                </span>
                <span className="text-sm font-medium text-white">
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
                <span className="text-sm font-medium text-white">
                  {selectedCreditCard.name} •••• {selectedCreditCard.last4}
                </span>
              </>
            ) : (
              <span className="text-sm text-white/40">Pay from</span>
            )}
            <ChevronRight size={18} className="ml-auto text-white/30" />
          </button>
          {errors.accountId && <p className="-mt-3 px-1 text-sm text-red-400">{errors.accountId.message}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block px-1 text-xs font-medium text-white/50">Date</label>
              <input
                type="date"
                {...register('date')}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400/60"
              />
            </div>
            <div>
              <label className="mb-1.5 block px-1 text-xs font-medium text-white/50">Time (optional)</label>
              <input
                type="time"
                {...register('time')}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400/60"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block px-1 text-xs font-medium text-white/50">Description (optional)</label>
            <input
              type="text"
              placeholder="e.g. Lunch with colleagues"
              {...register('description')}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-emerald-400/60"
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
              disabled={isSubmitting || !selectedCategory || (!selectedAccount && !selectedCreditCard && !selectedDebitCard)}
              className={cn(
                'w-full rounded-2xl py-4 text-center text-base font-semibold text-black transition-opacity',
                'bg-emerald-400',
                (isSubmitting || !selectedCategory || (!selectedAccount && !selectedCreditCard && !selectedDebitCard)) && 'opacity-50'
              )}
            >
              {isSubmitting ? 'Saving…' : 'Save Expense'}
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
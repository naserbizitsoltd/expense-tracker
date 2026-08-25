import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronRight } from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import { AmountInput } from './AmountInput'
import { CategorySelectSheet } from './CategorySelectSheet'
import { AccountSelectSheet } from './AccountSelectSheet'
import { CategoryIcon } from '@/lib/lucideIcon'
import { cn } from '@/lib/cn'
import { singleFlight } from '@/lib/singleFlight'
import { parseAmountInput } from '@/lib/money'
import { createIncome } from '@/services/transactionService'
import { getUserMessage } from '@/db'
import { incomeFormSchema, incomeFormDefaults, type IncomeFormValues } from '../incomeFormSchema'
import type { Account, Category, Transaction } from '@/types/entities'

interface IncomeFormSheetProps {
  open: boolean
  onClose: () => void
  onSaved: (transaction: Transaction, category: Category, account: Account) => void
}

// Wrapped in singleFlight once, at module scope, so a rapid double-tap
// on Save collapses into a single createIncome call instead of two.
const submitIncome = singleFlight(createIncome)

export function IncomeFormSheet({ open, onClose, onSaved }: IncomeFormSheetProps) {
  const [categorySheetOpen, setCategorySheetOpen] = useState(false)
  const [accountSheetOpen, setAccountSheetOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeFormSchema),
    defaultValues: incomeFormDefaults(),
  })

  const amountInput = watch('amountInput')

  function resetAndClose() {
    reset(incomeFormDefaults())
    setSelectedCategory(null)
    setSelectedAccount(null)
    setSubmitError(null)
    onClose()
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!selectedCategory || !selectedAccount) return
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      const amount = parseAmountInput(values.amountInput, selectedAccount.currency)
      if (amount === null) {
        setSubmitError('Enter a valid amount.')
        return
      }

      const [year, month, day] = values.date.split('-').map(Number)
      const [hours, minutes] = values.time ? values.time.split(':').map(Number) : [12, 0]
      const date = new Date(year, (month ?? 1) - 1, day ?? 1, hours ?? 12, minutes ?? 0).getTime()

      const transaction = await submitIncome({
        amount,
        accountId: selectedAccount.id,
        categoryId: selectedCategory.id,
        date,
        note: values.description?.trim() || values.notes?.trim() || '',
      })

      onSaved(transaction, selectedCategory, selectedAccount)
      resetAndClose()
    } catch (error) {
      setSubmitError(getUserMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  })

  return (
    <>
      <BottomSheet open={open} onClose={resetAndClose} title="Add Income">
        <form onSubmit={onSubmit} className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pb-1 pr-0.5">
          <AmountInput
            value={amountInput}
            onChange={(v) => setValue('amountInput', v, { shouldValidate: true })}
            currency={selectedAccount?.currency ?? 'BDT'}
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
              <span className="text-sm text-white/40">Select income category</span>
            )}
            <ChevronRight size={18} className="ml-auto text-white/30" />
          </button>
          {errors.categoryId && <p className="-mt-3 px-1 text-sm text-red-400">{errors.categoryId.message}</p>}

          <button
            type="button"
            onClick={() => setAccountSheetOpen(true)}
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
            ) : (
              <span className="text-sm text-white/40">Where did you receive the money?</span>
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
              placeholder="e.g. Monthly salary"
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

          {submitError && (
            <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{submitError}</p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !selectedCategory || !selectedAccount}
              className={cn(
                'w-full rounded-2xl py-4 text-center text-base font-semibold text-black transition-opacity',
                'bg-emerald-400',
                (isSubmitting || !selectedCategory || !selectedAccount) && 'opacity-50'
              )}
            >
              {isSubmitting ? 'Saving…' : 'Save Income'}
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
        type="income"
        title="Choose income category"
      />
      <AccountSelectSheet
        open={accountSheetOpen}
        onClose={() => setAccountSheetOpen(false)}
        onSelect={(account) => {
          setSelectedAccount(account)
          setValue('accountId', account.id, { shouldValidate: true })
        }}
        title="Receiving account"
      />
    </>
  )
}
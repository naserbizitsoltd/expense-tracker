import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronRight } from 'lucide-react'
import { BottomSheet } from '@/features/transactions/components/BottomSheet'
import { AmountInput } from '@/features/transactions/components/AmountInput'
import { CategorySelectSheet } from '@/features/transactions/components/CategorySelectSheet'
import { AccountSelectSheet } from '@/features/transactions/components/AccountSelectSheet'
import { CategoryIcon } from '@/lib/lucideIcon'
import { cn } from '@/lib/cn'
import { parseAmountInput } from '@/lib/money'
import { toDecimal } from '@/types/money'
import { generateId, accountRepository, categoryRepository, recurringTransactionRepository, getUserMessage } from '@/db'
import {
  recurringFormSchema,
  recurringFormDefaults,
  recurringFrequencies,
  type RecurringFormValues,
} from '../recurringFormSchema'
import type { Account, Category, RecurringTransaction } from '@/types/entities'

interface RecurringFormSheetProps {
  open: boolean
  onClose: () => void
  rule?: RecurringTransaction | null
  defaultType?: 'expense' | 'income'
  onSaved: () => void
}

const FREQUENCY_LABELS: Record<(typeof recurringFrequencies)[number], string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
}

export function RecurringFormSheet({ open, onClose, rule, defaultType = 'expense', onSaved }: RecurringFormSheetProps) {
  const isEdit = !!rule
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
  } = useForm<RecurringFormValues>({
    resolver: zodResolver(recurringFormSchema),
    defaultValues: recurringFormDefaults(defaultType),
  })

  const templateType = watch('templateType')
  const amountInput = watch('amountInput')
  const frequency = watch('frequency')

  // Preload the form (and resolve the account/category records for
  // display) whenever a rule is opened for editing, or reset to blank
  // defaults when opening for a new rule.
  useEffect(() => {
    if (!open) return
    if (rule) {
            reset({
        templateType: rule.templateType as 'expense' | 'income',
        amountInput: String(toDecimal({ amount: rule.amount, currency: rule.currency })),
        categoryId: rule.categoryId ?? '',
        accountId: rule.accountId,
        frequency: rule.frequency,
        startDate: new Date(rule.startDate).toISOString().slice(0, 10),
        endDate: rule.endDate ? new Date(rule.endDate).toISOString().slice(0, 10) : '',
        description: rule.note,
        notes: '',
      })
      accountRepository.getById(rule.accountId).then((a) => setSelectedAccount(a ?? null))
      if (rule.categoryId) categoryRepository.getById(rule.categoryId).then((c) => setSelectedCategory(c ?? null))
    } else {
      reset(recurringFormDefaults(defaultType))
      setSelectedAccount(null)
      setSelectedCategory(null)
    }
    setSubmitError(null)
  }, [open, rule, defaultType, reset])

  function resetAndClose() {
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
            const [year, month, day] = values.startDate.split('-').map(Number)
      const startDate = new Date(year, (month ?? 1) - 1, day ?? 1, 12, 0).getTime()
      const endDate = values.endDate
        ? (() => {
            const [ey, em, ed] = values.endDate!.split('-').map(Number)
            return new Date(ey, (em ?? 1) - 1, ed ?? 1, 12, 0).getTime()
          })()
        : null
      const now = Date.now()

      if (isEdit && rule) {
        const scheduleChanged = rule.frequency !== values.frequency || rule.startDate !== startDate
        await recurringTransactionRepository.update(rule.id, {
          amount,
          accountId: selectedAccount.id,
          categoryId: selectedCategory.id,
          note: values.description?.trim() || values.notes?.trim() || '',
          frequency: values.frequency,
          interval: 1,
          startDate,
          endDate,
          ...(scheduleChanged ? { nextRunDate: startDate, lastRunDate: null } : {}),
        })
      } else {
        const id = generateId()
        const record: RecurringTransaction = {
          id,
          templateType: values.templateType,
          amount,
          currency: selectedAccount.currency,
          accountId: selectedAccount.id,
          toAccountId: null,
          categoryId: selectedCategory.id,
          note: values.description?.trim() || values.notes?.trim() || '',
          frequency: values.frequency,
          interval: 1,
          startDate,
          endDate,
          nextRunDate: startDate,
          lastRunDate: null,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }
        await recurringTransactionRepository.create(record)
      }

      onSaved()
      resetAndClose()
    } catch (error) {
      setSubmitError(getUserMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  })

  return (
    <>
      <BottomSheet open={open} onClose={resetAndClose} title={isEdit ? 'Edit Recurring' : 'Add Recurring'}>
        <form onSubmit={onSubmit} className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pb-1 pr-0.5">
          {!isEdit && (
            <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
              {(['expense', 'income'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setValue('templateType', t)
                    setValue('categoryId', '')
                    setSelectedCategory(null)
                  }}
                  className={cn(
                    'flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-all duration-150',
                    templateType === t ? 'bg-emerald-400 text-black' : 'text-white/50'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

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
              <span className="text-sm text-white/40">Select category</span>
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
              <span className="text-sm text-white/40">{templateType === 'expense' ? 'Paid from' : 'Received into'}</span>
            )}
            <ChevronRight size={18} className="ml-auto text-white/30" />
          </button>
          {errors.accountId && <p className="-mt-3 px-1 text-sm text-red-400">{errors.accountId.message}</p>}

          <div>
            <label className="mb-1.5 block px-1 text-xs font-medium text-white/50">Frequency</label>
            <div className="grid grid-cols-4 gap-2">
              {recurringFrequencies.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setValue('frequency', f, { shouldValidate: true })}
                  className={cn(
                    'rounded-xl border py-2 text-xs font-semibold transition-colors',
                    frequency === f
                      ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300'
                      : 'border-white/10 bg-white/5 text-white/50'
                  )}
                >
                  {FREQUENCY_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

                    <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block px-1 text-xs font-medium text-white/50">Start date</label>
              <input
                type="date"
                {...register('startDate')}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400/60"
              />
              {errors.startDate && <p className="mt-1 px-1 text-sm text-red-400">{errors.startDate.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block px-1 text-xs font-medium text-white/50">End date (optional)</label>
              <input
                type="date"
                {...register('endDate')}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400/60"
              />
              {errors.endDate && <p className="mt-1 px-1 text-sm text-red-400">{errors.endDate.message}</p>}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block px-1 text-xs font-medium text-white/50">Description (optional)</label>
            <input
              type="text"
              placeholder="e.g. House Rent"
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
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add Recurring'}
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
        type={templateType}
        title={templateType === 'expense' ? 'Choose expense category' : 'Choose income category'}
      />
      <AccountSelectSheet
        open={accountSheetOpen}
        onClose={() => setAccountSheetOpen(false)}
        onSelect={(account) => {
          setSelectedAccount(account)
          setValue('accountId', account.id, { shouldValidate: true })
        }}
        title={templateType === 'expense' ? 'Paid from' : 'Received into'}
      />
    </>
  )
}
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronRight } from 'lucide-react'
import { BottomSheet } from '@/features/transactions/components/BottomSheet'
import { AmountInput } from '@/features/transactions/components/AmountInput'
import { CategorySelectSheet } from '@/features/transactions/components/CategorySelectSheet'
import { CategoryIcon } from '@/lib/lucideIcon'
import { cn } from '@/lib/cn'
import { parseAmountInput } from '@/lib/money'
import { toDecimal } from '@/types/money'
import { generateId, budgetRepository, categoryRepository, getUserMessage } from '@/db'
import { budgetFormSchema, budgetFormDefaults, budgetPeriods, type BudgetFormValues } from '../budgetFormSchema'
import type { Budget, Category } from '@/types/entities'

interface BudgetFormSheetProps {
  open: boolean
  onClose: () => void
  budget?: Budget | null
  onSaved: () => void
}

const PERIOD_LABELS: Record<(typeof budgetPeriods)[number], string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
  custom: 'Custom',
}

export function BudgetFormSheet({ open, onClose, budget, onSaved }: BudgetFormSheetProps) {
  const isEdit = !!budget
  const [categorySheetOpen, setCategorySheetOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: budgetFormDefaults(),
  })

  const amountInput = watch('amountInput')
  const period = watch('period')
  const isOverall = watch('isOverall')
  const categoryId = watch('categoryId')

  useEffect(() => {
    if (!open) return
    if (budget) {
            reset({
        name: budget.name,
        amountInput: String(toDecimal({ amount: budget.amount, currency: budget.currency })),
        isOverall: budget.categoryId === null,
        categoryId: budget.categoryId ?? '',
        period: budget.period,
        startDate: new Date(budget.startDate).toISOString().slice(0, 10),
        endDate: budget.endDate ? new Date(budget.endDate).toISOString().slice(0, 10) : '',
        notes: budget.notes,
      })
      if (budget.categoryId) categoryRepository.getById(budget.categoryId).then((c) => setSelectedCategory(c ?? null))
      else setSelectedCategory(null)
    } else {
      reset(budgetFormDefaults())
      setSelectedCategory(null)
    }
    setSubmitError(null)
  }, [open, budget, reset])

  function resetAndClose() {
    setSubmitError(null)
    onClose()
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!values.isOverall && !selectedCategory) return
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      const amount = parseAmountInput(values.amountInput, 'BDT')
      if (amount === null) {
        setSubmitError('Enter a valid amount.')
        return
      }

      const [sy, sm, sd] = values.startDate.split('-').map(Number)
      const startDate = new Date(sy, (sm ?? 1) - 1, sd ?? 1, 0, 0).getTime()

      let endDate: number | null = null
      if (values.period === 'custom' || values.endDate) {
        if (!values.endDate) {
          setSubmitError('Choose an end date for a custom period.')
          return
        }
        const [ey, em, ed] = values.endDate.split('-').map(Number)
        endDate = new Date(ey, (em ?? 1) - 1, ed ?? 1, 23, 59).getTime()
        if (endDate < startDate) {
          setSubmitError('End date must be after the start date.')
          return
        }
      }

      const finalCategoryId = values.isOverall ? null : selectedCategory!.id

      // Prevent duplicate active budgets for the same category + period.
      const activeBudgets = await budgetRepository.getActive()
      const duplicate = activeBudgets.some(
        (b) => b.id !== budget?.id && b.period === values.period && b.categoryId === finalCategoryId
      )
      if (duplicate) {
        setSubmitError(
          `An active ${PERIOD_LABELS[values.period]} budget already exists for ${
            values.isOverall ? 'overall spending' : selectedCategory!.name
          }.`
        )
        return
      }

            const now = Date.now()
      if (isEdit && budget) {
        await budgetRepository.update(budget.id, {
          name: values.name?.trim() || '',
          categoryId: finalCategoryId,
          amount,
          period: values.period,
          startDate,
          endDate,
          notes: values.notes?.trim() || '',
        })
      } else {
        const record: Budget = {
          id: generateId(),
          name: values.name?.trim() || '',
          categoryId: finalCategoryId,
          amount,
          currency: 'BDT',
          period: values.period,
          startDate,
          endDate,
          notes: values.notes?.trim() || '',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }
        await budgetRepository.create(record)
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
      <BottomSheet open={open} onClose={resetAndClose} title={isEdit ? 'Edit Budget' : 'Create Budget'}>
        <form onSubmit={onSubmit} className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pb-1 pr-0.5">
          <AmountInput
            value={amountInput}
            onChange={(v) => setValue('amountInput', v, { shouldValidate: true })}
            currency="BDT"
            error={errors.amountInput?.message}
          />

          <div>
            <label className="mb-1.5 block px-1 text-xs font-medium text-white/50">Budget name (optional)</label>
            <input
              type="text"
              placeholder="e.g. Food & Dining"
              {...register('name')}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-emerald-400/60"
            />
          </div>

          <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setValue('isOverall', false)}
              className={cn(
                'flex-1 rounded-lg py-2 text-sm font-semibold transition-all duration-150',
                !isOverall ? 'bg-emerald-400 text-black' : 'text-white/50'
              )}
            >
              Category
            </button>
            <button
              type="button"
              onClick={() => {
                setValue('isOverall', true)
                setValue('categoryId', '')
                setSelectedCategory(null)
              }}
              className={cn(
                'flex-1 rounded-lg py-2 text-sm font-semibold transition-all duration-150',
                isOverall ? 'bg-emerald-400 text-black' : 'text-white/50'
              )}
            >
              Overall spending
            </button>
          </div>

          {!isOverall && (
            <>
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
                  <span className="text-sm text-white/40">Select expense category</span>
                )}
                <ChevronRight size={18} className="ml-auto text-white/30" />
              </button>
              {!selectedCategory && categoryId === '' && (
                <p className="-mt-3 px-1 text-sm text-red-400">Choose a category</p>
              )}
            </>
          )}

          <div>
            <label className="mb-1.5 block px-1 text-xs font-medium text-white/50">Period</label>
            <div className="grid grid-cols-4 gap-2">
              {budgetPeriods.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setValue('period', p, { shouldValidate: true })}
                  className={cn(
                    'rounded-xl border py-2 text-xs font-semibold transition-colors',
                    period === p
                      ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300'
                      : 'border-white/10 bg-white/5 text-white/50'
                  )}
                >
                  {PERIOD_LABELS[p]}
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
            </div>
            <div>
              <label className="mb-1.5 block px-1 text-xs font-medium text-white/50">
                End date {period === 'custom' ? '' : '(optional)'}
              </label>
              <input
                type="date"
                {...register('endDate')}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400/60"
              />
            </div>
          </div>
                    {errors.startDate && <p className="px-1 text-sm text-red-400">{errors.startDate.message}</p>}
          {errors.endDate && <p className="px-1 text-sm text-red-400">{errors.endDate.message}</p>}

          <div>
            <label className="mb-1.5 block px-1 text-xs font-medium text-white/50">Notes (optional)</label>
            <textarea
              rows={2}
              placeholder="Anything else worth remembering"
              {...register('notes')}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-emerald-400/60"
            />
            {errors.notes && <p className="mt-1 px-1 text-sm text-red-400">{errors.notes.message}</p>}
          </div>

          {submitError && (
            <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{submitError}</p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || (!isOverall && !selectedCategory)}
              className={cn(
                'w-full rounded-2xl py-4 text-center text-base font-semibold text-black transition-opacity',
                'bg-emerald-400',
                (isSubmitting || (!isOverall && !selectedCategory)) && 'opacity-50'
              )}
            >
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create Budget'}
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
        type="expense"
        title="Choose expense category"
      />
    </>
  )
}
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { BottomSheet } from '@/features/transactions/components/BottomSheet'
import { AmountInput } from '@/features/transactions/components/AmountInput'
import { CategoryIcon } from '@/lib/lucideIcon'
import { cn } from '@/lib/cn'
import { parseAmountInput } from '@/lib/money'
import { toDecimal } from '@/types/money'
import { generateId, goalRepository, getUserMessage } from '@/db'
import { CATEGORY_COLORS } from '@/features/categories/categoryConfig'
import { IconPicker } from '@/features/categories/components/IconPicker'
import { goalFormSchema, goalFormDefaults, type GoalFormValues } from '../goalFormSchema'
import type { Goal } from '@/types/entities'

interface GoalFormSheetProps {
  open: boolean
  onClose: () => void
  goal?: Goal | null
  onSaved: () => void
}

export function GoalFormSheet({ open, onClose, goal, onSaved }: GoalFormSheetProps) {
  const isEdit = !!goal
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: goalFormDefaults(),
  })

  const icon = watch('icon')
  const color = watch('color')
  const targetAmountInput = watch('targetAmountInput')

  useEffect(() => {
    if (!open) return
    if (goal) {
      reset({
        name: goal.name,
        targetAmountInput: String(toDecimal({ amount: goal.targetAmount, currency: goal.currency })),
        targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString().slice(0, 10) : '',
        icon: goal.icon,
        color: goal.color,
        notes: goal.notes,
      })
    } else {
      reset(goalFormDefaults())
    }
    setSubmitError(null)
  }, [open, goal, reset])

  function resetAndClose() {
    setSubmitError(null)
    onClose()
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      const targetAmount = parseAmountInput(values.targetAmountInput, 'BDT')
      if (targetAmount === null) {
        setSubmitError('Enter a valid target amount.')
        return
      }
      let targetDate: number | null = null
      if (values.targetDate) {
        const [y, m, d] = values.targetDate.split('-').map(Number)
        targetDate = new Date(y, (m ?? 1) - 1, d ?? 1, 23, 59).getTime()
      }

      const now = Date.now()
      if (isEdit && goal) {
        const isNowComplete = goal.currentAmount >= targetAmount
        await goalRepository.update(goal.id, {
          name: values.name.trim(),
          targetAmount,
          targetDate,
          icon: values.icon,
          color: values.color,
          notes: values.notes?.trim() || '',
          status: goal.status === 'archived' ? 'archived' : isNowComplete ? 'achieved' : 'active',
        })
      } else {
        const record: Goal = {
          id: generateId(),
          name: values.name.trim(),
          targetAmount,
          currentAmount: 0,
          currency: 'BDT',
          targetDate,
          accountId: null,
          icon: values.icon,
          color: values.color,
          notes: values.notes?.trim() || '',
          status: 'active',
          createdAt: now,
          updatedAt: now,
        }
        await goalRepository.create(record)
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
      <BottomSheet open={open} onClose={resetAndClose} title={isEdit ? 'Edit Goal' : 'Create Goal'}>
        <form onSubmit={onSubmit} className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pb-1 pr-0.5">
          <button
            type="button"
            onClick={() => setIconPickerOpen(true)}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-left"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: `${color}26` }}>
              <CategoryIcon name={icon} size={20} color={color} />
            </span>
            <div>
              <p className="text-sm font-medium text-white">Icon</p>
              <p className="text-xs text-white/40">Tap to change</p>
            </div>
          </button>

          <div>
            <label className="mb-1.5 block px-1 text-xs font-medium text-white/50">Goal name</label>
            <input
              type="text"
              placeholder="e.g. Emergency Fund"
              {...register('name')}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-emerald-400/60"
            />
            {errors.name && <p className="mt-1 px-1 text-sm text-red-400">{errors.name.message}</p>}
          </div>

          <AmountInput
            value={targetAmountInput}
            onChange={(v) => setValue('targetAmountInput', v, { shouldValidate: true })}
            currency="BDT"
            error={errors.targetAmountInput?.message}
          />

          <div>
            <label className="mb-1.5 block px-1 text-xs font-medium text-white/50">Target date (optional)</label>
            <input
              type="date"
              {...register('targetDate')}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400/60"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-white">Color</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue('color', c)}
                  aria-label={`Use color ${c}`}
                  className={cn(
                    'h-8 w-8 rounded-full border-2 transition-transform active:scale-90',
                    color === c ? 'border-white' : 'border-transparent'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block px-1 text-xs font-medium text-white/50">Notes (optional)</label>
            <textarea
              rows={2}
              placeholder="What this goal is for"
              {...register('notes')}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-emerald-400/60"
            />
          </div>

          {submitError && <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{submitError}</p>}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'w-full rounded-2xl py-4 text-center text-base font-semibold text-black transition-opacity',
                'bg-emerald-400',
                isSubmitting && 'opacity-50'
              )}
            >
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create Goal'}
            </button>
          </div>
        </form>
      </BottomSheet>

      <IconPicker open={iconPickerOpen} onClose={() => setIconPickerOpen(false)} value={icon} color={color} onSelect={(name) => setValue('icon', name)} />
    </>
  )
}
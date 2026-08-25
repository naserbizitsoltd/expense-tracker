import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { creditCardRepository, generateId } from '@/db'
import { creditCardFormSchema, type CreditCardFormValues } from '../creditCardSchema'
import {
  CREDIT_CARD_COLORS,
  DEFAULT_CREDIT_CARD_COLOR,
  CREDIT_CARD_ICON_OPTIONS,
  DEFAULT_CREDIT_CARD_ICON,
  getCreditCardIcon,
} from '../creditCardConfig'
import { parseAmountInput, currencySymbol } from '@/lib/money'
import { Button, CurrencyInput, Input, Select, useToast } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { CreditCard } from '@/types/entities'

interface CreditCardFormProps {
  card?: CreditCard
  onDone: () => void
}

const CURRENCY_OPTIONS = [
  { value: 'BDT', label: 'BDT — Bangladeshi Taka' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'INR', label: 'INR — Indian Rupee' },
]

export function CreditCardForm({ card, onDone }: CreditCardFormProps) {
  const { showToast } = useToast()
  const isEdit = !!card
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    control,
    formState: { errors },
  } = useForm<CreditCardFormValues>({
    resolver: zodResolver(creditCardFormSchema),
    defaultValues: {
      name: card?.name ?? '',
      issuer: card?.issuer ?? '',
      last4: card?.last4 ?? '',
      currency: card?.currency ?? 'BDT',
      creditLimitInput: card ? (card.creditLimit / 100).toFixed(2) : '',
      outstandingBalanceInput: card ? (card.outstandingBalance / 100).toFixed(2) : '0.00',
      billingCycleDayInput: card ? String(card.billingCycleDay) : '',
      dueDayInput: card ? String(card.dueDay) : '',
      interestRateInput: card?.interestRate != null ? String(card.interestRate) : '',
      icon: card?.icon ?? DEFAULT_CREDIT_CARD_ICON,
      color: card?.color ?? DEFAULT_CREDIT_CARD_COLOR,
    },
  })

  const icon = watch('icon')
  const color = watch('color')
  const currency = watch('currency')

  async function onSubmit(values: CreditCardFormValues) {
    const creditLimit = parseAmountInput(values.creditLimitInput, values.currency)
    if (creditLimit === null) return

    // New cards always start at 0 outstanding — the field only renders
    // (and is only trusted) once the card already exists, see JSX below.
    const outstandingBalance = isEdit ? parseAmountInput(values.outstandingBalanceInput, values.currency) : 0
    if (outstandingBalance === null) return

    const billingCycleDay = values.billingCycleDayInput ? Number(values.billingCycleDayInput) : 1
    const dueDay = values.dueDayInput ? Number(values.dueDayInput) : 15
    const interestRate = values.interestRateInput ? Number(values.interestRateInput) : null

    // Soft, app-level name check — same pattern as AccountForm. Active
    // cards only, so a name freed up by archiving can be reused.
    const trimmedName = values.name.trim().toLowerCase()
    const activeCards = await creditCardRepository.getActive()
    const nameTaken = activeCards.some((c) => c.id !== card?.id && c.name.trim().toLowerCase() === trimmedName)
    if (nameTaken) {
      setError('name', { type: 'manual', message: 'An active credit card already uses this name' })
      return
    }

    setSubmitting(true)
    try {
      if (isEdit && card) {
        await creditCardRepository.update(card.id, {
          name: values.name,
          issuer: values.issuer,
          last4: values.last4,
          currency: values.currency,
          creditLimit,
          outstandingBalance,
          billingCycleDay,
          dueDay,
          interestRate,
          icon: values.icon,
          color: values.color,
        })
        showToast('Credit card updated', 'success')
      } else {
        const now = Date.now()
        const newCard: CreditCard = {
          id: generateId(),
          name: values.name,
          issuer: values.issuer,
          last4: values.last4,
          creditLimit,
          outstandingBalance: 0,
          currency: values.currency,
          billingCycleDay,
          dueDay,
          interestRate,
          icon: values.icon,
          color: values.color,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        }
        await creditCardRepository.create(newCard)
        showToast('Credit card added', 'success')
      }
      onDone()
    } catch {
      showToast('Could not save the credit card. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pb-1 pr-0.5">
      <Input label="Card name" placeholder="e.g. IBBL Visa" error={errors.name?.message} {...register('name')} />

      <Input label="Provider" placeholder="e.g. Islami Bank Bangladesh" error={errors.issuer?.message} {...register('issuer')} />

      <Input
        label="Last 4 digits"
        placeholder="4521"
        inputMode="numeric"
        maxLength={4}
        error={errors.last4?.message}
        {...register('last4')}
      />

      <Select label="Currency" options={CURRENCY_OPTIONS} {...register('currency')} />

      <Controller
        name="creditLimitInput"
        control={control}
        render={({ field }) => (
          <CurrencyInput
            label="Credit limit"
            currencySymbol={currencySymbol(currency)}
            error={errors.creditLimitInput?.message}
            {...field}
          />
        )}
      />

      {isEdit ? (
        <Controller
          name="outstandingBalanceInput"
          control={control}
          render={({ field }) => (
            <CurrencyInput
              label="Outstanding balance"
              currencySymbol={currencySymbol(currency)}
              error={errors.outstandingBalanceInput?.message}
              {...field}
            />
          )}
        />
      ) : (
        <p className="-mt-3 text-xs text-muted-foreground">A new card always starts with 0 outstanding.</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Billing date (optional)"
          placeholder="1–31"
          inputMode="numeric"
          maxLength={2}
          error={errors.billingCycleDayInput?.message}
          {...register('billingCycleDayInput')}
        />
        <Input
          label="Due date (optional)"
          placeholder="1–31"
          inputMode="numeric"
          maxLength={2}
          error={errors.dueDayInput?.message}
          {...register('dueDayInput')}
        />
      </div>

      <Input
        label="Interest rate % (optional)"
        placeholder="e.g. 2.5"
        inputMode="decimal"
        error={errors.interestRateInput?.message}
        {...register('interestRateInput')}
      />

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-foreground">Icon</p>
        <div className="flex flex-wrap gap-2">
          {CREDIT_CARD_ICON_OPTIONS.map((name) => {
            const IconComp = getCreditCardIcon(name)
            const active = icon === name
            return (
              <button
                key={name}
                type="button"
                onClick={() => setValue('icon', name)}
                aria-label={`Use ${name} icon`}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border transition-colors',
                  active ? 'border-primary bg-primary-muted text-primary' : 'border-border bg-surface-elevated text-muted-foreground'
                )}
              >
                <IconComp className="h-[18px] w-[18px]" />
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-foreground">Color</p>
        <div className="flex flex-wrap gap-2">
          {CREDIT_CARD_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setValue('color', c)}
              aria-label={`Use color ${c}`}
              className={cn(
                'h-8 w-8 rounded-full border-2 transition-transform active:scale-90',
                color === c ? 'border-foreground' : 'border-transparent'
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <Button type="submit" size="lg" disabled={submitting} className="w-full">
        {submitting ? 'Saving...' : isEdit ? 'Save changes' : 'Add credit card'}
      </Button>
    </form>
  )
}
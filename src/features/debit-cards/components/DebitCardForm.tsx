import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { debitCardRepository, generateId } from '@/db'
import { useActiveAccounts } from '@/features/transactions/useTransactions'
import { debitCardFormSchema, type DebitCardFormValues } from '../debitCardSchema'
import {
  DEBIT_CARD_COLORS,
  DEFAULT_DEBIT_CARD_COLOR,
  DEBIT_CARD_ICON_OPTIONS,
  DEFAULT_DEBIT_CARD_ICON,
  getDebitCardIcon,
  EXPIRY_MONTH_OPTIONS,
  expiryYearOptions,
} from '../debitCardConfig'
import { Button, Input, Select, useToast } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { DebitCard } from '@/types/entities'

interface DebitCardFormProps {
  card?: DebitCard
  onDone: () => void
}

export function DebitCardForm({ card, onDone }: DebitCardFormProps) {
  const { showToast } = useToast()
  const { accounts } = useActiveAccounts()
  const isEdit = !!card
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<DebitCardFormValues>({
    resolver: zodResolver(debitCardFormSchema),
    defaultValues: {
      name: card?.name ?? '',
      provider: card?.provider ?? '',
      last4: card?.last4 ?? '',
      accountId: card?.accountId ?? '',
      expiryMonth: card?.expiryMonth ? String(card.expiryMonth) : '',
      expiryYear: card?.expiryYear ? String(card.expiryYear) : '',
      icon: card?.icon ?? DEFAULT_DEBIT_CARD_ICON,
      color: card?.color ?? DEFAULT_DEBIT_CARD_COLOR,
    },
  })

  const icon = watch('icon')
  const color = watch('color')

  const accountOptions = [
    { value: '', label: accounts.length ? 'Choose an account' : 'No active accounts — add one first' },
    ...accounts.map((a) => ({ value: a.id, label: `${a.name}${a.provider ? ` — ${a.provider}` : ''}` })),
  ]

  async function onSubmit(values: DebitCardFormValues) {
    const trimmedName = values.name.trim().toLowerCase()
    const activeCards = await debitCardRepository.getActive()
    const nameTaken = activeCards.some((c) => c.id !== card?.id && c.name.trim().toLowerCase() === trimmedName)
    if (nameTaken) {
      setError('name', { type: 'manual', message: 'An active debit card already uses this name' })
      return
    }

    const expiryMonth = values.expiryMonth ? Number(values.expiryMonth) : null
    const expiryYear = values.expiryYear ? Number(values.expiryYear) : null

    setSubmitting(true)
    try {
      if (isEdit && card) {
        await debitCardRepository.update(card.id, {
          name: values.name,
          provider: values.provider,
          last4: values.last4,
          accountId: values.accountId,
          expiryMonth,
          expiryYear,
          icon: values.icon,
          color: values.color,
        })
        showToast('Debit card updated', 'success')
      } else {
        const now = Date.now()
        const newCard: DebitCard = {
          id: generateId(),
          name: values.name,
          provider: values.provider,
          last4: values.last4,
          accountId: values.accountId,
          expiryMonth,
          expiryYear,
          icon: values.icon,
          color: values.color,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        }
        await debitCardRepository.create(newCard)
        showToast('Debit card added', 'success')
      }
      onDone()
    } catch {
      showToast('Could not save the debit card. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pb-1 pr-0.5">
      <Input label="Card name" placeholder="e.g. IBBL Visa" error={errors.name?.message} {...register('name')} />

      <Input label="Provider" placeholder="e.g. Islami Bank Bangladesh" error={errors.provider?.message} {...register('provider')} />

      <Input
        label="Last 4 digits"
        placeholder="4521"
        inputMode="numeric"
        maxLength={4}
        error={errors.last4?.message}
        {...register('last4')}
      />

      <div className="flex flex-col gap-1.5">
        <Select label="Linked account" options={accountOptions} {...register('accountId')} />
        {errors.accountId && <p className="text-xs text-danger">{errors.accountId.message}</p>}
        <p className="text-xs text-muted-foreground">
          The card's balance always comes from this account — it never has its own.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Expiry month (optional)"
          options={[{ value: '', label: '—' }, ...EXPIRY_MONTH_OPTIONS]}
          {...register('expiryMonth')}
        />
        <Select
          label="Expiry year (optional)"
          options={[{ value: '', label: '—' }, ...expiryYearOptions()]}
          {...register('expiryYear')}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-foreground">Icon</p>
        <div className="flex flex-wrap gap-2">
          {DEBIT_CARD_ICON_OPTIONS.map((name) => {
            const IconComp = getDebitCardIcon(name)
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
          {DEBIT_CARD_COLORS.map((c) => (
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

      <Button type="submit" size="lg" disabled={submitting || !accounts.length} className="w-full">
        {submitting ? 'Saving...' : isEdit ? 'Save changes' : 'Add debit card'}
      </Button>
    </form>
  )
}
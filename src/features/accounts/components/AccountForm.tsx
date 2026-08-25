import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { accountRepository, generateId } from '@/db'
import { accountFormSchema, type AccountFormValues } from '../accountSchema'
import { ACCOUNT_TYPE_PRESETS, getAccountIcon } from '../accountConfig'
import { parseAmountInput, currencySymbol } from '@/lib/money'
import { Button, CurrencyInput, Input, Select, useToast } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { Account } from '@/types/entities'

interface AccountFormProps {
  account?: Account
  onDone: () => void
  // Whether this account already has ledger history. When true, the
  // currency field is locked so past transaction amounts stay accurate —
  // mirrors the existing opening-balance lock below.
  hasTransactions?: boolean
}

function presetKeyForAccount(account?: Account): string {
  if (!account) return ACCOUNT_TYPE_PRESETS[0].key
  const match = ACCOUNT_TYPE_PRESETS.find(
    (p) => p.type === account.type && (p.defaultProvider === '' || p.defaultProvider === account.provider)
  )
  return match?.key ?? ACCOUNT_TYPE_PRESETS[0].key
}

const CURRENCY_OPTIONS = [
  { value: 'BDT', label: 'BDT — Bangladeshi Taka' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'INR', label: 'INR — Indian Rupee' },
]

export function AccountForm({ account, onDone, hasTransactions = false }: AccountFormProps) {
  const { showToast } = useToast()
  const isEdit = !!account
  const lockCurrency = isEdit && hasTransactions
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    control, // <--- Change 1: Destructure control
    formState: { errors },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: account?.name ?? '',
      presetKey: presetKeyForAccount(account),
      provider: account?.provider ?? '',
      currency: account?.currency ?? 'BDT',
      openingBalanceInput: account ? (account.openingBalance / 100).toFixed(2) : '',
      accountNumber: account?.accountNumber ?? '',
      notes: account?.notes ?? '',
      icon: account?.icon ?? ACCOUNT_TYPE_PRESETS[0].defaultIcon,
      color: account?.color ?? ACCOUNT_TYPE_PRESETS[0].defaultColor,
    },
  })

  const presetKey = watch('presetKey')
  const color = watch('color')
  const currency = watch('currency')

  function selectPreset(key: string) {
    const preset = ACCOUNT_TYPE_PRESETS.find((p) => p.key === key)
    if (!preset) return
    setValue('presetKey', key)
    setValue('icon', preset.defaultIcon)
    setValue('color', preset.defaultColor)
    if (!isEdit && preset.defaultProvider) {
      setValue('provider', preset.defaultProvider)
    }
  }

    async function onSubmit(values: AccountFormValues) {
    const preset = ACCOUNT_TYPE_PRESETS.find((p) => p.key === values.presetKey) ?? ACCOUNT_TYPE_PRESETS[0]
    const openingBalance = parseAmountInput(values.openingBalanceInput, values.currency)
    if (openingBalance === null) return

    // Existing architecture has no unique index on account name, so this
    // is a soft, app-level check rather than a schema change — active
    // accounts only, so a name freed up by archiving can be reused.
    const trimmedName = values.name.trim().toLowerCase()
    const activeAccounts = await accountRepository.getActive()
    const nameTaken = activeAccounts.some(
      (a) => a.id !== account?.id && a.name.trim().toLowerCase() === trimmedName
    )
    if (nameTaken) {
      setError('name', { type: 'manual', message: 'An active account already uses this name' })
      return
    }

    setSubmitting(true)
    try {
      if (isEdit && account) {
        await accountRepository.update(account.id, {
          name: values.name,
          type: preset.type,
          provider: values.provider || null,
          currency: values.currency,
          icon: values.icon,
          color: values.color,
          accountNumber: values.accountNumber || null,
          notes: values.notes || null,
        })
        showToast('Account updated', 'success')
      } else {
        const now = Date.now()
        const newAccount: Account = {
          id: generateId(),
          name: values.name,
          type: preset.type,
          provider: values.provider || null,
          currency: values.currency,
          openingBalance,
          balance: openingBalance,
          icon: values.icon,
          color: values.color,
          isArchived: false,
          accountNumber: values.accountNumber || null,
          notes: values.notes || null,
          createdAt: now,
          updatedAt: now,
        }
        await accountRepository.create(newAccount)
        showToast('Account created', 'success')
      }
      onDone()
    } catch {
      showToast('Could not save the account. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pb-1 pr-0.5">
      <div className="grid grid-cols-4 gap-2.5">
        {ACCOUNT_TYPE_PRESETS.map((preset) => {
          const Icon = getAccountIcon(preset.defaultIcon)
          const active = presetKey === preset.key
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => selectPreset(preset.key)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center transition-all duration-150 active:scale-95',
                active ? 'border-primary bg-primary-muted' : 'border-border bg-surface-elevated hover:border-primary/40'
              )}
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: `${preset.defaultColor}20`, color: preset.defaultColor }}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="text-[11px] font-medium leading-tight text-foreground">{preset.label}</span>
            </button>
          )
        })}
      </div>

      <Input label="Account name" placeholder="e.g. Main Savings" error={errors.name?.message} {...register('name')} />

      <Input
        label="Provider / institution (optional)"
        placeholder="e.g. Dutch-Bangla Bank"
        error={errors.provider?.message}
        {...register('provider')}
      />

            <Select label="Currency" options={CURRENCY_OPTIONS} disabled={lockCurrency} {...register('currency')} />
      {lockCurrency && (
        <p className="-mt-3 text-xs text-muted-foreground">
          Currency can't be changed once this account has transactions, so past amounts stay accurate.
        </p>
      )}

      <Controller
        name="openingBalanceInput"
        control={control} // <--- Change 2: Pass control to the Controller
        render={({ field }) => (
          <CurrencyInput
            label="Opening balance"
            currencySymbol={currencySymbol(currency)}
            error={errors.openingBalanceInput?.message}
            disabled={isEdit}
            {...field}
          />
        )}
      />
      {isEdit && (
        <p className="-mt-3 text-xs text-muted-foreground">
          Opening balance can't be changed once transactions may depend on it.
        </p>
      )}

      <Input
        label="Account number / nickname (optional)"
        placeholder="e.g. ****1234"
        error={errors.accountNumber?.message}
        {...register('accountNumber')}
      />

      <Input label="Notes (optional)" placeholder="Anything worth remembering" error={errors.notes?.message} {...register('notes')} />

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-foreground">Color</p>
        <div className="flex flex-wrap gap-2">
          {['#22c55e', '#4f7fff', '#f59e0b', '#e2136e', '#8c3494', '#6366f1', '#f97316', '#64748b'].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setValue('color', c)}
              aria-label={`Use color ${c}`}
              className={cn('h-8 w-8 rounded-full border-2 transition-transform active:scale-90', color === c ? 'border-foreground' : 'border-transparent')}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <Button type="submit" size="lg" disabled={submitting} className="w-full">
        {submitting ? 'Saving...' : isEdit ? 'Save changes' : 'Add account'}
      </Button>
    </form>
  )
}
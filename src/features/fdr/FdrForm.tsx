import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronRight } from 'lucide-react'
import { addMonths } from 'date-fns'
import { fdrFormSchema, fdrFormDefaults, type FdrFormValues } from './fdrFormSchema'
import { FDR_TENURE_OPTIONS } from './fdrConfig'
import { AccountSelectSheet } from '@/features/transactions/components/AccountSelectSheet'
import { CategoryIcon } from '@/lib/lucideIcon'
import { parseAmountInput, currencySymbol } from '@/lib/money'
import { createFdr } from '@/services/fdrService'
import { getUserMessage } from '@/db'
import { Button, CurrencyInput, Input, Select, useToast } from '@/components/ui'
import type { Account } from '@/types/entities'
import type { CurrencyCode } from '@/types/money'

interface FdrFormProps {
  onDone: () => void
}

export function FdrForm({ onDone }: FdrFormProps) {
  const { showToast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [accountSheetOpen, setAccountSheetOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<FdrFormValues>({
    resolver: zodResolver(fdrFormSchema),
    defaultValues: fdrFormDefaults(),
  })

  const currency: CurrencyCode = selectedAccount?.currency ?? 'BDT'
  const startDate = watch('startDate')
  const tenurePreset = watch('tenurePreset')
  const tenureMonthsInput = watch('tenureMonthsInput')
  const isCustomTenure = tenurePreset === 'custom'

  function autoFillMaturity(months: string) {
    if (!startDate || !months) return
    const m = Number(months)
    if (!Number.isInteger(m) || m <= 0) return
    const [y, mo, d] = startDate.split('-').map(Number)
    const start = new Date(y, (mo ?? 1) - 1, d ?? 1)
    setValue('maturityDate', addMonths(start, m).toISOString().slice(0, 10))
  }

  function onTenurePresetChange(value: string) {
    setValue('tenurePreset', value)
    if (value !== 'custom') {
      setValue('tenureMonthsInput', value)
      autoFillMaturity(value)
    }
  }

  async function onSubmit(values: FdrFormValues) {
    if (!selectedAccount) return
    const principal = parseAmountInput(values.principalInput, selectedAccount.currency)
    if (principal === null) return
    const tenureMonths = Number(values.tenureMonthsInput)

    const [sy, sm, sd] = values.startDate.split('-').map(Number)
    const startDateMs = new Date(sy, (sm ?? 1) - 1, sd ?? 1, 12, 0).getTime()

    let maturityDateMs: number | null = null
    if (values.maturityDate) {
      const [my, mm, md] = values.maturityDate.split('-').map(Number)
      maturityDateMs = new Date(my, (mm ?? 1) - 1, md ?? 1, 23, 59).getTime()
    }

    const interestRate = values.interestRateInput ? Number(values.interestRateInput) : null
    const maturityAmount = values.maturityAmountInput
      ? parseAmountInput(values.maturityAmountInput, selectedAccount.currency)
      : null

    setSubmitting(true)
    try {
      await createFdr({
        name: values.name,
        institution: values.institution,
        referenceNumber: values.referenceNumber || null,
        accountId: selectedAccount.id,
        principal,
        currency: selectedAccount.currency,
        interestRate,
        tenureMonths,
        startDate: startDateMs,
        maturityDate: maturityDateMs,
        maturityAmount,
        notes: values.notes,
      })
      showToast('FDR created', 'success')
      onDone()
    } catch (error) {
      showToast(getUserMessage(error), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pb-1 pr-0.5">
      <Input label="FDR name" placeholder="e.g. EBL FDR" error={errors.name?.message} {...register('name')} />

      <Input label="Bank / provider" placeholder="e.g. Eastern Bank" error={errors.institution?.message} {...register('institution')} />

      <Input
        label="Reference / account number (optional)"
        placeholder="e.g. ****7788"
        error={errors.referenceNumber?.message}
        {...register('referenceNumber')}
      />

      <Controller
        name="principalInput"
        control={control}
        render={({ field }) => (
          <CurrencyInput
            label="Principal"
            currencySymbol={currencySymbol(currency)}
            error={errors.principalInput?.message}
            {...field}
          />
        )}
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Source account</label>
        <button
          type="button"
          onClick={() => setAccountSheetOpen(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-elevated px-3.5 py-3 text-left"
        >
          {selectedAccount ? (
            <>
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ backgroundColor: `${selectedAccount.color}26` }}
              >
                <CategoryIcon name={selectedAccount.icon} size={15} color={selectedAccount.color} />
              </span>
              <span className="text-sm font-medium text-foreground">{selectedAccount.name}</span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">Select account</span>
          )}
          <ChevronRight size={16} className="ml-auto text-muted-foreground" />
        </button>
        {errors.accountId && <p className="mt-1.5 text-xs text-danger">{errors.accountId.message}</p>}
      </div>

      <Select
        label="Tenure"
        value={tenurePreset}
        onChange={(e) => onTenurePresetChange(e.target.value)}
        options={FDR_TENURE_OPTIONS.map((o: { label: string; months: number | 'custom' }) => ({ value: String(o.months), label: o.label }))}
      />

      {isCustomTenure && (
        <Input
          label="Number of months"
          placeholder="e.g. 18"
          inputMode="numeric"
          error={errors.tenureMonthsInput?.message}
          {...register('tenureMonthsInput', { onBlur: () => autoFillMaturity(tenureMonthsInput) })}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Start date</label>
          <input
            type="date"
            {...register('startDate', { onBlur: () => autoFillMaturity(tenureMonthsInput) })}
            className="h-12 w-full rounded-xl border border-border bg-surface-elevated px-3.5 text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          {errors.startDate && <p className="mt-1.5 text-xs text-danger">{errors.startDate.message}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Maturity date</label>
          <input
            type="date"
            {...register('maturityDate')}
            className="h-12 w-full rounded-xl border border-border bg-surface-elevated px-3.5 text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
      </div>

      <Input
        label="Interest / profit rate % (optional)"
        placeholder="e.g. 7.5"
        inputMode="decimal"
        error={errors.interestRateInput?.message}
        {...register('interestRateInput')}
      />

      <Controller
        name="maturityAmountInput"
        control={control}
        render={({ field }) => (
          <CurrencyInput
            label="Maturity amount (optional, if known)"
            currencySymbol={currencySymbol(currency)}
            error={errors.maturityAmountInput?.message}
            {...field}
          />
        )}
      />

      <Input label="Notes (optional)" placeholder="Anything worth remembering" error={errors.notes?.message} {...register('notes')} />

      <Button type="submit" size="lg" disabled={submitting || !selectedAccount} className="w-full">
        {submitting ? 'Saving...' : 'Create FDR'}
      </Button>

      <AccountSelectSheet
        open={accountSheetOpen}
        onClose={() => setAccountSheetOpen(false)}
        onSelect={(account) => {
          setSelectedAccount(account)
          setValue('accountId', account.id, { shouldValidate: true })
        }}
        title="Source account"
      />
    </form>
  )
}
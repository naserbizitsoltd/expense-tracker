import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronRight } from 'lucide-react'
import { addMonths } from 'date-fns'
import { dpsFormSchema, dpsFormDefaults, type DpsFormValues } from '../dpsFormSchema'
import { AccountSelectSheet } from '@/features/transactions/components/AccountSelectSheet'
import { CategoryIcon } from '@/lib/lucideIcon'
import { parseAmountInput, currencySymbol } from '@/lib/money'
import { createDps } from '@/services/dpsService'
import { getUserMessage } from '@/db'
import { Button, CurrencyInput, Input, useToast } from '@/components/ui'
import type { Account } from '@/types/entities'
import type { CurrencyCode } from '@/types/money'

interface DpsFormProps {
  onDone: () => void
}

export function DpsForm({ onDone }: DpsFormProps) {
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
  } = useForm<DpsFormValues>({
    resolver: zodResolver(dpsFormSchema),
    defaultValues: dpsFormDefaults(),
  })

  const currency: CurrencyCode = selectedAccount?.currency ?? 'BDT'
  const startDate = watch('startDate')
  const tenureMonthsInput = watch('tenureMonthsInput')

  // Auto-fills maturity date from start date + installment count, but
  // only while the user hasn't typed their own — matches the "remains
  // editable" spirit used elsewhere (e.g. presetKey selection in AccountForm).
  function autoFillMaturity() {
    if (!startDate || !tenureMonthsInput) return
    const months = Number(tenureMonthsInput)
    if (!Number.isInteger(months) || months <= 0) return
    const [y, m, d] = startDate.split('-').map(Number)
    const start = new Date(y, (m ?? 1) - 1, d ?? 1)
    setValue('maturityDate', addMonths(start, months).toISOString().slice(0, 10))
  }

  async function onSubmit(values: DpsFormValues) {
    if (!selectedAccount) return
    const monthlyInstallment = parseAmountInput(values.monthlyInstallmentInput, selectedAccount.currency)
    if (monthlyInstallment === null) return
    const tenureMonths = Number(values.tenureMonthsInput)

    const [sy, sm, sd] = values.startDate.split('-').map(Number)
    const startDateMs = new Date(sy, (sm ?? 1) - 1, sd ?? 1, 12, 0).getTime()

    let maturityDateMs: number | null = null
    if (values.maturityDate) {
      const [my, mm, md] = values.maturityDate.split('-').map(Number)
      maturityDateMs = new Date(my, (mm ?? 1) - 1, md ?? 1, 23, 59).getTime()
    }

    const interestRate = values.interestRateInput ? Number(values.interestRateInput) : null

    setSubmitting(true)
    try {
      await createDps({
        name: values.name,
        institution: values.institution,
        referenceNumber: values.referenceNumber || null,
        accountId: selectedAccount.id,
        monthlyInstallment,
        currency: selectedAccount.currency,
        interestRate,
        tenureMonths,
        startDate: startDateMs,
        maturityDate: maturityDateMs,
        notes: values.notes,
      })
      showToast('DPS created', 'success')
      onDone()
    } catch (error) {
      showToast(getUserMessage(error), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pb-1 pr-0.5">
      <Input label="DPS name" placeholder="e.g. DBBL DPS" error={errors.name?.message} {...register('name')} />

      <Input label="Bank / provider" placeholder="e.g. Dutch-Bangla Bank" error={errors.institution?.message} {...register('institution')} />

      <Input
        label="Reference / account number (optional)"
        placeholder="e.g. ****4521"
        error={errors.referenceNumber?.message}
        {...register('referenceNumber')}
      />

      <Controller
        name="monthlyInstallmentInput"
        control={control}
        render={({ field }) => (
          <CurrencyInput
            label="Monthly installment"
            currencySymbol={currencySymbol(currency)}
            error={errors.monthlyInstallmentInput?.message}
            {...field}
          />
        )}
      />

      <Input
        label="Number of installments"
        placeholder="e.g. 60"
        inputMode="numeric"
        error={errors.tenureMonthsInput?.message}
        {...register('tenureMonthsInput', { onBlur: autoFillMaturity })}
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Linked account</label>
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Start date</label>
          <input
            type="date"
            {...register('startDate', { onBlur: autoFillMaturity })}
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
        placeholder="e.g. 6.5"
        inputMode="decimal"
        error={errors.interestRateInput?.message}
        {...register('interestRateInput')}
      />

      <Input label="Notes (optional)" placeholder="Anything worth remembering" error={errors.notes?.message} {...register('notes')} />

      <Button type="submit" size="lg" disabled={submitting || !selectedAccount} className="w-full">
        {submitting ? 'Saving...' : 'Create DPS'}
      </Button>

      <AccountSelectSheet
        open={accountSheetOpen}
        onClose={() => setAccountSheetOpen(false)}
        onSelect={(account) => {
          setSelectedAccount(account)
          setValue('accountId', account.id, { shouldValidate: true })
        }}
        title="Linked account"
      />
    </form>
  )
}
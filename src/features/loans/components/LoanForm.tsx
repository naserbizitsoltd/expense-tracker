import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronRight } from 'lucide-react'
import { loanFormSchema, loanFormDefaults, type LoanFormValues } from '../loanFormSchema'
import { loanAccountLabel } from '../loanConfig'
import { AccountSelectSheet } from '@/features/transactions/components/AccountSelectSheet'
import { CategoryIcon } from '@/lib/lucideIcon'
import { parseAmountInput, currencySymbol } from '@/lib/money'
import { disburseLoan } from '@/services/loanService'
import { getUserMessage } from '@/db'
import { Button, CurrencyInput, Input, useToast } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { Account } from '@/types/entities'
import type { CurrencyCode } from '@/types/money'
interface LoanFormProps {
  initialDirection?: 'given' | 'taken'
  onDone: () => void
}

export function LoanForm({ initialDirection = 'taken', onDone }: LoanFormProps) {
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
  } = useForm<LoanFormValues>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: loanFormDefaults(initialDirection),
  })

  const direction = watch('direction')
    const currency: CurrencyCode = selectedAccount?.currency ?? 'BDT'

  async function onSubmit(values: LoanFormValues) {
    if (!selectedAccount) return
    const principal = parseAmountInput(values.principalInput, selectedAccount.currency)
    if (principal === null) return

    const [sy, sm, sd] = values.startDate.split('-').map(Number)
    const startDate = new Date(sy, (sm ?? 1) - 1, sd ?? 1, 12, 0).getTime()

    let dueDate: number | null = null
    if (values.dueDate) {
      const [dy, dm, dd] = values.dueDate.split('-').map(Number)
      dueDate = new Date(dy, (dm ?? 1) - 1, dd ?? 1, 23, 59).getTime()
    }

    const interestRate = values.interestRateInput ? Number(values.interestRateInput) : null

    setSubmitting(true)
    try {
      await disburseLoan({
        direction: values.direction,
        counterpartyName: values.counterpartyName,
        principal,
                currency: selectedAccount.currency,
        accountId: selectedAccount.id,
        interestRate,
        startDate,
        dueDate,
        notes: values.notes,
      })
      showToast(values.direction === 'taken' ? 'Loan received' : 'Loan given', 'success')
      onDone()
    } catch (error) {
      showToast(getUserMessage(error), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pb-1 pr-0.5">
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setValue('direction', 'taken')}
          className={cn(
            'flex flex-col items-center gap-1 rounded-2xl border px-3 py-3 text-center transition-all duration-150 active:scale-95',
            direction === 'taken' ? 'border-primary bg-primary-muted' : 'border-border bg-surface-elevated'
          )}
        >
          <span className="text-sm font-semibold text-foreground">Borrowed</span>
          <span className="text-[11px] text-muted-foreground">Money you owe</span>
        </button>
        <button
          type="button"
          onClick={() => setValue('direction', 'given')}
          className={cn(
            'flex flex-col items-center gap-1 rounded-2xl border px-3 py-3 text-center transition-all duration-150 active:scale-95',
            direction === 'given' ? 'border-primary bg-primary-muted' : 'border-border bg-surface-elevated'
          )}
        >
          <span className="text-sm font-semibold text-foreground">Lent</span>
          <span className="text-[11px] text-muted-foreground">Money owed to you</span>
        </button>
      </div>

      <Input
        label={direction === 'taken' ? 'Lender name / institution' : 'Borrower name'}
        placeholder={direction === 'taken' ? 'e.g. IBBL, or a person' : 'e.g. Rahim'}
        error={errors.counterpartyName?.message}
        {...register('counterpartyName')}
      />

      <Controller
        name="principalInput"
        control={control}
        render={({ field }) => (
          <CurrencyInput
            label="Principal amount"
            currencySymbol={currencySymbol(currency)}
            error={errors.principalInput?.message}
            {...field}
          />
        )}
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {loanAccountLabel(direction, 'disburse')}
        </label>
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
            {...register('startDate')}
            className="h-12 w-full rounded-xl border border-border bg-surface-elevated px-3.5 text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          {errors.startDate && <p className="mt-1.5 text-xs text-danger">{errors.startDate.message}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Due date (optional)</label>
          <input
            type="date"
            {...register('dueDate')}
            className="h-12 w-full rounded-xl border border-border bg-surface-elevated px-3.5 text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
      </div>

      <Input
        label="Interest rate % (optional)"
        placeholder="e.g. 5.5"
        inputMode="decimal"
        error={errors.interestRateInput?.message}
        {...register('interestRateInput')}
      />

      <Input label="Notes (optional)" placeholder="Anything worth remembering" error={errors.notes?.message} {...register('notes')} />

      <Button type="submit" size="lg" disabled={submitting || !selectedAccount} className="w-full">
        {submitting ? 'Saving...' : direction === 'taken' ? 'Record borrowed loan' : 'Record lent loan'}
      </Button>

      <AccountSelectSheet
        open={accountSheetOpen}
        onClose={() => setAccountSheetOpen(false)}
        onSelect={(account) => {
          setSelectedAccount(account)
          setValue('accountId', account.id, { shouldValidate: true })
        }}
        title={loanAccountLabel(direction, 'disburse')}
      />
    </form>
  )
}
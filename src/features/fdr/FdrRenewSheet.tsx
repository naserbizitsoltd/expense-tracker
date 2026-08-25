import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { addMonths } from 'date-fns'
import { BottomSheet } from '@/features/transactions/components/BottomSheet'
import { AmountInput } from '@/features/transactions/components/AmountInput'
import { AccountSelectSheet } from '@/features/transactions/components/AccountSelectSheet'
import { CategoryIcon } from '@/lib/lucideIcon'
import { formatAmount, parseAmountInput, currencySymbol } from '@/lib/money'
import { getFdrMaturitySummary, renewFdr } from '@/services/fdrService'
import { FDR_TENURE_OPTIONS } from './fdrConfig'
import { getUserMessage } from '@/db'
import { Button, Input, Select, CurrencyInput, useToast } from '@/components/ui'
import type { Account, Fdr } from '@/types/entities'

interface FdrRenewSheetProps {
  open: boolean
  onClose: () => void
  fdr: Fdr
  onRenewed: () => void
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10)
}

export function FdrRenewSheet({ open, onClose, fdr, onRenewed }: FdrRenewSheetProps) {
  const { showToast } = useToast()
  const summary = getFdrMaturitySummary(fdr)

  const [accountSheetOpen, setAccountSheetOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [profitInput, setProfitInput] = useState('0.00')
  const [renewalInput, setRenewalInput] = useState('0.00')
  const [name, setName] = useState('')
  const [institution, setInstitution] = useState(fdr.institution)
  const [referenceNumber, setReferenceNumber] = useState('')
  const [interestRateInput, setInterestRateInput] = useState('')
  const [tenurePreset, setTenurePreset] = useState(String(fdr.tenureMonths))
  const [tenureMonthsInput, setTenureMonthsInput] = useState(String(fdr.tenureMonths))
  const [startDate, setStartDate] = useState(todayInputValue())
  const [maturityDate, setMaturityDate] = useState('')
  const [maturityAmountInput, setMaturityAmountInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCustomTenure = tenurePreset === 'custom'

  useEffect(() => {
    if (!open) return
    setSelectedAccount(null)
    const defaultProfit = summary.profitAmount !== null ? Math.max(0, summary.profitAmount) : 0
    const maturedTotal = fdr.principal + defaultProfit
    setProfitInput((defaultProfit / 100).toFixed(2))
    setRenewalInput((maturedTotal / 100).toFixed(2))
    setName(`${fdr.name} (Renewed)`)
    setInstitution(fdr.institution)
    setReferenceNumber('')
    setInterestRateInput(fdr.interestRate != null ? String(fdr.interestRate) : '')
    setTenurePreset(String(fdr.tenureMonths))
    setTenureMonthsInput(String(fdr.tenureMonths))
    const start = todayInputValue()
    setStartDate(start)
    setMaturityAmountInput('')
    const m = fdr.tenureMonths
    if (Number.isInteger(m) && m > 0) {
      const [y, mo, d] = start.split('-').map(Number)
      const s = new Date(y, (mo ?? 1) - 1, d ?? 1)
      setMaturityDate(addMonths(s, m).toISOString().slice(0, 10))
    } else {
      setMaturityDate('')
    }
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fdr.id])

  function autoFillMaturity(startVal: string, months: string) {
    if (!startVal || !months) return
    const m = Number(months)
    if (!Number.isInteger(m) || m <= 0) return
    const [y, mo, d] = startVal.split('-').map(Number)
    const start = new Date(y, (mo ?? 1) - 1, d ?? 1)
    setMaturityDate(addMonths(start, m).toISOString().slice(0, 10))
  }

  function onTenurePresetChange(value: string) {
    setTenurePreset(value)
    if (value !== 'custom') {
      setTenureMonthsInput(value)
      autoFillMaturity(startDate, value)
    }
  }

  const profitAmount = parseAmountInput(profitInput || '0', fdr.currency) ?? 0
  const renewalAmount = parseAmountInput(renewalInput || '0', fdr.currency)
  const maturedAmountNow = fdr.principal + profitAmount
  const receivedRemainder = renewalAmount !== null ? maturedAmountNow - renewalAmount : null

  async function onSubmit() {
    setError(null)
    if (!selectedAccount) {
      setError('Select the account the matured funds move through.')
      return
    }
    if (renewalAmount === null || renewalAmount <= 0) {
      setError('Enter a valid renewal amount.')
      return
    }
    if (renewalAmount > maturedAmountNow) {
      setError('Renewal amount cannot exceed the matured amount.')
      return
    }
    if (!name.trim() || !institution.trim()) {
      setError('FDR name and bank/provider are required.')
      return
    }
    const tenureMonths = Number(tenureMonthsInput)
    if (!Number.isInteger(tenureMonths) || tenureMonths <= 0) {
      setError('Enter a valid tenure.')
      return
    }

    const [sy, sm, sd] = startDate.split('-').map(Number)
    const startDateMs = new Date(sy, (sm ?? 1) - 1, sd ?? 1, 12, 0).getTime()
    let maturityDateMs: number | null = null
    if (maturityDate) {
      const [my, mm, md] = maturityDate.split('-').map(Number)
      maturityDateMs = new Date(my, (mm ?? 1) - 1, md ?? 1, 23, 59).getTime()
    }
    const interestRate = interestRateInput ? Number(interestRateInput) : null
    const maturityAmount = maturityAmountInput ? parseAmountInput(maturityAmountInput, fdr.currency) : null

    setSubmitting(true)
    try {
      await renewFdr({
        oldFdrId: fdr.id,
        profitAmount,
        renewalAmount,
        accountId: selectedAccount.id,
        newFdr: {
          name,
          institution,
          referenceNumber: referenceNumber || null,
          interestRate,
          tenureMonths,
          startDate: startDateMs,
          maturityDate: maturityDateMs,
          maturityAmount,
          notes: '',
        },
      })
      showToast('FDR renewed', 'success')
      onRenewed()
    } catch (err) {
      setError(getUserMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="Renew / Rollover">
        <div className="flex max-h-[75vh] flex-col gap-5 overflow-y-auto pb-1 pr-0.5">
          <div className="rounded-2xl border border-border bg-surface-elevated px-4 py-3.5">
            <p className="text-xs text-muted-foreground">Maturing FDR</p>
            <p className="text-sm font-medium text-foreground">{fdr.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">Principal</p>
            <p className="text-base font-semibold tabular-nums text-foreground">{formatAmount(fdr.principal, fdr.currency)}</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Profit / interest at maturity</label>
            <AmountInput value={profitInput} onChange={setProfitInput} currency={fdr.currency} />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Matured amount: {formatAmount(maturedAmountNow, fdr.currency)}
            </p>
          </div>

          <Input
            label="Renewal amount (new FDR principal)"
            value={renewalInput}
            onChange={(e) => setRenewalInput(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
          />
          {receivedRemainder !== null && receivedRemainder > 0 && (
            <p className="-mt-3 text-xs text-muted-foreground">
              {formatAmount(receivedRemainder, fdr.currency)} will remain available in the account.
            </p>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Account</label>
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
          </div>

          <Input label="New FDR name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Bank / provider" value={institution} onChange={(e) => setInstitution(e.target.value)} />
          <Input
            label="Reference / account number (optional)"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
          />

          <Select
            label="Tenure"
            value={tenurePreset}
            onChange={(e) => onTenurePresetChange(e.target.value)}
            options={FDR_TENURE_OPTIONS.map((o: { label: string; months: number | 'custom' }) => ({
              value: String(o.months),
              label: o.label,
            }))}
          />
          {isCustomTenure && (
            <Input
              label="Number of months"
              inputMode="numeric"
              value={tenureMonthsInput}
              onChange={(e) => setTenureMonthsInput(e.target.value)}
              onBlur={() => autoFillMaturity(startDate, tenureMonthsInput)}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                onBlur={() => autoFillMaturity(startDate, tenureMonthsInput)}
                className="h-12 w-full rounded-xl border border-border bg-surface-elevated px-3.5 text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Maturity date</label>
              <input
                type="date"
                value={maturityDate}
                onChange={(e) => setMaturityDate(e.target.value)}
                className="h-12 w-full rounded-xl border border-border bg-surface-elevated px-3.5 text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
          </div>

          <Input
            label="Interest / profit rate % (optional)"
            inputMode="decimal"
            value={interestRateInput}
            onChange={(e) => setInterestRateInput(e.target.value)}
          />

          <CurrencyInput
            label="New maturity amount (optional, if known)"
            currencySymbol={currencySymbol(fdr.currency)}
            value={maturityAmountInput}
            onChange={(e) => setMaturityAmountInput(e.target.value)}
          />

          {error && <p className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</p>}

          <Button onClick={onSubmit} size="lg" disabled={submitting} className="w-full">
            {submitting ? 'Renewing...' : 'Renew FDR'}
          </Button>
        </div>
      </BottomSheet>

      <AccountSelectSheet
        open={accountSheetOpen}
        onClose={() => setAccountSheetOpen(false)}
        onSelect={(account) => setSelectedAccount(account)}
        title="Account"
      />
    </>
  )
}
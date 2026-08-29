import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Sparkles, RotateCcw } from 'lucide-react'
import { Card, CurrencyInput, Input } from '@/components/ui' // Removed Button import
import { formatAmount, currencySymbol, parseAmountInput } from '@/lib/money'
import { projectDpsMaturity } from '@/services/dpsMaturityService'
import type { Dps, DpsContribution } from '@/types/entities'

interface DpsMaturityProjectionCardProps {
  dps: Dps
  contributions: Pick<DpsContribution, 'amount' | 'date'>[]
}

export function DpsMaturityProjectionCard({ dps, contributions }: DpsMaturityProjectionCardProps) {
  const [whatIfOpen, setWhatIfOpen] = useState(false)
  const [installmentInput, setInstallmentInput] = useState('')
  const [rateInput, setRateInput] = useState('')
  const [tenureInput, setTenureInput] = useState('')

  const overrides = useMemo(() => {
    if (!whatIfOpen) return {}
    const installment = parseAmountInput(installmentInput, dps.currency)
    const rate = rateInput.trim() === '' ? undefined : Number(rateInput)
    const tenure = tenureInput.trim() === '' ? undefined : Number(tenureInput)
    return {
      monthlyInstallment: installment ?? undefined,
      interestRate: rate !== undefined && !Number.isNaN(rate) ? rate : undefined,
      tenureMonths: tenure !== undefined && !Number.isNaN(tenure) && tenure > 0 ? tenure : undefined,
    }
  }, [whatIfOpen, installmentInput, rateInput, tenureInput, dps.currency])

  const projection = useMemo(() => projectDpsMaturity(dps, contributions, overrides), [dps, contributions, overrides])

  function resetWhatIf() {
    setInstallmentInput('')
    setRateInput('')
    setTenureInput('')
    setWhatIfOpen(false)
  }

  return (
    <Card padding="none" className="flex flex-col divide-y divide-border">
      <div className="flex items-center justify-between px-4 pt-3.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Maturity Projection</p>
        <button
          onClick={() => (whatIfOpen ? resetWhatIf() : setWhatIfOpen(true))}
          className="flex items-center gap-1 text-xs font-medium text-primary"
        >
          {whatIfOpen ? (
            <>
              <RotateCcw className="h-3 w-3" /> Reset
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3" /> What-if
            </>
          )}
        </button>
      </div>

      {whatIfOpen && (
        <div className="flex flex-col gap-3 px-4 py-3.5">
          <p className="text-xs text-muted-foreground">
            Try different numbers without changing this DPS's actual details.
          </p>
          <CurrencyInput
            label="Monthly installment"
            currencySymbol={currencySymbol(dps.currency)}
            placeholder={String(dps.monthlyInstallment / 100)}
            value={installmentInput}
            onChange={(e) => setInstallmentInput(e.target.value)}
          />
          <Input
            label="Interest rate (%)"
            inputMode="decimal"
            placeholder={dps.interestRate != null ? String(dps.interestRate) : '0'}
            value={rateInput}
            onChange={(e) => setRateInput(e.target.value)}
          />
          <Input
            label="Tenure (months)"
            inputMode="numeric"
            placeholder={String(dps.tenureMonths)}
            value={tenureInput}
            onChange={(e) => setTenureInput(e.target.value)}
          />
        </div>
      )}

      <DetailRow label="Total deposited so far" value={formatAmount(projection.totalDepositedSoFar, dps.currency)} />
      <DetailRow label="Estimated interest so far" value={formatAmount(projection.estimatedInterestSoFar, dps.currency)} />
      <DetailRow label="Remaining installments" value={String(projection.remainingInstallments)} />
      <DetailRow label="Remaining contribution" value={formatAmount(projection.remainingContribution, dps.currency)} />
      <DetailRow label="Expected maturity date" value={format(projection.expectedMaturityDate, 'MMM d, yyyy')} />
      <DetailRow
        label={projection.hasRate ? 'Estimated maturity amount' : 'Estimated maturity amount (set a rate)'}
        value={formatAmount(projection.projectedMaturityAmount, dps.currency)}
        emphasized
      />

      <div className="px-4 py-2.5">
        <p className="text-[11px] text-muted-foreground">
          {projection.isWhatIf
            ? 'What-if figures — not saved, does not affect the real DPS.'
            : 'Estimated — not a bank-confirmed maturity value.'}
        </p>
      </div>
    </Card>
  )
}

function DetailRow({ label, value, emphasized }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm ${emphasized ? 'font-semibold text-primary' : 'font-medium text-foreground'}`}>{value}</span>
    </div>
  )
}
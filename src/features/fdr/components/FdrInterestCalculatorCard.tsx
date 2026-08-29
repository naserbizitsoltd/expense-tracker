import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Sparkles, RotateCcw } from 'lucide-react'
import { Card, CurrencyInput, Input } from '@/components/ui'
import { formatAmount, currencySymbol, parseAmountInput } from '@/lib/money'
import { estimateFdrInterest } from '@/services/fdrInterestService'
import type { Fdr } from '@/types/entities'

interface FdrInterestCalculatorCardProps {
  fdr: Fdr
}

export function FdrInterestCalculatorCard({ fdr }: FdrInterestCalculatorCardProps) {
  const [whatIfOpen, setWhatIfOpen] = useState(false)
  const [principalInput, setPrincipalInput] = useState('')
  const [rateInput, setRateInput] = useState('')
  const [tenureInput, setTenureInput] = useState('')

  const overrides = useMemo(() => {
    if (!whatIfOpen) return {}
    const principal = parseAmountInput(principalInput, fdr.currency)
    const rate = rateInput.trim() === '' ? undefined : Number(rateInput)
    const tenure = tenureInput.trim() === '' ? undefined : Number(tenureInput)
    return {
      principal: principal ?? undefined,
      interestRate: rate !== undefined && !Number.isNaN(rate) ? rate : undefined,
      tenureMonths: tenure !== undefined && !Number.isNaN(tenure) && tenure > 0 ? tenure : undefined,
    }
  }, [whatIfOpen, principalInput, rateInput, tenureInput, fdr.currency])

  const estimate = useMemo(() => estimateFdrInterest(fdr, overrides), [fdr, overrides])

  function resetWhatIf() {
    setPrincipalInput('')
    setRateInput('')
    setTenureInput('')
    setWhatIfOpen(false)
  }

  return (
    <Card padding="none" className="flex flex-col divide-y divide-border">
      <div className="flex items-center justify-between px-4 pt-3.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Interest Estimate</p>
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
          <p className="text-xs text-muted-foreground">Try different numbers without changing this FDR's actual details.</p>
          <CurrencyInput
            label="Principal"
            currencySymbol={currencySymbol(fdr.currency)}
            placeholder={String(fdr.principal / 100)}
            value={principalInput}
            onChange={(e) => setPrincipalInput(e.target.value)}
          />
          <Input
            label="Interest rate (%)"
            inputMode="decimal"
            placeholder={fdr.interestRate != null ? String(fdr.interestRate) : '0'}
            value={rateInput}
            onChange={(e) => setRateInput(e.target.value)}
          />
          <Input
            label="Tenure (months)"
            inputMode="numeric"
            placeholder={String(fdr.tenureMonths)}
            value={tenureInput}
            onChange={(e) => setTenureInput(e.target.value)}
          />
        </div>
      )}

      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Principal</span>
          <span className="text-sm font-medium text-foreground">{formatAmount(estimate.principal, fdr.currency)}</span>
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Estimated interest</span>
          <span className="text-sm font-medium text-foreground">{formatAmount(estimate.estimatedInterest, fdr.currency)}</span>
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Estimated maturity date</span>
          <span className="text-sm font-medium text-foreground">{format(estimate.maturityDate, 'MMM d, yyyy')}</span>
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {estimate.hasRate ? 'Estimated maturity amount' : 'Estimated maturity amount (set a rate)'}
          </span>
          <span className="text-sm font-semibold text-primary">{formatAmount(estimate.estimatedMaturityAmount, fdr.currency)}</span>
        </div>
      </div>

      <div className="px-4 py-2.5">
        <p className="text-[11px] text-muted-foreground">
          {estimate.isWhatIf
            ? 'What-if figures — not saved, does not affect the real FDR.'
            : 'Estimated only — the actual maturity amount above is what the bank confirms.'}
        </p>
      </div>
    </Card>
  )
}
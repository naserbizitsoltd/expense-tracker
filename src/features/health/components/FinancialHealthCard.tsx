import { CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react'
import { Card } from '@/components/ui'
import { useFinancialHealth } from '../useFinancialHealth'

const RING_COLOR = {
  good: '#22c55e',
  fair: '#f59e0b',
  poor: '#f43f5e',
}

function ringColorForScore(score: number): string {
  if (score >= 70) return RING_COLOR.good
  if (score >= 40) return RING_COLOR.fair
  return RING_COLOR.poor
}

export function FinancialHealthCard() {
  const { score, factors, scoredMaxPoints, isLoading } = useFinancialHealth()

  if (isLoading) return null

  return (
    <Card padding="none" className="flex flex-col divide-y divide-border">
      <div className="flex items-center gap-4 px-4 pt-4">
        {score !== null ? (
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
            style={{ backgroundColor: ringColorForScore(score) }}
          >
            {score}
          </div>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-muted-foreground">
            <HelpCircle className="h-6 w-6" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {score !== null ? `Financial Health: ${score}/100` : 'Financial Health: Not enough data'}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {score !== null
              ? `Based on ${scoredMaxPoints} of 100 possible points — some factors need more data`
              : 'Add a few transactions, budgets, or goals to see your score'}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 px-4 py-3.5">
        {factors.map((f) => (
          <div key={f.key} className="flex items-start gap-2">
            {f.status === 'good' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />}
            {f.status === 'warning' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />}
            {f.status === 'insufficient_data' && <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${f.status === 'insufficient_data' ? 'text-muted-foreground' : 'text-foreground'}`}>
                {f.message}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {f.label}
                {f.status !== 'insufficient_data' && ` · ${f.points}/${f.maxPoints} pts`}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-2.5">
        <p className="text-[11px] text-muted-foreground">
          Not financial advice — a transparent estimate from your own data in this app only.
        </p>
      </div>
    </Card>
  )
}
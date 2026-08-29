import { HeartPulse } from 'lucide-react'
import { AppShell } from '@/layouts/AppShell'
import { LoadingState } from '@/components/ui'
import { FinancialHealthCard } from '../components/FinancialHealthCard'
import { useFinancialHealth } from '../useFinancialHealth'

interface FinancialHealthPageProps {
  onBack: () => void
}

export function FinancialHealthPage({ onBack }: FinancialHealthPageProps) {
  const { isLoading } = useFinancialHealth()

  return (
    <AppShell title="Financial Health" headerBack={onBack}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 py-1 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-muted text-primary">
            <HeartPulse className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-foreground">Your Financial Health Score</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            A transparent 0–100 score built only from your own data in this app.
          </p>
        </div>

        {isLoading && <LoadingState label="Loading..." />}

        {!isLoading && <FinancialHealthCard />}
      </div>
    </AppShell>
  )
}
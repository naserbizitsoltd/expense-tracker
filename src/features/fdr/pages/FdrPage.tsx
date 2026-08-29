import { useState } from 'react'
import { Landmark, Archive, ArchiveRestore, Plus, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { AppShell } from '@/layouts/AppShell'
import {
  Button,
  BottomSheet,
  BalanceCard,
  Card,
  Badge,
  EmptyState,
  LoadingState,
  ConfirmationDialog,
  useToast,
} from '@/components/ui'
import { useFdrs, useSingleFdr, useFdrPayout, useFdrRenewalChain } from '../useFdr'
import { useAccounts } from '@/features/accounts/useAccounts'
import { FdrCard } from '../FdrCard'
import { FdrForm } from '../FdrForm'
import { FdrPayoutSheet } from '../FdrPayoutSheet'
import { FdrRenewSheet } from '../FdrRenewSheet'
import { FdrWithdrawSheet } from '../FdrWithdrawSheet'
import { FdrInterestCalculatorCard } from '../components/FdrInterestCalculatorCard' // Added import
import { archiveFdr, restoreFdr, isFdrMatured, getFdrMaturitySummary } from '@/services/fdrService'
import { fdrStatusLabel, fdrStatusBadgeVariant } from '../fdrConfig'
import { formatAmount } from '@/lib/money'
import { APP_CONFIG } from '@/config/app.config'

interface FdrPageProps {
  onBack: () => void
}

export function FdrPage({ onBack }: FdrPageProps) {
  const [selectedFdrId, setSelectedFdrId] = useState<string | null>(null)

  if (selectedFdrId) {
    return <FdrDetails fdrId={selectedFdrId} onBack={() => setSelectedFdrId(null)} onOpenFdr={setSelectedFdrId} />
  }
  return <FdrList onBack={onBack} onOpenFdr={setSelectedFdrId} />
}

function FdrList({ onBack, onOpenFdr }: { onBack: () => void; onOpenFdr: (id: string) => void }) {
  const { activeItems, archivedItems, totalPrincipal, isLoading } = useFdrs()
  const [addOpen, setAddOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  return (
    <AppShell
      title="FDR"
      subtitle={`${activeItems.length} active`}
      headerBack={onBack}
      fab={
        <Button size="lg" className="h-14 w-14 rounded-full p-0 shadow-lg" aria-label="Add FDR" onClick={() => setAddOpen(true)}>
          <Plus className="h-6 w-6" />
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <BalanceCard label="Total Locked Principal" amount={formatAmount(totalPrincipal, APP_CONFIG.defaultCurrency)} />

        {isLoading && <LoadingState label="Loading FDRs..." />}

        {!isLoading && activeItems.length === 0 && (
          <EmptyState
            icon={<Landmark className="h-6 w-6" />}
            title="No FDR yet"
            description="Track a fixed deposit separately from your spendable accounts."
            action={<Button onClick={() => setAddOpen(true)}>Add FDR</Button>}
          />
        )}

        {!isLoading && activeItems.length > 0 && (
          <div className="flex flex-col gap-2">
            {activeItems.map((item) => (
              <FdrCard key={item.fdr.id} item={item} onClick={() => onOpenFdr(item.fdr.id)} />
            ))}
          </div>
        )}

        {archivedItems.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="flex w-full items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              <span className="flex items-center gap-1.5">
                <Archive className="h-3.5 w-3.5" />
                Archived ({archivedItems.length})
              </span>
            </button>
            {showArchived && (
              <div className="flex flex-col gap-2">
                {archivedItems.map((item) => (
                  <FdrCard key={item.fdr.id} item={item} onClick={() => onOpenFdr(item.fdr.id)} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="Add FDR">
        <FdrForm onDone={() => setAddOpen(false)} />
      </BottomSheet>
    </AppShell>
  )
}

function FdrDetails({
  fdrId,
  onBack,
  onOpenFdr,
}: {
  fdrId: string
  onBack: () => void
  onOpenFdr: (id: string) => void
}) {
  const { fdr, isLoading } = useSingleFdr(fdrId)
  const { accounts } = useAccounts()
  const { showToast } = useToast()
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [renewOpen, setRenewOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)

  const { payout } = useFdrPayout(fdrId)
  const { chain } = useFdrRenewalChain(fdrId)

  if (isLoading) {
    return (
      <AppShell title="FDR" headerBack={onBack}>
        <LoadingState label="Loading..." />
      </AppShell>
    )
  }

  if (!fdr) {
    return (
      <AppShell title="FDR" headerBack={onBack}>
        <EmptyState icon={<Landmark className="h-6 w-6" />} title="FDR not found" description="It may have been deleted." />
      </AppShell>
    )
  }

  const linkedAccount = accounts.find((a) => a.id === fdr.accountId)
  const isArchived = fdr.status === 'archived'
  const isPaidOut = fdr.status === 'paid_out'
  const isRenewed = fdr.status === 'renewed'
  const isWithdrawn = fdr.status === 'withdrawn'
  const isTerminal = isPaidOut || isRenewed || isWithdrawn
  const isMatured = fdr.status === 'active' && isFdrMatured(fdr)
  const displayStatus = isMatured ? 'matured' : fdr.status
  const summary = getFdrMaturitySummary(fdr)

  async function toggleArchive() {
    try {
      if (fdr!.status === 'archived') {
        await restoreFdr(fdr!.id)
        showToast('FDR restored', 'success')
      } else {
        await archiveFdr(fdr!.id)
        showToast('FDR archived', 'success')
      }
    } catch {
      showToast('Could not update the FDR. Please try again.', 'error')
    }
  }

  return (
    <AppShell title={fdr.name} headerBack={onBack}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 py-1 text-center">
          <p className="text-sm font-semibold text-foreground">{fdr.name}</p>
          <p className="-mt-1 text-xs text-muted-foreground">{fdr.institution}</p>
          <Badge variant={fdrStatusBadgeVariant(displayStatus)}>{fdrStatusLabel(displayStatus)}</Badge>
        </div>

        <BalanceCard label="Principal" amount={formatAmount(fdr.principal, fdr.currency)} />

        <Card padding="none" className="flex flex-col divide-y divide-border">
          <div className="px-4 pt-3.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Maturity</p>
          </div>
          <DetailRow label="Maturity Date" value={fdr.maturityDate ? format(fdr.maturityDate, 'MMM d, yyyy') : '—'} />
          <DetailRow
            label="Maturity Amount"
            value={
              payout
                ? formatAmount(payout.amount, fdr.currency)
                : summary.maturityAmount !== null
                ? formatAmount(summary.maturityAmount, fdr.currency)
                : `${formatAmount(fdr.principal, fdr.currency)} (amount not yet known)`
            }
          />
          <DetailRow label="Status" value={fdrStatusLabel(displayStatus)} />
          {isMatured && (
            <div className="flex flex-col gap-2 px-4 py-3.5">
              <Button onClick={() => setReceiveOpen(true)} className="w-full">
                Receive Maturity
              </Button>
              <Button variant="secondary" onClick={() => setRenewOpen(true)} className="w-full">
                <RefreshCw className="h-4 w-4" /> Renew / Rollover
              </Button>
            </div>
          )}
          {!isMatured && fdr.status === 'active' && (
            <div className="flex flex-col gap-2 px-4 py-3.5">
              <p className="text-xs text-muted-foreground">FDR has not reached maturity.</p>
              <Button variant="secondary" onClick={() => setWithdrawOpen(true)} className="w-full">
                Premature Withdrawal
              </Button>
            </div>
          )}
        </Card>

        {/* Added FdrInterestCalculatorCard - only for active FDRs */}
        {fdr.status === 'active' && <FdrInterestCalculatorCard fdr={fdr} />}

        <Card padding="none" className="flex flex-col divide-y divide-border">
          <DetailRow label="Provider" value={fdr.institution} />
          {fdr.referenceNumber && <DetailRow label="Reference" value={fdr.referenceNumber} />}
          <DetailRow label="Source account" value={linkedAccount?.name ?? '—'} />
          <DetailRow label="Start date" value={format(fdr.startDate, 'MMM d, yyyy')} />
          <DetailRow label="Tenure" value={`${fdr.tenureMonths} months`} />
          <DetailRow label="Interest / profit rate" value={fdr.interestRate != null ? `${fdr.interestRate}%` : '—'} />
        </Card>

        {fdr.notes && (
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
            <p className="mt-1.5 text-sm text-foreground">{fdr.notes}</p>
          </Card>
        )}

        {payout && (
          <section className="flex flex-col gap-1">
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {payout.type === 'premature' ? 'Premature Withdrawal' : 'Maturity Payout'}
            </p>
            <Card padding="sm" className="flex flex-col divide-y divide-border">
              <div className="flex items-center justify-between px-1 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{format(payout.date, 'MMM d, yyyy')}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Received into {accounts.find((a) => a.id === payout.accountId)?.name ?? '—'}
                  </p>
                  {payout.profitAmount !== 0 && (
                    <p className="truncate text-xs text-muted-foreground">
                      Principal {formatAmount(payout.principalAmount, fdr.currency)}
                      {payout.profitAmount > 0
                        ? ` + Profit ${formatAmount(payout.profitAmount, fdr.currency)}`
                        : ` − Penalty ${formatAmount(Math.abs(payout.profitAmount), fdr.currency)}`}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                  {formatAmount(payout.amount, fdr.currency)}
                </p>
              </div>
            </Card>
          </section>
        )}

        {chain.length > 1 && (
          <section className="flex flex-col gap-1">
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Renewal History</p>
            <Card padding="sm" className="flex flex-col divide-y divide-border">
              {chain.map((link) => (
                <button
                  key={link.id}
                  onClick={() => link.id !== fdr.id && onOpenFdr(link.id)}
                  className={`flex items-center justify-between gap-2 px-1 py-2.5 text-left ${
                    link.id === fdr.id ? '' : 'transition-colors active:bg-surface-elevated'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-medium ${link.id === fdr.id ? 'text-primary' : 'text-foreground'}`}>
                      {link.name} {link.id === fdr.id && '(current)'}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatAmount(link.principal, link.currency)} · {format(link.startDate, 'd MMM yyyy')}
                      {link.maturityDate ? ` → ${format(link.maturityDate, 'd MMM yyyy')}` : ''}
                    </p>
                  </div>
                  <Badge variant={fdrStatusBadgeVariant(link.status)}>{fdrStatusLabel(link.status)}</Badge>
                </button>
              ))}
            </Card>
          </section>
        )}

        <div className="flex flex-col gap-2 pb-2">
          {!isTerminal && (
            <Button variant="secondary" onClick={() => (isArchived ? toggleArchive() : setArchiveConfirmOpen(true))}>
              {isArchived ? (
                <>
                  <ArchiveRestore className="h-4 w-4" /> Restore FDR
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" /> Archive FDR
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <FdrPayoutSheet
        open={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        fdr={fdr}
        onReceived={(receivedPayout, account) => {
          showToast(`${formatAmount(receivedPayout.amount, fdr.currency)} received · ${account.name}`, 'success')
          setReceiveOpen(false)
        }}
      />

      <FdrRenewSheet open={renewOpen} onClose={() => setRenewOpen(false)} fdr={fdr} onRenewed={() => setRenewOpen(false)} />

      <FdrWithdrawSheet
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        fdr={fdr}
        onWithdrawn={(withdrawnPayout, account) => {
          showToast(`${formatAmount(withdrawnPayout.amount, fdr.currency)} received · ${account.name}`, 'success')
          setWithdrawOpen(false)
        }}
      />

      <ConfirmationDialog
        open={archiveConfirmOpen}
        onClose={() => setArchiveConfirmOpen(false)}
        onConfirm={toggleArchive}
        title="Archive this FDR?"
        description="Historical information is kept. An archived FDR won't accept new actions, but you can restore it anytime."
        confirmLabel="Archive"
      />
    </AppShell>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}
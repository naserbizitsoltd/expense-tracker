import { useState } from 'react'
import { PiggyBank, Trash2, Receipt, Banknote, Archive, ArchiveRestore, Plus } from 'lucide-react'
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
import { useDps, useSingleDps } from '../useDps'
import { useDpsContributions, useDpsPayout } from '../useDpsContributions'
import { useAccounts } from '@/features/accounts/useAccounts'
import { DpsCard } from '../components/DpsCard'
import { DpsForm } from '../components/DpsForm'
import { DpsContributionSheet } from '../components/DpsContributionSheet'
import { DpsPayoutSheet } from '../components/DpsPayoutSheet'
import { DpsContributionRow } from '../components/DpsContributionRow'
import { dpsRepository } from '@/db'
import { archiveDps, restoreDps } from '@/services/dpsService'
import { dpsStatusLabel, dpsStatusBadgeVariant } from '../dpsConfig'
import { formatAmount } from '@/lib/money'
import { APP_CONFIG } from '@/config/app.config'

interface DpsPageProps {
  onBack: () => void
}

export function DpsPage({ onBack }: DpsPageProps) {
  const [selectedDpsId, setSelectedDpsId] = useState<string | null>(null)

  if (selectedDpsId) {
    return <DpsDetails dpsId={selectedDpsId} onBack={() => setSelectedDpsId(null)} />
  }
  return <DpsList onBack={onBack} onOpenDps={setSelectedDpsId} />
}

function DpsList({ onBack, onOpenDps }: { onBack: () => void; onOpenDps: (id: string) => void }) {
  const { activeItems, archivedItems, totalDeposited, isLoading } = useDps()
  const [addOpen, setAddOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  return (
    <AppShell
      title="DPS"
      subtitle={`${activeItems.length} active`}
      headerBack={onBack}
      fab={
        <Button size="lg" className="h-14 w-14 rounded-full p-0 shadow-lg" aria-label="Add DPS" onClick={() => setAddOpen(true)}>
          <Plus className="h-6 w-6" />
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <BalanceCard label="Total Deposited" amount={formatAmount(totalDeposited, APP_CONFIG.defaultCurrency)} />

        {isLoading && <LoadingState label="Loading DPS..." />}

        {!isLoading && activeItems.length === 0 && (
          <EmptyState
            icon={<PiggyBank className="h-6 w-6" />}
            title="No DPS yet"
            description="Track a recurring deposit scheme separately from your regular accounts."
            action={<Button onClick={() => setAddOpen(true)}>Add DPS</Button>}
          />
        )}

        {!isLoading && activeItems.length > 0 && (
          <div className="flex flex-col gap-2">
            {activeItems.map((item) => (
              <DpsCard key={item.dps.id} item={item} onClick={() => onOpenDps(item.dps.id)} />
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
                  <DpsCard key={item.dps.id} item={item} onClick={() => onOpenDps(item.dps.id)} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="Add DPS">
        <DpsForm onDone={() => setAddOpen(false)} />
      </BottomSheet>
    </AppShell>
  )
}

function DpsDetails({ dpsId, onBack }: { dpsId: string; onBack: () => void }) {
  const { dps, isLoading } = useSingleDps(dpsId)
  const { accounts } = useAccounts()
  const { showToast } = useToast()
    const [contributeOpen, setContributeOpen] = useState(false)
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const { contributions, totalDeposited, progress, isLoading: isContributionsLoading } = useDpsContributions(dps ?? null)
  const { payout } = useDpsPayout(dpsId)

  if (isLoading) {
    return (
      <AppShell title="DPS" headerBack={onBack}>
        <LoadingState label="Loading..." />
      </AppShell>
    )
  }

  if (!dps) {
    return (
      <AppShell title="DPS" headerBack={onBack}>
        <EmptyState icon={<PiggyBank className="h-6 w-6" />} title="DPS not found" description="It may have been deleted." />
      </AppShell>
    )
  }

  const linkedAccount = accounts.find((a) => a.id === dps.accountId)
  const accountsById = new Map(accounts.map((a) => [a.id, a]))
    const isArchived = dps.status === 'archived'
  const isCompleted = dps.status === 'completed'
  const isPaidOut = dps.status === 'paid_out'
  const isMatured = isCompleted && !!progress?.isMatured
  const maturityStatusLabel = isPaidOut ? 'Paid Out' : isMatured ? 'Matured' : dpsStatusLabel(dps.status)
  const maturityBadgeVariant = isPaidOut ? 'default' : isMatured ? 'success' : dpsStatusBadgeVariant(dps.status)
  const maturityAmountPreview = payout ? payout.amount : totalDeposited

  async function toggleArchive() {
    try {
      if (dps!.status === 'archived') {
        await restoreDps(dps!.id)
        showToast('DPS restored', 'success')
      } else {
        await archiveDps(dps!.id)
        showToast('DPS archived', 'success')
      }
    } catch {
      showToast('Could not update the DPS. Please try again.', 'error')
    }
  }

  async function deleteDps() {
    try {
      await dpsRepository.delete(dps!.id)
      showToast('DPS deleted', 'success')
      onBack()
    } catch {
      showToast('Could not delete the DPS. Please try again.', 'error')
    }
  }

  return (
    <AppShell title={dps.name} headerBack={onBack}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 py-1 text-center">
          <p className="text-sm font-semibold text-foreground">{dps.name}</p>
          <p className="-mt-1 text-xs text-muted-foreground">{dps.institution}</p>
                    <Badge variant={maturityBadgeVariant}>{maturityStatusLabel}</Badge>
        </div>

        <BalanceCard label="Total Deposited" amount={formatAmount(totalDeposited, dps.currency)} />

        {dps.openingInterestEarned > 0 && (
          <BalanceCard
            label="Current Value (incl. accumulated interest)"
            amount={formatAmount(totalDeposited + dps.openingInterestEarned, dps.currency)}
          />
        )}

        <Card>
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold tabular-nums text-foreground">
              {progress ? `${progress.paidInstallments} / ${dps.tenureMonths}` : `0 / ${dps.tenureMonths}`}
            </p>
            <p className="text-xs text-muted-foreground">installments paid</p>
          </div>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress?.percentComplete ?? 0}%` }} />
          </div>
                    <p className="mt-1.5 text-xs font-medium text-muted-foreground">{progress?.percentComplete ?? 0}%</p>
        </Card>

        {(isCompleted || isPaidOut) && (
          <Card padding="none" className="flex flex-col divide-y divide-border">
            <div className="px-4 pt-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Maturity</p>
            </div>
            <DetailRow label="Maturity Date" value={dps.maturityDate ? format(dps.maturityDate, 'MMM d, yyyy') : '—'} />
            <DetailRow label="Maturity Amount" value={formatAmount(maturityAmountPreview, dps.currency)} />
            <DetailRow label="Status" value={maturityStatusLabel} />
            {isMatured && !isPaidOut && (
              <div className="px-4 py-3.5">
                <Button onClick={() => setReceiveOpen(true)} className="w-full">
                  Receive Maturity
                </Button>
              </div>
            )}
            {isCompleted && !isMatured && !isPaidOut && (
              <div className="px-4 py-3.5">
                <p className="text-xs text-muted-foreground">DPS has not reached maturity.</p>
              </div>
            )}
          </Card>
        )}

        <Card padding="none" className="flex flex-col divide-y divide-border">
          <DetailRow label="Provider" value={dps.institution} />
          {dps.referenceNumber && <DetailRow label="Reference" value={dps.referenceNumber} />}
          <DetailRow label="Monthly installment" value={formatAmount(dps.monthlyInstallment, dps.currency)} />
          <DetailRow label="Linked account" value={linkedAccount?.name ?? '—'} />
          <DetailRow label="Start date" value={format(dps.startDate, 'MMM d, yyyy')} />
          <DetailRow label="Maturity date" value={dps.maturityDate ? format(dps.maturityDate, 'MMM d, yyyy') : '—'} />
          <DetailRow label="Total installments" value={String(dps.tenureMonths)} />
          <DetailRow label="Paid installments" value={String(progress?.paidInstallments ?? 0)} />
          <DetailRow label="Remaining installments" value={String(progress?.remainingInstallments ?? dps.tenureMonths)} />
          <DetailRow
            label="Next contribution"
            value={progress?.nextContributionDate ? format(progress.nextContributionDate, 'MMM d, yyyy') : '—'}
          />
          <DetailRow label="Interest / profit rate" value={dps.interestRate != null ? `${dps.interestRate}%` : '—'} />
          {dps.openingInterestEarned > 0 && (
            <DetailRow label="Interest accumulated so far" value={formatAmount(dps.openingInterestEarned, dps.currency)} />
          )}
                    <DetailRow label="Status" value={maturityStatusLabel} />
        </Card>

        {dps.notes && (
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
            <p className="mt-1.5 text-sm text-foreground">{dps.notes}</p>
          </Card>
        )}

        <section className="flex flex-col gap-1">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contribution History</p>

          {isContributionsLoading && <LoadingState label="Loading contributions..." />}

          {!isContributionsLoading && contributions.length === 0 && (
            <EmptyState
              icon={<Receipt className="h-6 w-6" />}
              title="No contributions yet"
              description="Contributions to this DPS will show up here."
            />
          )}

          {!isContributionsLoading && contributions.length > 0 && (
            <Card padding="sm" className="flex flex-col divide-y divide-border">
              {contributions.map((c) => (
                <DpsContributionRow key={c.id} contribution={c} account={accountsById.get(c.accountId)} currency={dps.currency} />
              ))}
            </Card>
          )}
                </section>

        {payout && (
          <section className="flex flex-col gap-1">
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Maturity Payout</p>
            <Card padding="sm" className="flex flex-col divide-y divide-border">
              <div className="flex items-center justify-between px-1 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{format(payout.date, 'MMM d, yyyy')}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Received into {accountsById.get(payout.accountId)?.name ?? '—'}
                  </p>
                  {payout.profitAmount > 0 && (
                    <p className="truncate text-xs text-muted-foreground">
                      Deposited {formatAmount(payout.depositedAmount, dps.currency)} + Profit {formatAmount(payout.profitAmount, dps.currency)}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                  {formatAmount(payout.amount, dps.currency)}
                </p>
              </div>
            </Card>
          </section>
        )}

        <div className="flex flex-col gap-2 pb-2">
          {!isArchived && !isCompleted && !isPaidOut && (
            <Button onClick={() => setContributeOpen(true)}>
              <Banknote className="h-4 w-4" /> Add Contribution
            </Button>
          )}
          <Button variant="secondary" onClick={() => (isArchived ? toggleArchive() : setArchiveConfirmOpen(true))}>
            {isArchived ? (
              <>
                <ArchiveRestore className="h-4 w-4" /> Restore DPS
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" /> Archive DPS
              </>
            )}
          </Button>
          {contributions.length === 0 && dps.openingInstallmentsPaid === 0 && dps.openingDepositedAmount === 0 && (
            <Button variant="danger" onClick={() => setDeleteConfirmOpen(true)}>
              <Trash2 className="h-4 w-4" /> Delete DPS
            </Button>
          )}
        </div>
      </div>

            <DpsContributionSheet
        open={contributeOpen}
        onClose={() => setContributeOpen(false)}
        dps={dps}
        linkedAccount={linkedAccount}
        onContributed={(contribution, account) => {
          showToast(`${formatAmount(contribution.amount, dps.currency)} recorded · ${account.name}`, 'success')
          setContributeOpen(false)
        }}
      />

      <DpsPayoutSheet
        open={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        dps={dps}
        deposited={totalDeposited}
        onReceived={(receivedPayout, account) => {
          showToast(`${formatAmount(receivedPayout.amount, dps.currency)} received · ${account.name}`, 'success')
          setReceiveOpen(false)
        }}
      />

      <ConfirmationDialog
        open={archiveConfirmOpen}
        onClose={() => setArchiveConfirmOpen(false)}
        onConfirm={toggleArchive}
        title="Archive this DPS?"
        description="Existing contributions will be kept. An archived DPS won't accept new contributions, but you can restore it anytime."
        confirmLabel="Archive"
      />

      <ConfirmationDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={deleteDps}
        title="Delete this DPS?"
        description="This DPS has no contribution history, so it can be safely deleted. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
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
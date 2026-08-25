import { useState } from 'react'
import {
  Plus,
  CreditCard as CreditCardIcon,
  Archive,
  ChevronDown,
  ChevronUp,
  Pencil,
  ArchiveRestore,
  Trash2,
  Receipt,
  Banknote,
} from 'lucide-react'
import { format } from 'date-fns'
import { AppShell } from '@/layouts/AppShell'
import {
  Avatar,
  Badge,
  Button,
  BottomSheet,
  BalanceCard,
  Card,
  EmptyState,
  LoadingState,
  IconButton,
  ConfirmationDialog,
  useToast,
} from '@/components/ui'
import { useCreditCards, useCreditCard } from '../useCreditCards'
import { useCreditCardTransactions } from '../useCreditCardTransactions'
import { CreditCardTransactionRow } from '../components/CreditCardTransactionRow'
import { getCreditCardIcon } from '../creditCardConfig'
import { CreditCardForm } from '../components/CreditCardForm'
import { CreditCardPaymentSheet } from '../components/CreditCardPaymentSheet'
import { CreditCardListItem } from '../components/CreditCardListItem'
import { creditCardRepository } from '@/db'
import { getCreditCardBillingInfo, type CreditCardPaymentStatus } from '@/services/creditCardBillingService'
import { formatAmount } from '@/lib/money'
import { APP_CONFIG } from '@/config/app.config'

interface CreditCardsPageProps {
  onBack: () => void
}

export function CreditCardsPage({ onBack }: CreditCardsPageProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  if (selectedCardId) {
    return <CreditCardDetails cardId={selectedCardId} onBack={() => setSelectedCardId(null)} />
  }
  return <CreditCardsList onBack={onBack} onOpenCard={setSelectedCardId} />
}

function CreditCardsList({ onBack, onOpenCard }: { onBack: () => void; onOpenCard: (id: string) => void }) {
  const { activeCards, archivedCards, totalOutstanding, isLoading } = useCreditCards()
  const [showArchived, setShowArchived] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  return (
    <AppShell
      title="Credit Cards"
      subtitle={`${activeCards.length} active`}
      headerBack={onBack}
      fab={
        <Button
          size="lg"
          className="h-14 w-14 rounded-full p-0 shadow-lg"
          aria-label="Add credit card"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Liability total — deliberately separate from Accounts' "Total
            Available" card, never summed into it. */}
        <BalanceCard label="Total Outstanding (Liability)" amount={formatAmount(totalOutstanding, APP_CONFIG.defaultCurrency)} />

        {isLoading && <LoadingState label="Loading credit cards..." />}

        {!isLoading && activeCards.length === 0 && (
          <EmptyState
            icon={<CreditCardIcon className="h-6 w-6" />}
            title="No credit cards yet"
            description="Add a credit card to track its limit and outstanding balance separately from your accounts."
            action={<Button onClick={() => setAddOpen(true)}>Add Credit Card</Button>}
          />
        )}

        {!isLoading && activeCards.length > 0 && (
          <div className="flex flex-col gap-2">
            {activeCards.map((card) => (
              <CreditCardListItem key={card.id} card={card} onClick={() => onOpenCard(card.id)} />
            ))}
          </div>
        )}

        {archivedCards.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="flex w-full items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              <span className="flex items-center gap-1.5">
                <Archive className="h-3.5 w-3.5" />
                Archived Cards ({archivedCards.length})
              </span>
              {showArchived ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showArchived && (
              <div className="flex flex-col gap-2">
                {archivedCards.map((card) => (
                  <CreditCardListItem key={card.id} card={card} onClick={() => onOpenCard(card.id)} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="Add Credit Card">
        <CreditCardForm onDone={() => setAddOpen(false)} />
      </BottomSheet>
    </AppShell>
  )
}

function CreditCardDetails({ cardId, onBack }: { cardId: string; onBack: () => void }) {
    const { card, isLoading } = useCreditCard(cardId)
  const { items: purchaseItems, isLoading: isPurchasesLoading } = useCreditCardTransactions(cardId)
  const { showToast } = useToast()
  const [editOpen, setEditOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  if (isLoading) {
    return (
      <AppShell title="Credit Card" headerBack={onBack}>
        <LoadingState label="Loading..." />
      </AppShell>
    )
  }

  if (!card) {
    return (
      <AppShell title="Credit Card" headerBack={onBack}>
        <EmptyState icon={<CreditCardIcon className="h-6 w-6" />} title="Card not found" description="It may have been deleted." />
      </AppShell>
    )
  }

    const availableCredit = card.creditLimit - card.outstandingBalance
  const billingInfo = getCreditCardBillingInfo(card)

  async function toggleArchive() {
    try {
      await creditCardRepository.update(card!.id, { isArchived: !card!.isArchived })
      showToast(card!.isArchived ? 'Credit card restored' : 'Credit card archived', 'success')
    } catch {
      showToast('Could not update the credit card. Please try again.', 'error')
    }
  }

  async function deleteCard() {
    try {
      await creditCardRepository.delete(card!.id)
      showToast('Credit card deleted', 'success')
      onBack()
    } catch {
      showToast('Could not delete the credit card. Please try again.', 'error')
    }
  }

  return (
    <AppShell
      title={card.name}
      headerBack={onBack}
      headerAction={
        <IconButton aria-label="Edit credit card" onClick={() => setEditOpen(true)}>
          <Pencil className="h-[18px] w-[18px]" />
        </IconButton>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 py-1 text-center">
                    <Avatar icon={(() => { const Icon = getCreditCardIcon(card.icon); return <Icon className="h-7 w-7" /> })()} color={card.color} size="xl" />
          <p className="text-sm font-semibold text-foreground">{card.name}</p>
          <p className="-mt-2 text-xs text-muted-foreground">
            {card.issuer}
            {card.last4 ? ` •••• ${card.last4}` : ''}
          </p>
        </div>

        <BalanceCard label="Available credit" amount={formatAmount(availableCredit, card.currency)} />

                <div className="grid grid-cols-2 gap-3">
          <Card className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Credit limit</p>
            <p className="truncate text-sm font-semibold tabular-nums text-foreground">
              {formatAmount(card.creditLimit, card.currency)}
            </p>
          </Card>
          <Card className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Outstanding balance</p>
            <p className="truncate text-sm font-semibold tabular-nums text-danger">
              {formatAmount(card.outstandingBalance, card.currency)}
            </p>
          </Card>
        </div>

        <Card padding="none" className="flex flex-col divide-y divide-border">
          <DetailRow label="Statement date" value={format(billingInfo.statementDate, 'd MMM')} />
          <DetailRow label="Payment due" value={format(billingInfo.dueDate, 'd MMM')} />
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={statusBadgeVariant(billingInfo.status)}>{billingInfo.statusLabel}</Badge>
          </div>
        </Card>

                        <Card padding="none" className="flex flex-col divide-y divide-border">
          <DetailRow label="Provider" value={card.issuer || '—'} />
          {card.last4 && <DetailRow label="Card number" value={`•••• ${card.last4}`} />}
          <DetailRow label="Currency" value={card.currency} />
          <DetailRow label="Billing date" value={`Day ${card.billingCycleDay}`} />
          <DetailRow label="Due date" value={`Day ${card.dueDay}`} />
          <DetailRow label="Interest rate" value={card.interestRate != null ? `${card.interestRate}%` : '—'} />
          <DetailRow label="Status" value={card.isArchived ? 'Archived' : 'Active'} />
          <DetailRow label="Added" value={format(card.createdAt, 'MMM d, yyyy')} />
        </Card>

        <section className="flex flex-col gap-1">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent purchases</p>

          {isPurchasesLoading && <LoadingState label="Loading purchases..." />}

          {!isPurchasesLoading && purchaseItems.length === 0 && (
            <EmptyState
              icon={<Receipt className="h-6 w-6" />}
              title="No purchases yet"
              description="Expenses paid with this card will show up here."
            />
          )}

          {!isPurchasesLoading && purchaseItems.length > 0 && (
            <Card padding="sm" className="flex flex-col divide-y divide-border">
              {purchaseItems.map((item) => (
                <CreditCardTransactionRow key={item.transaction.id} {...item} />
              ))}
            </Card>
          )}
        </section>

                <div className="flex flex-col gap-2 pb-2">
          {!card.isArchived && (
            <Button onClick={() => setPayOpen(true)}>
              <Banknote className="h-4 w-4" /> Pay Card
            </Button>
          )}
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Edit credit card
          </Button>
          <Button variant="secondary" onClick={() => (card.isArchived ? toggleArchive() : setArchiveConfirmOpen(true))}>
            {card.isArchived ? (
              <>
                <ArchiveRestore className="h-4 w-4" /> Restore credit card
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" /> Archive credit card
              </>
            )}
          </Button>
          <Button variant="danger" onClick={() => setDeleteConfirmOpen(true)}>
            <Trash2 className="h-4 w-4" /> Delete credit card
          </Button>
        </div>
      </div>

            <BottomSheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit Credit Card">
        <CreditCardForm card={card} onDone={() => setEditOpen(false)} />
      </BottomSheet>

      <CreditCardPaymentSheet
        open={payOpen}
        onClose={() => setPayOpen(false)}
        card={card}
        onPaid={(_transaction, account) => {
          showToast(`Paid ${formatAmount(_transaction.amount, card.currency)} from ${account.name}`, 'success')
          setPayOpen(false)
        }}
      />

      <ConfirmationDialog
        open={archiveConfirmOpen}
        onClose={() => setArchiveConfirmOpen(false)}
        onConfirm={toggleArchive}
        title="Archive this credit card?"
        description="Archived cards are hidden from active lists. You can restore them anytime."
        confirmLabel="Archive"
      />

      <ConfirmationDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={deleteCard}
        title="Delete this credit card?"
        description="This cannot be undone."
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

function statusBadgeVariant(status: CreditCardPaymentStatus): 'default' | 'success' | 'danger' | 'warning' {
  switch (status) {
    case 'no_payment_due':
      return 'success'
    case 'due_soon':
      return 'warning'
    case 'overdue':
      return 'danger'
    default:
      return 'default'
  }
}
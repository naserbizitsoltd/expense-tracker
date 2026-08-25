import { useState } from 'react'
import {
  Plus,
  CreditCard as DebitCardIcon,
  Archive,
  ChevronDown,
  ChevronUp,
  Pencil,
  ArchiveRestore,
  Trash2,
  Receipt,
} from 'lucide-react'
import { format } from 'date-fns'
import { AppShell } from '@/layouts/AppShell'
import {
  Avatar,
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
import { useDebitCards, useDebitCard } from '../useDebitCards'
import { useDebitCardTransactions } from '../useDebitCardTransactions'
import { AccountTransactionRow } from '@/features/accounts/components/AccountTransactionRow'
import { CategoryIcon } from '@/lib/lucideIcon'
import { getDebitCardIcon } from '../debitCardConfig'
import { DebitCardForm } from '../components/DebitCardForm'
import { DebitCardListItem } from '../components/DebitCardListItem'
import { debitCardRepository, accountRepository, useLiveQuery } from '@/db'
import { formatAmount } from '@/lib/money'

interface DebitCardsPageProps {
  onBack: () => void
}

export function DebitCardsPage({ onBack }: DebitCardsPageProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  if (selectedCardId) {
    return <DebitCardDetails cardId={selectedCardId} onBack={() => setSelectedCardId(null)} />
  }
  return <DebitCardsList onBack={onBack} onOpenCard={setSelectedCardId} />
}

function DebitCardsList({ onBack, onOpenCard }: { onBack: () => void; onOpenCard: (id: string) => void }) {
  const { activeCards, archivedCards, accountsById, isLoading } = useDebitCards()
  const [showArchived, setShowArchived] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  return (
    <AppShell
      title="Debit Cards"
      subtitle={`${activeCards.length} active`}
      headerBack={onBack}
      fab={
        <Button size="lg" className="h-14 w-14 rounded-full p-0 shadow-lg" aria-label="Add debit card" onClick={() => setAddOpen(true)}>
          <Plus className="h-6 w-6" />
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        {isLoading && <LoadingState label="Loading debit cards..." />}

        {!isLoading && activeCards.length === 0 && (
          <EmptyState
            icon={<DebitCardIcon className="h-6 w-6" />}
            title="No debit cards yet"
            description="Add a debit card to give an existing account a quick, recognizable face for everyday spending."
            action={<Button onClick={() => setAddOpen(true)}>Add Debit Card</Button>}
          />
        )}

        {!isLoading && activeCards.length > 0 && (
          <div className="flex flex-col gap-2">
            {activeCards.map((card) => (
              <DebitCardListItem
                key={card.id}
                card={card}
                account={accountsById.get(card.accountId)}
                onClick={() => onOpenCard(card.id)}
              />
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
                  <DebitCardListItem
                    key={card.id}
                    card={card}
                    account={accountsById.get(card.accountId)}
                    onClick={() => onOpenCard(card.id)}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="Add Debit Card">
        <DebitCardForm onDone={() => setAddOpen(false)} />
      </BottomSheet>
    </AppShell>
  )
}

function DebitCardDetails({ cardId, onBack }: { cardId: string; onBack: () => void }) {
  const { card, isLoading } = useDebitCard(cardId)
  const { data: linkedAccount } = useLiveQuery(
    () => (card ? accountRepository.getById(card.accountId) : undefined),
    [card?.accountId]
  )
  const { items: txItems, isLoading: isTxLoading } = useDebitCardTransactions(cardId)
  const { showToast } = useToast()
  const [editOpen, setEditOpen] = useState(false)
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  if (isLoading) {
    return (
      <AppShell title="Debit Card" headerBack={onBack}>
        <LoadingState label="Loading..." />
      </AppShell>
    )
  }

  if (!card) {
    return (
      <AppShell title="Debit Card" headerBack={onBack}>
        <EmptyState icon={<DebitCardIcon className="h-6 w-6" />} title="Card not found" description="It may have been deleted." />
      </AppShell>
    )
  }

  const Icon = getDebitCardIcon(card.icon)
  const expiry = card.expiryMonth && card.expiryYear ? `${String(card.expiryMonth).padStart(2, '0')}/${card.expiryYear}` : '—'

  async function toggleArchive() {
    try {
      await debitCardRepository.update(card!.id, { isArchived: !card!.isArchived })
      showToast(card!.isArchived ? 'Debit card restored' : 'Debit card archived', 'success')
    } catch {
      showToast('Could not update the debit card. Please try again.', 'error')
    }
  }

  async function confirmDelete() {
    const count = await debitCardRepository.getUsageCount(card!.id)
    if (count > 0) {
      showToast('This card has transaction history and cannot be deleted. Archive it instead.', 'error')
      return
    }
    setDeleteConfirmOpen(true)
  }

  async function deleteCard() {
    try {
      await debitCardRepository.delete(card!.id)
      showToast('Debit card deleted', 'success')
      onBack()
    } catch {
      showToast('Could not delete the debit card. Please try again.', 'error')
    }
  }

  return (
    <AppShell
      title={card.name}
      headerBack={onBack}
      headerAction={
        <IconButton aria-label="Edit debit card" onClick={() => setEditOpen(true)}>
          <Pencil className="h-[18px] w-[18px]" />
        </IconButton>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 py-1 text-center">
          <Avatar icon={<Icon className="h-7 w-7" />} color={card.color} size="xl" />
          <p className="text-sm font-semibold text-foreground">{card.name}</p>
          <p className="-mt-2 text-xs text-muted-foreground">
            {card.provider} •••• {card.last4}
          </p>
        </div>

        <BalanceCard
          label="Available balance (linked account)"
          amount={linkedAccount ? formatAmount(linkedAccount.balance, linkedAccount.currency) : '—'}
        />

        <Card padding="none" className="flex flex-col divide-y divide-border">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">Linked account</span>
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              {linkedAccount && <CategoryIcon name={linkedAccount.icon} size={14} color={linkedAccount.color} />}
              {linkedAccount?.name ?? 'Unknown account'}
            </span>
          </div>
          <DetailRow label="Provider" value={card.provider || '—'} />
          <DetailRow label="Card number" value={`•••• ${card.last4}`} />
          <DetailRow label="Expiry" value={expiry} />
          <DetailRow label="Status" value={card.isArchived ? 'Archived' : 'Active'} />
          <DetailRow label="Added" value={format(card.createdAt, 'MMM d, yyyy')} />
        </Card>

        <section className="flex flex-col gap-1">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent transactions</p>

          {isTxLoading && <LoadingState label="Loading transactions..." />}

          {!isTxLoading && txItems.length === 0 && (
            <EmptyState
              icon={<Receipt className="h-6 w-6" />}
              title="No transactions yet"
              description="Expenses paid with this card will show up here."
            />
          )}

          {!isTxLoading && txItems.length > 0 && (
            <Card padding="sm" className="flex flex-col divide-y divide-border">
              {txItems.map((item) => (
                <AccountTransactionRow
                  key={item.transaction.id}
                  transaction={item.transaction}
                  category={item.category}
                  counterAccount={undefined}
                  creditCard={undefined}
                  direction="out"
                />
              ))}
            </Card>
          )}
        </section>

        <div className="flex flex-col gap-2 pb-2">
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Edit debit card
          </Button>
          <Button variant="secondary" onClick={() => (card.isArchived ? toggleArchive() : setArchiveConfirmOpen(true))}>
            {card.isArchived ? (
              <>
                <ArchiveRestore className="h-4 w-4" /> Restore debit card
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" /> Archive debit card
              </>
            )}
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            <Trash2 className="h-4 w-4" /> Delete debit card
          </Button>
        </div>
      </div>

      <BottomSheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit Debit Card">
        <DebitCardForm card={card} onDone={() => setEditOpen(false)} />
      </BottomSheet>

      <ConfirmationDialog
        open={archiveConfirmOpen}
        onClose={() => setArchiveConfirmOpen(false)}
        onConfirm={toggleArchive}
        title="Archive this debit card?"
        description="Archived cards are hidden from active lists and can't be selected for new transactions. Its history stays intact and you can restore it anytime."
        confirmLabel="Archive"
      />

      <ConfirmationDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={deleteCard}
        title="Delete this debit card?"
        description="This card has no transaction history, so it can be safely deleted. This cannot be undone."
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
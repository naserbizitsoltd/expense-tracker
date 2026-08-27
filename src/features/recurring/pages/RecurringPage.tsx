import { useState } from 'react'
import { ArrowLeft, Plus, Repeat } from 'lucide-react'
import { useRecurringList } from '../useRecurring'
import { RecurringListItem } from '../components/RecurringListItem'
import { RecurringFormSheet } from '../components/RecurringFormSheet'
import { RecurringActionsSheet } from '../components/RecurringActionsSheet'
import type { RecurringTransaction } from '@/types/entities'

interface RecurringPageProps {
  onBack: () => void
}

export function RecurringPage({ onBack }: RecurringPageProps) {
  const { expenseItems, incomeItems, isLoading } = useRecurringList()
  const [tab, setTab] = useState<'expense' | 'income'>('expense')
  const [formOpen, setFormOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<RecurringTransaction | null>(null)
  const [selectedRule, setSelectedRule] = useState<RecurringTransaction | null>(null)

  const items = tab === 'expense' ? expenseItems : incomeItems

  return (
    <div className="flex min-h-full flex-col bg-background px-4 pb-24 pt-6">
      <div className="mb-4 flex items-center gap-3 px-1">
        <button
          onClick={onBack}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-elevated text-muted-foreground active:bg-border"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="flex-1 text-xl font-semibold text-foreground">Recurring</h1>
        <button
          onClick={() => {
            setEditingRule(null)
            setFormOpen(true)
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-95 transition-transform"
          aria-label="Add recurring transaction"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="mb-4 flex rounded-xl border border-border bg-surface-elevated p-1">
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-all duration-150 ${
              tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading && <p className="px-1 text-sm text-muted-foreground">Loading…</p>}

      {!isLoading && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-elevated">
            <Repeat size={22} className="text-muted-foreground" />
          </span>
          <p className="text-sm font-medium text-foreground">No recurring {tab === 'expense' ? 'expenses' : 'income'} yet</p>
          <p className="text-xs text-muted-foreground">
            Set up bills, subscriptions, or salary so they get tracked automatically.
          </p>
          <button
            onClick={() => {
              setEditingRule(null)
              setFormOpen(true)
            }}
            className="mt-1 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            + Add Recurring
          </button>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <RecurringListItem key={item.rule.id} item={item} onClick={() => setSelectedRule(item.rule)} />
          ))}
        </div>
      )}

      <RecurringFormSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        rule={editingRule}
        defaultType={tab}
        onSaved={() => setFormOpen(false)}
      />

      <RecurringActionsSheet
        rule={selectedRule}
        onClose={() => setSelectedRule(null)}
        onEdit={() => {
          setEditingRule(selectedRule)
          setSelectedRule(null)
          setFormOpen(true)
        }}
      />
    </div>
  )
}
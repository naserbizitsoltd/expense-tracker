import { useState } from 'react'
import { Plus, Wallet, Landmark, Utensils, Inbox } from 'lucide-react'
import { AppShell } from '@/layouts/AppShell'
import { BottomNav } from '@/layouts/BottomNav'
import {
  Button,
  Card,
  Input,
  Select,
  Badge,
  Avatar,
  Divider,
  EmptyState,
  LoadingState,
  Skeleton,
  Dialog,
  BottomSheet,
  useToast,
  BalanceCard,
  IconButton,
  SearchInput,
  ConfirmationDialog,
} from '@/components/ui'

// TEMPORARY DEMO SCREEN — remove once real feature screens exist.
// Static/fake data only. No database or business logic.

export function DemoScreen() {
  const [activeNav, setActiveNav] = useState('home')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { showToast } = useToast()

  return (
    <AppShell
      title="UI Preview"
      bottomNav={<BottomNav active={activeNav} onChange={setActiveNav} />}
      fab={
        <Button
          size="lg"
          className="h-14 w-14 rounded-full p-0 shadow-lg"
          aria-label="Add"
          onClick={() => showToast('Floating action button pressed', 'info')}
        >
          <Plus className="h-6 w-6" />
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Balance Card */}
        <section>
          <BalanceCard 
            label="Total Balance" 
            amount="$10,172.50" 
            trend={{ value: '2.4% this month', positive: true }} 
          />
        </section>

        <section className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">Buttons</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => showToast('Saved successfully', 'success')}>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger" onClick={() => showToast('Something went wrong', 'error')}>
              Danger
            </Button>
          </div>
        </section>

        <Divider />

        <section className="flex flex-col gap-3">
          <p className="text-sm font-medium text-muted-foreground">Account card example</p>
          <Card className="flex items-center gap-3">
            <Avatar icon={<Wallet className="h-5 w-5" />} color="#3b82f6" />
            <div className="flex-1">
              <p className="text-sm font-medium">Cash Wallet</p>
              <p className="text-xs text-muted-foreground">Cash account</p>
            </div>
            <p className="text-sm font-semibold">$1,240.00</p>
          </Card>
          <Card className="flex items-center gap-3">
            <Avatar icon={<Landmark className="h-5 w-5" />} color="#22c55e" />
            <div className="flex-1">
              <p className="text-sm font-medium">Main Bank</p>
              <p className="text-xs text-muted-foreground">Bank account</p>
            </div>
            <p className="text-sm font-semibold">$8,932.50</p>
          </Card>
        </section>

        <Divider />

        <section className="flex flex-col gap-3">
          <p className="text-sm font-medium text-muted-foreground">Transaction example</p>
          <Card className="flex items-center gap-3">
            <Avatar icon={<Utensils className="h-5 w-5" />} color="#f97316" />
            <div className="flex-1">
              <p className="text-sm font-medium">Food & Dining</p>
              <p className="text-xs text-muted-foreground">Aug 23, 2026</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <p className="text-sm font-semibold text-danger">-$24.50</p>
              <Badge variant="danger">Expense</Badge>
            </div>
          </Card>
        </section>

        <Divider />

        <section className="flex flex-col gap-3">
          <p className="text-sm font-medium text-muted-foreground">Form inputs</p>
          <Input label="Amount" placeholder="0.00" inputMode="decimal" />
          <Select
            label="Category"
            options={[
              { value: 'food', label: 'Food & Dining' },
              { value: 'transport', label: 'Transport' },
              { value: 'other', label: 'Other' },
            ]}
          />
        </section>

        <Divider />

        <section className="flex flex-col gap-3">
          <p className="text-sm font-medium text-muted-foreground">Badges</p>
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="success">Income</Badge>
            <Badge variant="danger">Expense</Badge>
            <Badge variant="warning">Pending</Badge>
          </div>
        </section>

        <Divider />

        <section className="flex flex-col gap-3">
          <p className="text-sm font-medium text-muted-foreground">Overlays</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setDialogOpen(true)}>
              Open dialog
            </Button>
            <Button variant="secondary" onClick={() => setSheetOpen(true)}>
              Open sheet
            </Button>
          </div>
        </section>

        <Divider />

        <section className="flex flex-col gap-3">
          <p className="text-sm font-medium text-muted-foreground">Search & icon buttons</p>
          <SearchInput placeholder="Search transactions" />
          <div className="flex gap-2">
            <IconButton aria-label="Filter" variant="default">
              <Plus className="h-4 w-4" />
            </IconButton>
            <IconButton aria-label="More options">
              <Plus className="h-4 w-4" />
            </IconButton>
          </div>
          <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
            Open confirmation dialog
          </Button>
        </section>

        <ConfirmationDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => showToast('Confirmed', 'success')}
          title="Delete transaction?"
          description="This action cannot be undone."
          confirmLabel="Delete"
          variant="danger"
        />

        <Divider />

        <section className="flex flex-col gap-3">
          <p className="text-sm font-medium text-muted-foreground">States</p>
          <EmptyState
            icon={<Inbox className="h-6 w-6" />}
            title="No transactions yet"
            description="Transactions you add will show up here."
            action={<Button size="sm">Add transaction</Button>}
          />
          <LoadingState label="Loading transactions..." />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-full" />
          </div>
        </section>
      </div>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Example dialog">
        <p className="text-sm text-muted-foreground">
          This is a demo dialog. It will be reused for confirmations and forms in later stages.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setDialogOpen(false)}>Confirm</Button>
        </div>
      </Dialog>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Example bottom sheet">
        <p className="text-sm text-muted-foreground">
          This is a demo bottom sheet, useful later for quick-add actions.
        </p>
        <Button className="mt-4 w-full" onClick={() => setSheetOpen(false)}>
          Close
        </Button>
      </BottomSheet>
    </AppShell>
  )
}
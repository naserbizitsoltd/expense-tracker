import type { CurrencyCode } from './money'

export type AccountType = 'cash' | 'bank' | 'mobile_wallet' | 'card' | 'savings' | 'other'

export type TransactionType =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'loan'
  | 'dps'
  | 'fdr'
  | 'credit_card'
  | 'adjustment'

export type CategoryType = 'income' | 'expense'

export interface Account {
  id: string
  name: string
  type: AccountType
  provider: string | null // institution/provider, e.g. "Dutch-Bangla Bank", "bKash", "Nagad", "Rocket"
  currency: CurrencyCode
  openingBalance: number // integer, smallest unit
  balance: number // integer, smallest unit — cached running balance derived from the ledger, kept in sync when transactions are processed (not recalculated here)
  icon: string // lucide icon name
  color: string // hex
  isArchived: boolean
  accountNumber: string | null // optional nickname/last-digits shown alongside provider
  notes: string | null
  createdAt: number // epoch ms
  updatedAt: number
}

export interface Category {
  id: string
  name: string
  type: CategoryType // transfers and other entity-linked transaction types don't use categories
  icon: string
  color: string
  description: string // optional, empty string when not set
  parentId: string | null // for subcategories
  isDefault: boolean // system/default category — protected from destructive deletion
  isActive: boolean // false = archived, hidden from normal selection but kept for history
  createdAt: number
  updatedAt: number
}

// Direction is redundant with the sign of `amount` but is stored explicitly
// so ledger queries/reports never have to re-derive it from a signed number.
export type LedgerEntryDirection = 'debit' | 'credit' // debit decreases the account balance, credit increases it

export interface LedgerEntry {
  id: string
  transactionId: string // the financial event this entry belongs to
  accountId: string
  amount: number // signed integer, smallest unit. Positive (credit) increases the account balance, negative (debit) decreases it. Always non-zero.
  direction: LedgerEntryDirection
  date: number // epoch ms, denormalized copy of the parent transaction's `date` — lets balance-at-date queries use an index instead of joining back to transactions
  createdAt: number
}

export interface Transaction {
  id: string
  type: TransactionType
  amount: number // integer, smallest unit, always positive
  currency: CurrencyCode
  accountId: string // '' when paid via a credit card instead of a real account — see creditCardId
  toAccountId: string | null // only for transfers
  categoryId: string | null // null for transfers and entity-linked types
  creditCardId: string | null // set when this expense was paid with a credit card instead of accountId. Writes directly to that card's outstandingBalance — no ledger entries are created for it.
  debitCardId: string | null // set when an expense was paid via a Debit Card. Trace tag only — the real ledger entry is written against accountId (the card's linked account), exactly as if that account had been picked directly. Never a separate balance.
  relatedEntityId: string | null // id in loans/dps/fdrs/creditCards when type is loan/dps/fdr/credit_card
  note: string
  date: number // epoch ms, user-set transaction date
  createdAt: number
  updatedAt: number
}

export interface Budget {
  id: string
  name: string // optional display name; empty string falls back to the category name in the UI
  categoryId: string | null // null = an "overall" budget spanning every expense category
  amount: number // integer, smallest unit
  currency: CurrencyCode
  period: 'weekly' | 'monthly' | 'yearly' | 'custom'
  startDate: number
  endDate: number | null // required for 'custom' periods; optional cutoff for the others
  notes: string
  isActive: boolean
  createdAt: number
  updatedAt: number
}
export type LoanDirection = 'given' | 'taken' // given = lent to someone, taken = borrowed from someone
export type LoanStatus = 'active' | 'closed' | 'defaulted'

export interface Loan {
  id: string
  direction: LoanDirection
  counterpartyName: string
  principal: number // integer, smallest unit
  currency: CurrencyCode
  interestRate: number | null // percentage, e.g. 5.5 — not a smallest-unit amount
  accountId: string // account the money moved to/from
  startDate: number
  dueDate: number | null
  status: LoanStatus
  notes: string
  createdAt: number
  updatedAt: number
}

// Auditable history of a single real money movement that pays down a
// loan (taken: money leaving an account back to the lender; given:
// money coming back in from the borrower). Always paired 1:1 with a
// Transaction (type 'loan') that recorded the actual ledger movement
// against `accountId` — mirrors GoalTransaction. Outstanding is never
// stored — it's always principal minus the sum of these.
export interface LoanRepayment {
  id: string
  loanId: string
  amount: number // integer, smallest unit, always positive
  accountId: string // account money moved from (taken) or to (given)
  transactionId: string // the Transaction (type 'loan') that recorded the real ledger movement
  notes: string
  date: number
  createdAt: number
}

// 'renewed' = matured and rolled over into a new FDR (see Fdr.previousFdrId
// on the successor row); 'withdrawn' = closed early via premature
// withdrawal, before maturity. Neither is ever set together with 'paid_out'.
export type DepositStatus = 'active' | 'matured' | 'paid_out' | 'archived' | 'renewed' | 'withdrawn'

// DPS-specific status. Kept separate from DepositStatus (used by Fdr)
// since a DPS's lifecycle is schedule-driven (Active/Completed) plus
// two states DepositStatus has no equivalent for (Paused/Archived).
export type DpsStatus = 'active' | 'completed' | 'paused' | 'archived' | 'paid_out'

export interface Dps {
  id: string
  name: string
  institution: string
  referenceNumber: string | null // optional nickname/account number at the institution
  accountId: string // linked account the installments are drawn from
  monthlyInstallment: number // integer, smallest unit
  currency: CurrencyCode
  interestRate: number | null
  tenureMonths: number // total number of scheduled installments
  startDate: number
  maturityDate: number | null
  status: DpsStatus
  notes: string
  // Opening snapshot for a DPS that already existed in real life before
  // being entered into the app — mirrors Account.openingBalance. Never
  // backed by a ledger movement or a fake DpsContribution record; it is
  // simply added on top of the real (derived) contribution total/count
  // wherever those are computed (see dpsService/dpsProgressService).
  // All three default to 0 for a brand-new DPS.
  openingInstallmentsPaid: number // integer, >= 0, <= tenureMonths
  openingDepositedAmount: number // integer, smallest unit, >= 0
  openingInterestEarned: number // integer, smallest unit, >= 0 — preserved as-is, never recalculated
  createdAt: number
  updatedAt: number
}

// Auditable history of a single real money movement into a DPS.
// Always paired 1:1 with a Transaction (type 'dps') that recorded the
// actual ledger movement against `accountId` — mirrors GoalTransaction
// / LoanRepayment. "Total deposited" and "paid installments" are never
// stored on Dps itself — always derived as the sum/count of these,
// since a contribution can be partial or missed (see dpsService.ts).
export interface DpsContribution {
  id: string
  dpsId: string
  amount: number // integer, smallest unit, always positive
  accountId: string // account the money moved from
  transactionId: string // the Transaction (type 'dps') that recorded the real ledger movement
  notes: string
  date: number
  createdAt: number
}

// Auditable record of a single DPS maturity payout. Always paired 1:1
// with a Transaction (type 'dps') that recorded the real ledger
// movement into `accountId` — mirrors DpsContribution/LoanRepayment.
// depositedAmount is a snapshot of the real contributed total at
// payout time (principal returning, never counted as income);
// profitAmount is only ever what the user explicitly entered at
// payout — never calculated. amount = depositedAmount + profitAmount.
// A DPS can only ever have one of these — its existence, plus the
// Dps.status flip to 'paid_out', is what prevents a second payout.
export interface DpsPayout {
  id: string
  dpsId: string
  depositedAmount: number // integer, smallest unit
  profitAmount: number // integer, smallest unit, >= 0
  amount: number // integer, smallest unit, always positive — depositedAmount + profitAmount
  accountId: string // account the payout was received into
  transactionId: string // the Transaction (type 'dps') that recorded the real ledger movement
  notes: string
  date: number
  createdAt: number
}

export interface Fdr {
  id: string
  name: string
  institution: string
  referenceNumber: string | null // optional nickname/account number at the institution
  accountId: string // linked account the principal was drawn from
  principal: number // integer, smallest unit
  currency: CurrencyCode
  interestRate: number | null
  tenureMonths: number // total locked duration in months
  startDate: number
  maturityDate: number | null
  maturityAmount: number | null // integer, smallest unit — ONLY ever set explicitly by the user; NEVER calculated from interestRate
  notes: string
  status: DepositStatus // stored value is only ever 'active' | 'paid_out' | 'archived' | 'renewed' | 'withdrawn' — 'matured' is never persisted, always computed live from maturityDate (see fdrService.isFdrMatured), same pattern as Dps
  previousFdrId: string | null // set only on a renewal's new FDR — points back at the matured FDR it was rolled over from (see fdrService.renewFdr). Walk this chain to build renewal history; the old row's own status flips to 'renewed'.
  createdAt: number
  updatedAt: number
}

// Auditable record of a single FDR maturity payout. Always paired 1:1
// with a Transaction (type 'fdr') that recorded the real ledger
// movement into `accountId` — mirrors DpsPayout/LoanRepayment.
// principalAmount is a snapshot of the real principal returned
// (never counted as income); profitAmount is only ever what was
// explicitly entered/confirmed at payout time — never calculated.
// amount = principalAmount + profitAmount. An FDR can only ever have
// one of these — its existence, plus the Fdr.status flip to
// 'paid_out', is what prevents a second payout.
export interface FdrPayout {
  id: string
  fdrId: string
  principalAmount: number // integer, smallest unit
  profitAmount: number // integer, smallest unit — >= 0 for a normal maturity payout; may be negative for a 'premature' withdrawal if a penalty reduced the amount below principal
  amount: number // integer, smallest unit, always positive — principalAmount + profitAmount
  accountId: string // account the payout was received into
  transactionId: string // the Transaction (type 'fdr') that recorded the real ledger movement
  type: 'maturity' | 'premature' // 'maturity' = normal Receive Maturity flow (including one written as part of a renewal); 'premature' = early closure via withdrawFdrPrematurely, before the maturity date
  notes: string
  date: number
  createdAt: number
}

export interface CreditCard {
  id: string
  name: string
  issuer: string
  last4: string | null
  creditLimit: number // integer, smallest unit — the card's credit line
  outstandingBalance: number // integer, smallest unit — amount currently owed (liability). Manually tracked until purchases/payments ship.
  currency: CurrencyCode
  billingCycleDay: number // 1-31
  dueDay: number // 1-31
  interestRate: number | null // percentage, e.g. 2.5
  icon: string // lucide icon name
  color: string // hex
  isArchived: boolean
  createdAt: number
  updatedAt: number
}

// A Debit Card is a payment-method wrapper around an existing Account.
// It has NO balance field — its available balance is always
// account.balance, read live. Never sum a debit card's "balance" on
// top of its linked account anywhere; that would double-count money.
export interface DebitCard {
  id: string
  name: string
  provider: string
  last4: string
  accountId: string // the account this card draws from
  expiryMonth: number | null // 1-12
  expiryYear: number | null // full year, e.g. 2028
  icon: string
  color: string
  isArchived: boolean
  createdAt: number
  updatedAt: number
}

export type GoalStatus = 'active' | 'achieved' | 'archived'

export interface Goal {
  id: string
  name: string
  targetAmount: number // integer, smallest unit
  currentAmount: number // integer, smallest unit
  currency: CurrencyCode
  targetDate: number | null
  accountId: string | null // optional linked account the savings live in
  icon: string
  color: string
  notes: string
  status: GoalStatus
  createdAt: number
  updatedAt: number
}

// Auditable history of a single real money movement into or out of a
// goal. Always paired 1:1 with a Transaction (type 'adjustment') that
// recorded the actual ledger movement against `accountId` — this
// table exists purely so the Goal screen can show a fast, goal-scoped
// history without re-deriving it from the general transactions table.
export interface GoalTransaction {
  id: string
  goalId: string
  type: 'contribution' | 'withdrawal'
  amount: number // integer, smallest unit, always positive
  accountId: string // account money moved from (contribution) or to (withdrawal)
  transactionId: string // the Transaction (type 'adjustment') that recorded the real ledger movement
  note: string
  date: number
  createdAt: number
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface RecurringTransaction {
  id: string
  templateType: TransactionType
  amount: number // integer, smallest unit
  currency: CurrencyCode
  accountId: string
  toAccountId: string | null
  categoryId: string | null
  note: string
  frequency: RecurrenceFrequency
  interval: number // e.g. every 2 weeks
  startDate: number
  endDate: number | null
  nextRunDate: number
  lastRunDate: number | null
  isActive: boolean
  createdAt: number
  updatedAt: number
}

// Singleton row, fixed id APP_SETTINGS_ID (see src/db/id.ts)
export interface AppSettings {
  id: string
  defaultCurrency: CurrencyCode
  locale: string
  theme: 'light' | 'dark' | 'system'
  notificationsEnabled: boolean // master on/off for the reminder system — see services/notificationService.ts
  reminderOffsetDays: number[] // e.g. [1, 3, 7] — how many days before a due/maturity/target date a reminder should fire
  updatedAt: number
}

// Which financial entity a reminder was generated for.
export type ReminderType = 'recurring' | 'dps' | 'loan' | 'fdr' | 'goal'

// One row per reminder actually surfaced to the user (browser
// notification fired and/or shown in the in-app Notification Center).
// Keyed so the same entity/due-date/offset combination is never shown
// twice, even across app restarts — see
// services/notificationService.reminderKey and
// features/notifications/useReminders.ts. Purely local bookkeeping;
// never feeds into any financial calculation.
export interface NotificationLogEntry {
  id: string // reminderKey(type, entityId, dueDate, offsetDays) — also the dedupe key
  type: ReminderType
  entityId: string // id of the RecurringTransaction/Dps/Loan/Fdr/Goal this reminder is about
  title: string
  body: string
  dueDate: number // epoch ms of the underlying due/maturity/target date this reminder relates to
  shownAt: number
}

// Singleton row, fixed id DB_METADATA_ID (see src/db/id.ts)
export interface DbMetadata {
  id: string
  schemaVersion: number
  lastBackupAt: number | null
  lastMigrationAt: number | null
  createdAt: number
  updatedAt: number
}
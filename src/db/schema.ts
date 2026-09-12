import Dexie, { type Table } from 'dexie'
import type {
  Account,
  Category,
  Transaction,
  LedgerEntry,
  Budget,
  Loan,
  LoanRepayment,
  Dps,
  DpsContribution,
  DpsPayout,
  Fdr,
  FdrPayout,
  CreditCard,
  DebitCard,
  Goal,
  GoalTransaction,
  RecurringTransaction,
  AppSettings,
  DbMetadata,
  NotificationLogEntry,
  AccountReconciliation,
} from '@/types/entities'
import { DB_METADATA_ID } from './id'

export const SCHEMA_VERSION = 23

export class AppDatabase extends Dexie {
  accounts!: Table<Account, string>
  categories!: Table<Category, string>
  transactions!: Table<Transaction, string>
  budgets!: Table<Budget, string>
  loans!: Table<Loan, string>
  loanRepayments!: Table<LoanRepayment, string>
  dps!: Table<Dps, string>
  dpsContributions!: Table<DpsContribution, string>
  dpsPayouts!: Table<DpsPayout, string>
  fdrs!: Table<Fdr, string>
  fdrPayouts!: Table<FdrPayout, string>
  creditCards!: Table<CreditCard, string>
  debitCards!: Table<DebitCard, string>
  goals!: Table<Goal, string>
  goalTransactions!: Table<GoalTransaction, string>
  recurringTransactions!: Table<RecurringTransaction, string>
  appSettings!: Table<AppSettings, string>
  metadata!: Table<DbMetadata, string>
  ledgerEntries!: Table<LedgerEntry, string>
  notificationLog!: Table<NotificationLogEntry, string>
  reconciliations!: Table<AccountReconciliation, string>

  constructor() {
    super('ExpenseTrackerDB')

    // v1 — original schema, kept exactly as shipped so upgrading users
    // never lose existing data. Do not edit this block; add changes as
    // a new version instead.
    this.version(1).stores({
      accounts: 'id, type, isArchived, createdAt',
      categories: 'id, type, parentId, isDefault',
      transactions: 'id, type, accountId, toAccountId, categoryId, date, createdAt',
      budgets: 'id, categoryId, period, startDate',
    })

    // v2 — adds the remaining entities needed for loans, DPS, FDR,
    // credit cards, savings goals, recurring transactions, app settings
    // and db metadata. accounts/categories/transactions/budgets keep
    // their v1 index definitions unchanged; the new non-indexed fields
    // added to Account/Category/Transaction/Budget are backfilled below
    // so records written under v1 stay valid.
    this.version(2)
      .stores({
        loans: 'id, direction, status, accountId, dueDate, createdAt',
        dps: 'id, status, accountId, maturityDate, createdAt',
        fdrs: 'id, status, accountId, maturityDate, createdAt',
        creditCards: 'id, isArchived, createdAt',
        goals: 'id, status, accountId, targetDate, createdAt',
        recurringTransactions: 'id, isActive, nextRunDate, accountId, createdAt',
        appSettings: 'id',
        metadata: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table('accounts')
          .toCollection()
          .modify((account: Account) => {
            if (account.provider === undefined) account.provider = null
            if (account.openingBalance === undefined) account.openingBalance = account.balance ?? 0
          })

        await tx
          .table('categories')
          .toCollection()
          .modify((category: Category) => {
            if (category.updatedAt === undefined) category.updatedAt = category.createdAt
          })

        await tx
          .table('transactions')
          .toCollection()
          .modify((txn: Transaction) => {
            if (txn.relatedEntityId === undefined) txn.relatedEntityId = null
          })

        await tx
          .table('budgets')
          .toCollection()
          .modify((budget: Budget) => {
            if (budget.updatedAt === undefined) budget.updatedAt = budget.createdAt
          })

        const metaTable = tx.table<DbMetadata, string>('metadata')
        const existingMeta = await metaTable.get(DB_METADATA_ID)
        if (!existingMeta) {
          const now = Date.now()
          await metaTable.add({
            id: DB_METADATA_ID,
            schemaVersion: 2,
            lastBackupAt: null,
            lastMigrationAt: now,
            createdAt: now,
            updatedAt: now,
          })
        }
      })

    // v3 — adds accountNumber (optional nickname/last digits) and notes
    // to accounts, needed for the Account Management screens. No index
    // changes; existing accounts are backfilled with null for both.
    this.version(3)
      .stores({})
      .upgrade(async (tx) => {
        await tx
          .table('accounts')
          .toCollection()
          .modify((account: Account) => {
            if (account.accountNumber === undefined) account.accountNumber = null
            if (account.notes === undefined) account.notes = null
          })

        await tx.table<DbMetadata, string>('metadata').update(DB_METADATA_ID, {
          schemaVersion: 3,
          lastMigrationAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

    // v4 — Category Management. Adds `description` and `isActive` to
    // categories (isActive powers archive/restore). No index change
    // needed for description; isActive is indexed since the category
    // screens filter active vs archived. Existing categories are
    // backfilled as active with an empty description so nothing
    // already saved is affected.
    this.version(4)
      .stores({
        categories: 'id, type, parentId, isDefault, isActive',
      })
      .upgrade(async (tx) => {
        await tx
          .table('categories')
          .toCollection()
          .modify((category: Category) => {
            if (category.isActive === undefined) category.isActive = true
            if (category.description === undefined) category.description = ''
          })

        await tx.table<DbMetadata, string>('metadata').update(DB_METADATA_ID, {
          schemaVersion: 4,
          lastMigrationAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

    // v5 — Core financial ledger engine. Adds the `ledgerEntries` table,
    // the single source of truth double/single-entry records that back
    // every transaction. No existing table's stored data is touched;
    // accounts/categories/transactions/budgets keep every record they
    // already had. `[accountId+date]` powers efficient "balance as of
    // a given date" queries without a table scan; `transactionId` is
    // indexed so a transaction's entries can be found and replaced
    // atomically on edit/delete.
    this.version(5)
      .stores({
        ledgerEntries: 'id, transactionId, accountId, date, [accountId+date]',
      })
      .upgrade(async (tx) => {
        await tx.table<DbMetadata, string>('metadata').update(DB_METADATA_ID, {
          schemaVersion: 5,
          lastMigrationAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

    // v6 — Budget Management. Adds `name`, `endDate`, and `isActive`
    // to budgets, and widens `categoryId` to allow null (an "overall"
    // budget spanning every expense category) and `period` to allow
    // 'custom'. No index changes — categoryId keeps its v1 index; a
    // null categoryId is simply excluded from that index, which is
    // fine since overall budgets are never looked up by category.
    // Existing budgets are backfilled as active, unnamed (the UI
    // falls back to their category's name), with no end date.
    this.version(6)
      .stores({})
      .upgrade(async (tx) => {
        await tx
          .table('budgets')
          .toCollection()
          .modify((budget: Budget) => {
            if (budget.name === undefined) budget.name = ''
            if (budget.endDate === undefined) budget.endDate = null
            if (budget.isActive === undefined) budget.isActive = true
          })

        await tx.table<DbMetadata, string>('metadata').update(DB_METADATA_ID, {
          schemaVersion: 6,
          lastMigrationAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

    // v7 — Savings Goals. Adds the `goalTransactions` table (the
    // auditable history of every real money movement into/out of a
    // goal) and backfills `notes` on existing goals. Contributing to
    // or withdrawing from a goal writes a real ledger entry against
    // the real account (type 'adjustment', so it never pollutes
    // Expense/Income/Category/Budget totals) plus one row here — see
    // src/services/goalService.ts.
    this.version(7)
      .stores({
        goalTransactions: 'id, goalId, accountId, transactionId, date',
      })
      .upgrade(async (tx) => {
        await tx
          .table('goals')
          .toCollection()
          .modify((goal: Goal) => {
            if (goal.notes === undefined) goal.notes = ''
          })

        await tx.table<DbMetadata, string>('metadata').update(DB_METADATA_ID, {
          schemaVersion: 7,
          lastMigrationAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

    // v8 — Credit Card management (basic). Adds `outstandingBalance` to
    // CreditCard — the manually-tracked amount currently owed. It is a
    // liability and is NEVER summed into Total Available Money; it has
    // its own total in useCreditCards. The `creditCards` table has
    // existed since v2 with no UI writing to it, so this is a safe
    // backfill to 0 for any pre-existing rows.
    this.version(8)
      .stores({})
      .upgrade(async (tx) => {
        await tx
          .table('creditCards')
          .toCollection()
          .modify((card: CreditCard) => {
            if (card.outstandingBalance === undefined) card.outstandingBalance = 0
          })

        await tx.table<DbMetadata, string>('metadata').update(DB_METADATA_ID, {
          schemaVersion: 8,
          lastMigrationAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

    // v9 — Credit Card icon/color, needed for the visual card list.
    // Backfilled so any card created under v8 (no icon/color yet) still
    // renders correctly.
    this.version(9)
      .stores({})
      .upgrade(async (tx) => {
        await tx
          .table('creditCards')
          .toCollection()
          .modify((card: CreditCard) => {
            if (card.icon === undefined) card.icon = 'CreditCard'
            if (card.color === undefined) card.color = '#6366f1'
          })

        await tx.table<DbMetadata, string>('metadata').update(DB_METADATA_ID, {
          schemaVersion: 9,
          lastMigrationAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

    // v10 — Credit Card purchases. Adds `creditCardId` to Transaction so
    // an expense can be paid with a credit card instead of a real
    // account (accountId is '' in that case). Indexed so Credit Card
    // Details can query its purchase history directly. Credit-card
    // expenses never create ledger entries — see
    // services/transactionService.ts — so only the new field itself
    // needs backfilling on existing rows.
    this.version(10)
      .stores({
        transactions: 'id, type, accountId, toAccountId, categoryId, creditCardId, date, createdAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table('transactions')
          .toCollection()
          .modify((t: Transaction) => {
            if (t.creditCardId === undefined) t.creditCardId = null
          })

        await tx.table<DbMetadata, string>('metadata').update(DB_METADATA_ID, {
          schemaVersion: 10,
          lastMigrationAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

    // v11 — Debit Cards. A Debit Card is a payment-method wrapper
    // around an existing Account — no balance of its own, no ledger
    // entries of its own. Expenses paid with one write a normal ledger
    // entry against the linked account, same as picking that account
    // directly. `debitCardId` on Transaction is only a trace tag for
    // history/archive checks — never summed separately.
    this.version(11)
      .stores({
        debitCards: 'id, accountId, isArchived, createdAt',
        transactions: 'id, type, accountId, toAccountId, categoryId, creditCardId, debitCardId, date, createdAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table('transactions')
          .toCollection()
          .modify((t: Transaction) => {
            if (t.debitCardId === undefined) t.debitCardId = null
          })

        await tx.table<DbMetadata, string>('metadata').update(DB_METADATA_ID, {
          schemaVersion: 11,
          lastMigrationAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

    // v12 — Loan money movement. Adds `loanRepayments`, the auditable
    // history of every real repayment against a loan (mirrors
    // goalTransactions). Loan disbursement and repayment now write real
    // ledger entries (type 'loan') against a real account — never a
    // separate balance, never plain income/expense. No existing table's
    // data is touched; this is purely additive.
    this.version(12)
      .stores({
        loanRepayments: 'id, loanId, accountId, transactionId, date',
      })
      .upgrade(async (tx) => {
        await tx.table<DbMetadata, string>('metadata').update(DB_METADATA_ID, {
          schemaVersion: 12,
          lastMigrationAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

    // v13 — DPS money movement. Adds `dpsContributions`, the auditable
    // history of every real contribution into a DPS (mirrors
    // loanRepayments / goalTransactions). Contributions now write real
    // ledger entries (type 'dps') against a real account — never a
    // separate balance, never plain expense. `dps` has existed since
    // v2 with no UI writing to it, so existing rows (if any) are
    // backfilled with the new `referenceNumber`/`notes` fields and
    // their status remapped onto the new DpsStatus values ('matured'
    // had no real equivalent yet since nothing ever completed a
    // schedule, so it maps to 'completed'; 'closed' maps to
    // 'archived'). No existing table's data is deleted.
    this.version(13)
      .stores({
        dpsContributions: 'id, dpsId, accountId, transactionId, date',
      })
      .upgrade(async (tx) => {
        await tx
          .table('dps')
          .toCollection()
          .modify((d: Omit<Dps, 'status'> & { status: string }) => {
            if (d.referenceNumber === undefined) d.referenceNumber = null
            if (d.notes === undefined) d.notes = ''
            if (d.status === 'matured') d.status = 'completed'
            if (d.status === 'closed') d.status = 'archived'
          })

        await tx.table<DbMetadata, string>('metadata').update(DB_METADATA_ID, {
          schemaVersion: 13,
          lastMigrationAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

    // v14 — DPS maturity payout. Adds `dpsPayouts`, the auditable
    // record of a DPS's one-time maturity payout (mirrors
    // dpsContributions / loanRepayments). A payout writes a real
    // ledger entry (type 'dps') crediting the chosen account — the
    // returning principal is never counted as Income; only an
    // explicitly entered profit amount is ever added on top. No
    // existing table's data is touched; purely additive.
    this.version(14)
      .stores({
        dpsPayouts: 'id, dpsId, accountId, transactionId, date',
      })
      .upgrade(async (tx) => {
        await tx.table<DbMetadata, string>('metadata').update(DB_METADATA_ID, {
          schemaVersion: 14,
          lastMigrationAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

    // v15 — FDR (Fixed Deposit Receipt). Adds `fdrPayouts` (mirrors
    // dpsPayouts) and backfills the new `referenceNumber`,
    // `tenureMonths`, `maturityAmount`, and `notes` fields on `fdrs` —
    // that table has existed since v2 with no UI writing to it, so
    // this is a safe backfill for any pre-existing rows. Opening an
    // FDR now writes a real ledger movement (type 'fdr') against a
    // real account — never a separate balance, never plain Expense.
    // No existing table's data is deleted.
    this.version(15)
      .stores({
        fdrPayouts: 'id, fdrId, accountId, transactionId, date',
      })
      .upgrade(async (tx) => {
        await tx
          .table('fdrs')
          .toCollection()
          .modify(
            (
              f: Omit<Fdr, 'referenceNumber' | 'tenureMonths' | 'maturityAmount' | 'notes'> & {
                referenceNumber?: string | null
                tenureMonths?: number
                maturityAmount?: number | null
                notes?: string
              }
            ) => {
              if (f.referenceNumber === undefined) f.referenceNumber = null
              if (f.tenureMonths === undefined) f.tenureMonths = 0
              if (f.maturityAmount === undefined) f.maturityAmount = null
              if (f.notes === undefined) f.notes = ''
            }
          )

        await tx.table<DbMetadata, string>('metadata').update(DB_METADATA_ID, {
          schemaVersion: 15,
          lastMigrationAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

    // v16 — FDR renewal/rollover and premature withdrawal. Adds
    // `previousFdrId` to `fdrs` (points a renewed FDR back at the
    // matured FDR it rolled over from — see fdrService.renewFdr; now
    // indexed so the forward direction of the chain can be queried via
    // fdrRepository.getByPreviousFdr) and `type` to `fdrPayouts`
    // ('maturity' | 'premature', distinguishing a normal Receive
    // Maturity payout from an early closure). Existing fdrPayouts rows
    // predate premature withdrawal, so they are all real maturity
    // payouts and are backfilled as 'maturity'. No existing table's
    // data is deleted.
    this.version(16)
      .stores({
        fdrs: 'id, status, accountId, maturityDate, previousFdrId, createdAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table('fdrs')
          .toCollection()
          .modify((f: Omit<Fdr, 'previousFdrId'> & { previousFdrId?: string | null }) => {
            if (f.previousFdrId === undefined) f.previousFdrId = null
          })

        await tx
          .table('fdrPayouts')
          .toCollection()
          .modify((p: Omit<FdrPayout, 'type'> & { type?: 'maturity' | 'premature' }) => {
            if (p.type === undefined) p.type = 'maturity'
          })

        await tx.table<DbMetadata, string>('metadata').update(DB_METADATA_ID, {
          schemaVersion: 16,
          lastMigrationAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

    // v17 — adds an optional free-text `notes` field to Budget (spec
    // requires it as a creatable/editable field). Indexes unchanged;
    // existing budgets are backfilled with an empty string so they
    // keep working without any data loss.
    this.version(17)
      .stores({})
      .upgrade(async (tx) => {
        await tx
          .table('budgets')
          .toCollection()
          .modify((b: Omit<Budget, 'notes'> & { notes?: string }) => {
            if (b.notes === undefined) b.notes = ''
          })

        await tx.table<DbMetadata, string>('metadata').update(DB_METADATA_ID, {
          schemaVersion: 17,
          lastMigrationAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

    // v18 — Local notification/reminder system. Adds the
    // `notificationLog` table (dedupe + Notification Center history for
    // reminders about upcoming recurring transactions, DPS
    // installments, loan due dates, FDR maturity, and goal target
    // dates — see services/notificationService.ts) and backfills the
    // new `notificationsEnabled` / `reminderOffsetDays` fields on the
    // existing appSettings singleton row (off by default; existing
    // installs never get surprise notifications). No existing table's
    // data is touched.
    this.version(18)
      .stores({
        notificationLog: 'id, type, entityId, dueDate, shownAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table('appSettings')
          .toCollection()
          .modify(
            (
              s: Omit<AppSettings, 'notificationsEnabled' | 'reminderOffsetDays'> & {
                notificationsEnabled?: boolean
                reminderOffsetDays?: number[]
              }
            ) => {
              if (s.notificationsEnabled === undefined) s.notificationsEnabled = false
              if (s.reminderOffsetDays === undefined) s.reminderOffsetDays = [1, 3, 7]
            }
          )

        await tx.table<DbMetadata, string>('metadata').update(DB_METADATA_ID, {
          schemaVersion: 18,
          lastMigrationAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

    // v19 — Existing/ongoing DPS support. Backfills `openingInstallmentsPaid`,
    // `openingDepositedAmount`, and `openingInterestEarned` on `dps` (mirrors
    // Account.openingBalance) so a DPS that already existed in real life can
    // be entered at its current state without fabricating past contribution
    // records. All existing rows get 0 for each — they behave exactly as
    // before. No existing table's data is deleted.
    this.version(19)
      .stores({})
      .upgrade(async (tx) => {
        await tx
          .table('dps')
          .toCollection()
          .modify(
            (
              d: Omit<Dps, 'openingInstallmentsPaid' | 'openingDepositedAmount' | 'openingInterestEarned'> & {
                openingInstallmentsPaid?: number
                openingDepositedAmount?: number
                openingInterestEarned?: number
              }
            ) => {
              if (d.openingInstallmentsPaid === undefined) d.openingInstallmentsPaid = 0
              if (d.openingDepositedAmount === undefined) d.openingDepositedAmount = 0
              if (d.openingInterestEarned === undefined) d.openingInterestEarned = 0
            }
          )

        await tx.table<DbMetadata, string>('metadata').update(DB_METADATA_ID, {
          schemaVersion: 19,
          lastMigrationAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

    // v20 — Account Reconciliation. Adds the `reconciliations` table: an
    // auditable history of every "Reconcile Account" run (see
    // services/accountReconciliationService.ts) — app balance vs actual
    // balance, the difference, and the adjustment transaction (if any)
    // that was written to correct it. Purely additive; no existing
    // table's data is touched, and account.balance is never written
    // directly by this feature — only via the same
    // reconcileAccountBalanceCache path every other money movement uses.
    this.version(20)
      .stores({
        reconciliations: 'id, accountId, date',
      })
      .upgrade(async (tx) => {
        await tx.table<DbMetadata, string>('metadata').update(DB_METADATA_ID, {
          schemaVersion: 20,
          lastMigrationAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

    // v21 — Loan processing fee + flexible interest/repayment. Adds
    // `processingFee` to `loans` (deducted from the cash actually
    // disbursed into the account on a 'taken' loan; never reduces
    // `principal`, the amount still owed — see
    // loanService.disburseLoan/getLoanAmountReceived) and
    // `principalPortion` / `interestPortion` / `calculatedInterest` /
    // `isInterestOverridden` to `loanRepayments`, so each repayment's
    // real principal-vs-interest split is recorded instead of treating
    // the whole `amount` as principal.
    //
    // Outstanding principal is now derived as
    // `loan.principal - sum(principalPortion)` instead of
    // `loan.principal - sum(amount)` (see loanService.getLoanOutstanding)
    // — existing rows are backfilled with `principalPortion = amount`
    // and `interestPortion = 0`, which reproduces the exact old
    // behavior for every repayment recorded before this migration. No
    // existing table's data is deleted.
    this.version(21)
      .stores({})
      .upgrade(async (tx) => {
        await tx
          .table('loans')
          .toCollection()
          .modify((l: Omit<Loan, 'processingFee'> & { processingFee?: number }) => {
            if (l.processingFee === undefined) l.processingFee = 0
          })

        await tx
          .table('loanRepayments')
          .toCollection()
          .modify(
            (
              r: Omit<LoanRepayment, 'principalPortion' | 'interestPortion' | 'calculatedInterest' | 'isInterestOverridden'> & {
                principalPortion?: number
                interestPortion?: number
                calculatedInterest?: number | null
                isInterestOverridden?: boolean
              }
            ) => {
              if (r.principalPortion === undefined) r.principalPortion = r.amount
              if (r.interestPortion === undefined) r.interestPortion = 0
              if (r.calculatedInterest === undefined) r.calculatedInterest = null
              if (r.isInterestOverridden === undefined) r.isInterestOverridden = false
            }
          )

        await tx.table<DbMetadata, string>('metadata').update(DB_METADATA_ID, {
          schemaVersion: 21,
          lastMigrationAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

    // v22 — Loan tenure + interest rate type, interest calculator
    // removed. Adds `tenureMonths` (explicit, user-entered loan
    // duration — replaces deriving tenure from startDate/dueDate) and
    // `interestRateType` ('monthly' | 'yearly' — how `interestRate`
    // should be read) to `loans`. Existing rows are backfilled with
    // tenureMonths = null and interestRateType = 'yearly' when they
    // have an interestRate (matches the old hardcoded annual-rate
    // assumption), or null when they don't. No existing data is
    // deleted.
    this.version(22)
      .stores({})
      .upgrade(async (tx) => {
        await tx
          .table('loans')
          .toCollection()
          .modify((l: Omit<Loan, 'tenureMonths' | 'interestRateType'> & { tenureMonths?: number | null; interestRateType?: 'monthly' | 'yearly' | null }) => {
            if (l.tenureMonths === undefined) l.tenureMonths = null
            if (l.interestRateType === undefined) l.interestRateType = l.interestRate != null ? 'yearly' : null
          })

        await tx.table<DbMetadata, string>('metadata').update(DB_METADATA_ID, {
          schemaVersion: 22,
          lastMigrationAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

    // v23 — Tags + split transactions. Adds `tags` (multi-entry indexed,
    // so #tag search can use an index instead of a table scan) and
    // `splitGroupId` (groups the category-slices of one real-world
    // purchase recorded via services/transactionService.createSplitExpense
    // — each slice is an ordinary expense transaction, just tagged with a
    // shared id) to `transactions`. Existing rows are backfilled with an
    // empty tag list and no split group, so nothing already saved changes
    // behavior.
    this.version(23)
      .stores({
        transactions:
          'id, type, accountId, toAccountId, categoryId, creditCardId, debitCardId, splitGroupId, date, createdAt, *tags',
      })
      .upgrade(async (tx) => {
        await tx
          .table('transactions')
          .toCollection()
          .modify((t: Omit<Transaction, 'tags' | 'splitGroupId'> & { tags?: string[]; splitGroupId?: string | null }) => {
            if (t.tags === undefined) t.tags = []
            if (t.splitGroupId === undefined) t.splitGroupId = null
          })

        await tx.table<DbMetadata, string>('metadata').update(DB_METADATA_ID, {
          schemaVersion: 23,
          lastMigrationAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

    // v24 — Split expense descriptions. Adds `splitDescription`, the
    // shared/central description for a split group (shown as the list
    // heading), kept separate from each slice's own `note` (shown as
    // that slice's category-wise subheading). No index needed — it's
    // never queried by, only displayed alongside splitGroupId.
    // Existing rows (all pre-dating this field) backfill to null.
    this.version(24)
      .stores({})
      .upgrade(async (tx) => {
        await tx
          .table('transactions')
          .toCollection()
          .modify((t: Omit<Transaction, 'splitDescription'> & { splitDescription?: string | null }) => {
            if (t.splitDescription === undefined) t.splitDescription = null
          })

        await tx.table<DbMetadata, string>('metadata').update(DB_METADATA_ID, {
          schemaVersion: 24,
          lastMigrationAt: Date.now(),
          updatedAt: Date.now(),
        })
      })
  }
}
export const db = new AppDatabase()
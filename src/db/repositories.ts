import type { Table, UpdateSpec } from 'dexie'
import { db } from './schema'
import { toAppDbError } from './errors'
import { APP_SETTINGS_ID, DB_METADATA_ID } from './id'
import type {
  Account,
  Category,
  CategoryType,
  Transaction,
  TransactionType,
  LedgerEntry,
  Budget,
  Loan,
  LoanStatus,
  LoanRepayment,
  Dps,
  DpsStatus,
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

/**
 * Generic CRUD wrapper over a single Dexie table. Keeps raw IndexedDB /
 * Dexie calls out of components and future services — everything talks
 * to a repository, never `db.<table>` directly. `update` always bumps
 * `updatedAt`, so every entity using this must declare that field.
 */
function createRepository<T extends { id: string; updatedAt: number }>(table: Table<T, string>) {
  return {
    async getAll(): Promise<T[]> {
      try {
        return await table.toArray()
      } catch (error) {
        throw toAppDbError(error)
      }
    },

    async getById(id: string): Promise<T | undefined> {
      try {
        return await table.get(id)
      } catch (error) {
        throw toAppDbError(error)
      }
    },

    async create(record: T): Promise<string> {
      try {
        return await table.add(record)
      } catch (error) {
        throw toAppDbError(error)
      }
    },

    async update(id: string, changes: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<number> {
      try {
        const patch = { ...changes, updatedAt: Date.now() } as UpdateSpec<T>
        return await table.update(id, patch)
      } catch (error) {
        throw toAppDbError(error)
      }
    },

    async delete(id: string): Promise<void> {
      try {
        await table.delete(id)
      } catch (error) {
        throw toAppDbError(error)
      }
    },

    async count(): Promise<number> {
      try {
        return await table.count()
      } catch (error) {
        throw toAppDbError(error)
      }
    },
  }
}

export const accountRepository = {
  ...createRepository<Account>(db.accounts),
  async getActive(): Promise<Account[]> {
    try {
      const accounts = await db.accounts.toArray()
      return accounts.filter((a) => !a.isArchived)
    } catch (error) {
      throw toAppDbError(error)
    }
  },
}

// Reconciliation history is never created/edited/deleted outside
// accountReconciliationService.ts — this repository only exposes read
// paths, same pattern as ledgerEntryRepository.
export const reconciliationRepository = {
  async getByAccount(accountId: string): Promise<AccountReconciliation[]> {
    try {
      return await db.reconciliations.where('accountId').equals(accountId).reverse().sortBy('date')
    } catch (error) {
      throw toAppDbError(error)
    }
  },
  async getLastByAccount(accountId: string): Promise<AccountReconciliation | undefined> {
    try {
      const history = await db.reconciliations.where('accountId').equals(accountId).reverse().sortBy('date')
      return history[0]
    } catch (error) {
      throw toAppDbError(error)
    }
  },
}

export const categoryRepository = {
  ...createRepository<Category>(db.categories),
  async getByType(type: CategoryType): Promise<Category[]> {
    try {
      return await db.categories.where('type').equals(type).toArray()
    } catch (error) {
      throw toAppDbError(error)
    }
  },
  // How many transactions reference a single category — used to decide
  // whether it's safe to hard-delete or whether it must be archived
  // instead.
  async getUsageCount(categoryId: string): Promise<number> {
    try {
      return await db.transactions.where('categoryId').equals(categoryId).count()
    } catch (error) {
      throw toAppDbError(error)
    }
  },
  // Usage counts for every category at once, keyed by category id —
  // avoids one query per row when rendering a list.
  async getUsageCounts(): Promise<Record<string, number>> {
    try {
      const transactions = await db.transactions.toArray()
      const counts: Record<string, number> = {}
      for (const t of transactions) {
        if (t.categoryId) counts[t.categoryId] = (counts[t.categoryId] ?? 0) + 1
      }
      return counts
    } catch (error) {
      throw toAppDbError(error)
    }
  },
}

export const transactionRepository = {
  ...createRepository<Transaction>(db.transactions),
  async getByAccount(accountId: string): Promise<Transaction[]> {
    try {
      return await db.transactions.where('accountId').equals(accountId).reverse().sortBy('date')
    } catch (error) {
      throw toAppDbError(error)
    }
  },
  async getByDateRange(startDate: number, endDate: number): Promise<Transaction[]> {
    try {
      return await db.transactions.where('date').between(startDate, endDate, true, true).toArray()
    } catch (error) {
      throw toAppDbError(error)
    }
  },
  // Newest-first list of transactions of a single type — used by the
  // transaction history screen, starting with expenses.
  async getByType(type: TransactionType): Promise<Transaction[]> {
    try {
      return await db.transactions.where('type').equals(type).reverse().sortBy('date')
    } catch (error) {
      throw toAppDbError(error)
    }
  },
  // Purchases made with a single credit card, newest first — powers the
  // "Recent purchases" list on Credit Card Details.
  async getByCreditCard(creditCardId: string): Promise<Transaction[]> {
    try {
      return await db.transactions.where('creditCardId').equals(creditCardId).reverse().sortBy('date')
    } catch (error) {
      throw toAppDbError(error)
    }
  },
  // Transactions paid with a single debit card, newest first — powers
  // the "Recent transactions" list on Debit Card Details. These are
  // ordinary ledger-backed expenses; debitCardId is only a trace tag.
  async getByDebitCard(debitCardId: string): Promise<Transaction[]> {
    try {
      return await db.transactions.where('debitCardId').equals(debitCardId).reverse().sortBy('date')
    } catch (error) {
      throw toAppDbError(error)
    }
  },
  // Every slice of one split receipt, oldest-first — powers grouped
  // display/edit of a split expense.
  async getBySplitGroup(splitGroupId: string): Promise<Transaction[]> {
    try {
      return await db.transactions.where('splitGroupId').equals(splitGroupId).sortBy('date')
    } catch (error) {
      throw toAppDbError(error)
    }
  },
}
// Ledger entries are never created, edited, or deleted directly through
// this repository outside of the transaction engine (src/services) — it
// only exposes read paths for balance calculation and history/reporting.
export const ledgerEntryRepository = {
  async getByAccount(accountId: string): Promise<LedgerEntry[]> {
    try {
      return await db.ledgerEntries.where('accountId').equals(accountId).sortBy('date')
    } catch (error) {
      throw toAppDbError(error)
    }
  },
  async getByAccounts(accountIds: string[]): Promise<LedgerEntry[]> {
    try {
      if (accountIds.length === 0) return []
      return await db.ledgerEntries.where('accountId').anyOf(accountIds).toArray()
    } catch (error) {
      throw toAppDbError(error)
    }
  },
  async getByTransaction(transactionId: string): Promise<LedgerEntry[]> {
    try {
      return await db.ledgerEntries.where('transactionId').equals(transactionId).toArray()
    } catch (error) {
      throw toAppDbError(error)
    }
  },
  async getByAccountUpTo(accountId: string, atDate: number): Promise<LedgerEntry[]> {
    try {
      return await db.ledgerEntries
        .where('[accountId+date]')
        .between([accountId, -Infinity], [accountId, atDate], true, true)
        .toArray()
    } catch (error) {
      throw toAppDbError(error)
    }
  },
}

export const budgetRepository = {
  ...createRepository<Budget>(db.budgets),
  async getActive(): Promise<Budget[]> {
    try {
      // Filtered in JS rather than an index query — same reasoning as
      // accountRepository.getActive(): IndexedDB can't index booleans.
      const all = await db.budgets.toArray()
      return all.filter((b) => b.isActive)
    } catch (error) {
      throw toAppDbError(error)
    }
  },
}

export const loanRepository = {
  ...createRepository<Loan>(db.loans),
  async getByStatus(status: LoanStatus): Promise<Loan[]> {
    try {
      return await db.loans.where('status').equals(status).toArray()
    } catch (error) {
      throw toAppDbError(error)
    }
  },
}

export const loanRepaymentRepository = {
  async getByLoan(loanId: string): Promise<LoanRepayment[]> {
    try {
      return await db.loanRepayments.where('loanId').equals(loanId).reverse().sortBy('date')
    } catch (error) {
      throw toAppDbError(error)
    }
  },
  // Every repayment across every loan — powers the Reports "Loan
  // Repayments" total, which needs a date-range view across all loans
  // rather than one loan at a time.
  async getAll(): Promise<LoanRepayment[]> {
    try {
      return await db.loanRepayments.toArray()
    } catch (error) {
      throw toAppDbError(error)
    }
  },
}
export const dpsRepository = {
  ...createRepository<Dps>(db.dps),
  async getByStatus(status: DpsStatus): Promise<Dps[]> {
    try {
      return await db.dps.where('status').equals(status).toArray()
    } catch (error) {
      throw toAppDbError(error)
    }
  },
}

export const dpsContributionRepository = {
  async getByDps(dpsId: string): Promise<DpsContribution[]> {
    try {
      return await db.dpsContributions.where('dpsId').equals(dpsId).reverse().sortBy('date')
    } catch (error) {
      throw toAppDbError(error)
    }
  },
  // Every contribution across every DPS — powers the Reports "DPS
  // Contributions" total for the selected period.
  async getAll(): Promise<DpsContribution[]> {
    try {
      return await db.dpsContributions.toArray()
    } catch (error) {
      throw toAppDbError(error)
    }
  },
}

export const dpsPayoutRepository = {
  async getByDps(dpsId: string): Promise<DpsPayout | undefined> {
    try {
      return await db.dpsPayouts.where('dpsId').equals(dpsId).first()
    } catch (error) {
      throw toAppDbError(error)
    }
  },
  // Every DPS payout — powers the Cash Flow statement's "Maturity
  // Payout" inflow total for the selected period, mirroring
  // fdrPayoutRepository.getAll().
  async getAll(): Promise<DpsPayout[]> {
    try {
      return await db.dpsPayouts.toArray()
    } catch (error) {
      throw toAppDbError(error)
    }
  },
}

export const fdrRepository = {
  ...createRepository<Fdr>(db.fdrs),
  async getByStatus(status: Fdr['status']): Promise<Fdr[]> {
    try {
      return await db.fdrs.where('status').equals(status).toArray()
    } catch (error) {
      throw toAppDbError(error)
    }
  },
  // FDRs renewed directly from this one — the forward direction of the
  // renewal chain (Fdr.previousFdrId stores the backward pointer).
  // Used to build Renewal History on FDR Details.
  async getByPreviousFdr(fdrId: string): Promise<Fdr[]> {
    try {
      return await db.fdrs.where('previousFdrId').equals(fdrId).toArray()
    } catch (error) {
      throw toAppDbError(error)
    }
  },
}

export const fdrPayoutRepository = {
  async getByFdr(fdrId: string): Promise<FdrPayout | undefined> {
    try {
      return await db.fdrPayouts.where('fdrId').equals(fdrId).first()
    } catch (error) {
      throw toAppDbError(error)
    }
  },
  // Every FDR payout — powers the Reports "FDR Maturity Profit" total
  // for the selected period.
  async getAll(): Promise<FdrPayout[]> {
    try {
      return await db.fdrPayouts.toArray()
    } catch (error) {
      throw toAppDbError(error)
    }
  },
}

export const creditCardRepository = {
  ...createRepository<CreditCard>(db.creditCards),
  async getActive(): Promise<CreditCard[]> {
    try {
      // Same IndexedDB boolean-key issue as accountRepository.getActive() — filter in JS.
      const cards = await db.creditCards.toArray()
      return cards.filter((c) => !c.isArchived)
    } catch (error) {
      throw toAppDbError(error)
    }
  },
}

export const debitCardRepository = {
  ...createRepository<DebitCard>(db.debitCards),
  async getActive(): Promise<DebitCard[]> {
    try {
      const cards = await db.debitCards.toArray()
      return cards.filter((c) => !c.isArchived)
    } catch (error) {
      throw toAppDbError(error)
    }
  },
  // How many transactions were paid with this card — guards delete the
  // same way categoryRepository.getUsageCount guards category deletes.
  async getUsageCount(debitCardId: string): Promise<number> {
    try {
      return await db.transactions.where('debitCardId').equals(debitCardId).count()
    } catch (error) {
      throw toAppDbError(error)
    }
  },
}

export const goalRepository = {
  ...createRepository<Goal>(db.goals),
  async getActive(): Promise<Goal[]> {
    try {
      return await db.goals.where('status').notEqual('archived').toArray()
    } catch (error) {
      throw toAppDbError(error)
    }
  },
}

export const goalTransactionRepository = {
  async getByGoal(goalId: string): Promise<GoalTransaction[]> {
    try {
      return await db.goalTransactions.where('goalId').equals(goalId).reverse().sortBy('date')
    } catch (error) {
      throw toAppDbError(error)
    }
  },
}

export const recurringTransactionRepository = {
  ...createRepository<RecurringTransaction>(db.recurringTransactions),
  async getDue(asOf: number = Date.now()): Promise<RecurringTransaction[]> {
    try {
      return await db.recurringTransactions
        .where('nextRunDate')
        .belowOrEqual(asOf)
        .and((rt) => rt.isActive)
        .toArray()
    } catch (error) {
      throw toAppDbError(error)
    }
  },
}

// appSettings and metadata are single-row tables — always read/written
// by their fixed id rather than listed or queried.
export const appSettingsRepository = {
  async get(): Promise<AppSettings | undefined> {
    try {
      return await db.appSettings.get(APP_SETTINGS_ID)
    } catch (error) {
      throw toAppDbError(error)
    }
  },
  async set(settings: Omit<AppSettings, 'id' | 'updatedAt'>): Promise<void> {
    try {
      await db.appSettings.put({ ...settings, id: APP_SETTINGS_ID, updatedAt: Date.now() })
    } catch (error) {
      throw toAppDbError(error)
    }
  },
}

// Reminder dedupe + Notification Center history — see
// services/notificationService.ts and features/notifications/useReminders.ts.
export const notificationLogRepository = {
  async hasShown(id: string): Promise<boolean> {
    try {
      return (await db.notificationLog.get(id)) !== undefined
    } catch (error) {
      throw toAppDbError(error)
    }
  },
  async markShown(entry: NotificationLogEntry): Promise<void> {
    try {
      await db.notificationLog.put(entry)
    } catch (error) {
      throw toAppDbError(error)
    }
  },
  // Most recently shown reminders first — powers the Notification
  // Center list in Settings.
  async getRecent(limit = 20): Promise<NotificationLogEntry[]> {
    try {
      return await db.notificationLog.orderBy('shownAt').reverse().limit(limit).toArray()
    } catch (error) {
      throw toAppDbError(error)
    }
  },
}

export const metadataRepository = {
  async get(): Promise<DbMetadata | undefined> {
    try {
      return await db.metadata.get(DB_METADATA_ID)
    } catch (error) {
      throw toAppDbError(error)
    }
  },
  async update(changes: Partial<Omit<DbMetadata, 'id' | 'createdAt'>>): Promise<void> {
    try {
      await db.metadata.update(DB_METADATA_ID, { ...changes, updatedAt: Date.now() })
    } catch (error) {
      throw toAppDbError(error)
    }
  },
}
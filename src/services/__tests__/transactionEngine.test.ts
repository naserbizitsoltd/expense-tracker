import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db, AppDatabase } from '@/db/schema'
import { generateId } from '@/db/id'
import type { Account, Category } from '@/types/entities'
import {
  createExpense,
  createIncome,
  createTransfer,
  updateTransaction,
  deleteTransaction,
} from '@/services/transactionService'
import { getAccountBalance, getTotalActiveBalance } from '@/services/balanceService'

async function makeAccount(name: string, openingBalance: number): Promise<Account> {
  const now = Date.now()
  const account: Account = {
    id: generateId(),
    name,
    type: 'cash',
    provider: null,
    currency: 'BDT',
    openingBalance,
    balance: openingBalance,
    icon: 'wallet',
    color: '#000000',
    isArchived: false,
    accountNumber: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
  }
  await db.accounts.add(account)
  return account
}

async function makeCategory(name: string, type: 'income' | 'expense'): Promise<Category> {
  const now = Date.now()
  const category: Category = {
    id: generateId(),
    name,
    type,
    icon: 'tag',
    color: '#000000',
    description: '',
    parentId: null,
    isDefault: false,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }
  await db.categories.add(category)
  return category
}

beforeEach(async () => {
  await db.open()
  await Promise.all([
    db.transactions.clear(),
    db.ledgerEntries.clear(),
    db.accounts.clear(),
    db.categories.clear(),
  ])
})

describe('transaction engine', () => {
  it('Test 1 — expense decreases the source account by the amount', async () => {
    const cash = await makeAccount('Cash', 500000) // ৳5,000
    const foodCategory = await makeCategory('Food', 'expense')

    await createExpense({
      amount: 50000, // ৳500
      accountId: cash.id,
      categoryId: foodCategory.id,
      date: Date.now(),
    })

    expect(await getAccountBalance(cash.id)).toBe(450000) // ৳4,500
  })

  it('Test 2 — income increases the destination account by the amount', async () => {
    const bank = await makeAccount('Bank', 1000000) // ৳10,000
    const salaryCategory = await makeCategory('Salary', 'income')

    await createIncome({
      amount: 200000, // ৳2,000
      accountId: bank.id,
      categoryId: salaryCategory.id,
      date: Date.now(),
    })

    expect(await getAccountBalance(bank.id)).toBe(1200000) // ৳12,000
  })

  it('Test 3 — transfer moves money between accounts and preserves total net worth', async () => {
    const bank = await makeAccount('Bank', 5000000) // ৳50,000
    const cash = await makeAccount('Cash', 500000) // ৳5,000
    const totalBefore = await getTotalActiveBalance()

    await createTransfer({
      amount: 1000000, // ৳10,000
      accountId: bank.id,
      toAccountId: cash.id,
      date: Date.now(),
    })

    expect(await getAccountBalance(bank.id)).toBe(4000000) // ৳40,000
    expect(await getAccountBalance(cash.id)).toBe(1500000) // ৳15,000
    const totalAfter = await getTotalActiveBalance()
    expect(totalAfter).toBe(totalBefore)
    expect(totalAfter).toBe(5500000) // ৳55,000
  })

  it('Test 4 — reverse transfer updates both balances correctly', async () => {
    const bank = await makeAccount('Bank', 4000000) // ৳40,000
    const cash = await makeAccount('Cash', 1500000) // ৳15,000

    await createTransfer({
      amount: 300000, // ৳3,000
      accountId: cash.id,
      toAccountId: bank.id,
      date: Date.now(),
    })

    expect(await getAccountBalance(cash.id)).toBe(1200000) // ৳12,000
    expect(await getAccountBalance(bank.id)).toBe(4300000) // ৳43,000
  })

  it('Test 5 — editing an expense replaces the old ledger effect entirely', async () => {
    const cash = await makeAccount('Cash', 500000) // ৳5,000
    const foodCategory = await makeCategory('Food', 'expense')

    const txn = await createExpense({
      amount: 50000, // ৳500
      accountId: cash.id,
      categoryId: foodCategory.id,
      date: Date.now(),
    })
    expect(await getAccountBalance(cash.id)).toBe(450000)

    await updateTransaction(txn.id, { amount: 70000 }) // -৳700

    expect(await getAccountBalance(cash.id)).toBe(430000) // ৳5,000 - ৳700
    const entries = await db.ledgerEntries.where('transactionId').equals(txn.id).toArray()
    expect(entries).toHaveLength(1)
    expect(entries[0].amount).toBe(-70000)
  })

  it('Test 6 — deleting a transaction removes its ledger entries and restores the balance', async () => {
    const cash = await makeAccount('Cash', 500000) // ৳5,000
    const foodCategory = await makeCategory('Food', 'expense')

    const txn = await createExpense({
      amount: 70000, // ৳700
      accountId: cash.id,
      categoryId: foodCategory.id,
      date: Date.now(),
    })
    expect(await getAccountBalance(cash.id)).toBe(430000)

    await deleteTransaction(txn.id)

    expect(await getAccountBalance(cash.id)).toBe(500000)
    const entries = await db.ledgerEntries.where('transactionId').equals(txn.id).toArray()
    expect(entries).toHaveLength(0)
    expect(await db.transactions.get(txn.id)).toBeUndefined()
  })

  it('Test 7 — a transfer from an account to itself is rejected', async () => {
    const bank = await makeAccount('Bank', 5000000)

    await expect(
      createTransfer({
        amount: 100000,
        accountId: bank.id,
        toAccountId: bank.id,
        date: Date.now(),
      })
    ).rejects.toMatchObject({ code: 'INVALID_DATA' })

    expect(await getAccountBalance(bank.id)).toBe(5000000)
    expect(await db.transactions.count()).toBe(0)
  })

  it('Test 8 — an expense using an income category is rejected', async () => {
    const cash = await makeAccount('Cash', 500000)
    const salaryCategory = await makeCategory('Salary', 'income')

    await expect(
      createExpense({
        amount: 10000,
        accountId: cash.id,
        categoryId: salaryCategory.id,
        date: Date.now(),
      })
    ).rejects.toMatchObject({ code: 'INVALID_DATA' })

    expect(await getAccountBalance(cash.id)).toBe(500000)
    expect(await db.transactions.count()).toBe(0)
  })

  it('Test 9 — a failure mid-write leaves no partial ledger entries behind', async () => {
    const bank = await makeAccount('Bank', 5000000)
    const cash = await makeAccount('Cash', 500000)

    const bulkAddSpy = vi.spyOn(db.ledgerEntries, 'bulkAdd').mockImplementationOnce(() => {
      throw new Error('simulated failure writing the second ledger entry')
    })

    await expect(
      createTransfer({
        amount: 100000,
        accountId: bank.id,
        toAccountId: cash.id,
        date: Date.now(),
      })
    ).rejects.toBeTruthy()

    bulkAddSpy.mockRestore()

    expect(await db.transactions.count()).toBe(0)
    expect(await db.ledgerEntries.count()).toBe(0)
    expect(await getAccountBalance(bank.id)).toBe(5000000)
    expect(await getAccountBalance(cash.id)).toBe(500000)
  })

  it('Test 10 — data persists across a simulated app close/reopen', async () => {
    const cash = await makeAccount('Cash', 500000)
    const foodCategory = await makeCategory('Food', 'expense')
    await createExpense({
      amount: 50000,
      accountId: cash.id,
      categoryId: foodCategory.id,
      date: Date.now(),
    })

    db.close()

    // A fresh Dexie instance against the same underlying (fake) IndexedDB
    // database name, simulating the app being closed and reopened.
    const reopened = new AppDatabase()
    await reopened.open()

    const accounts = await reopened.accounts.toArray()
    const categories = await reopened.categories.toArray()
    const transactions = await reopened.transactions.toArray()
    const ledgerEntries = await reopened.ledgerEntries.toArray()

    expect(accounts).toHaveLength(1)
    expect(categories).toHaveLength(1)
    expect(transactions).toHaveLength(1)
    expect(ledgerEntries).toHaveLength(1)
    expect(accounts[0].balance).toBe(450000)

    reopened.close()
    await db.open()
  })
})
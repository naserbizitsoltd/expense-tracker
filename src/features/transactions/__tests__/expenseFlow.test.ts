import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/schema'
import { generateId } from '@/db/id'
import type { Account, Category } from '@/types/entities'
import { createExpense } from '@/services/transactionService'
import { getAccountBalance } from '@/services/balanceService'

async function makeAccount(name: string, type: Account['type'], openingBalance: number): Promise<Account> {
  const now = Date.now()
  const account: Account = {
    id: generateId(),
    name,
    type,
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

describe('expense entry flow', () => {
  it('Test 1 — Cash ৳5,000 minus ৳500 expense = ৳4,500', async () => {
    const cash = await makeAccount('Cash', 'cash', 500000)
    const food = await makeCategory('Food & Dining', 'expense')

    await createExpense({ amount: 50000, accountId: cash.id, categoryId: food.id, date: Date.now() })

    expect(await getAccountBalance(cash.id)).toBe(450000)
  })

  it('Test 2 — an expense against a mobile wallet (bKash) decreases it correctly', async () => {
    const bkash = await makeAccount('bKash', 'mobile_wallet', 300000)
    const food = await makeCategory('Food & Dining', 'expense')

    await createExpense({ amount: 25000, accountId: bkash.id, categoryId: food.id, date: Date.now() })

    expect(await getAccountBalance(bkash.id)).toBe(275000)
  })

  it('Test 3 — an expense against a Bank account decreases it correctly', async () => {
    const bank = await makeAccount('Bank', 'bank', 1000000)
    const bills = await makeCategory('Bills', 'expense')

    await createExpense({ amount: 150000, accountId: bank.id, categoryId: bills.id, date: Date.now() })

    expect(await getAccountBalance(bank.id)).toBe(850000)
  })

  it('Test 4 — a zero amount is rejected', async () => {
    const cash = await makeAccount('Cash', 'cash', 500000)
    const food = await makeCategory('Food & Dining', 'expense')

    await expect(
      createExpense({ amount: 0, accountId: cash.id, categoryId: food.id, date: Date.now() })
    ).rejects.toMatchObject({ code: 'INVALID_DATA' })
    expect(await getAccountBalance(cash.id)).toBe(500000)
  })

  it('Test 5 — a negative amount is rejected', async () => {
    const cash = await makeAccount('Cash', 'cash', 500000)
    const food = await makeCategory('Food & Dining', 'expense')

    await expect(
      createExpense({ amount: -100, accountId: cash.id, categoryId: food.id, date: Date.now() })
    ).rejects.toMatchObject({ code: 'INVALID_DATA' })
    expect(await getAccountBalance(cash.id)).toBe(500000)
  })

  it('Test 6 — an Income category is rejected for an expense', async () => {
    const cash = await makeAccount('Cash', 'cash', 500000)
    const salary = await makeCategory('Salary', 'income')

    await expect(
      createExpense({ amount: 10000, accountId: cash.id, categoryId: salary.id, date: Date.now() })
    ).rejects.toMatchObject({ code: 'INVALID_DATA' })
    expect(await getAccountBalance(cash.id)).toBe(500000)
  })

  it('Test 8 — the expense persists across a simulated close/reopen', async () => {
    const cash = await makeAccount('Cash', 'cash', 500000)
    const food = await makeCategory('Food & Dining', 'expense')
    await createExpense({ amount: 35000, accountId: cash.id, categoryId: food.id, date: Date.now() })

    db.close()
    await db.open()

    expect(await db.transactions.count()).toBe(1)
    expect(await getAccountBalance(cash.id)).toBe(465000)
  })
})
import { db } from './schema'
import { generateId } from './id'
import type { Category, CategoryType } from '@/types/entities'

interface DefaultCategorySeed {
  name: string
  type: CategoryType
  icon: string
  color: string
}

// Suggested defaults from the product spec. Icons are curated Lucide
// names (see features/categories/categoryConfig.ts for the picker set)
// and colors come from the same controlled palette users choose from.
const DEFAULT_CATEGORIES: DefaultCategorySeed[] = [
  // Expense
  { name: 'Food & Dining', type: 'expense', icon: 'Utensils', color: '#f97316' },
  { name: 'Groceries', type: 'expense', icon: 'ShoppingCart', color: '#84cc16' },
  { name: 'Transportation', type: 'expense', icon: 'Car', color: '#3b82f6' },
  { name: 'Fuel', type: 'expense', icon: 'Fuel', color: '#0ea5e9' },
  { name: 'Shopping', type: 'expense', icon: 'ShoppingBag', color: '#a855f7' },
  { name: 'Bills & Utilities', type: 'expense', icon: 'Receipt', color: '#ef4444' },
  { name: 'Rent', type: 'expense', icon: 'Home', color: '#6366f1' },
  { name: 'Health & Medical', type: 'expense', icon: 'HeartPulse', color: '#ec4899' },
  { name: 'Education', type: 'expense', icon: 'GraduationCap', color: '#14b8a6' },
  { name: 'Entertainment', type: 'expense', icon: 'Popcorn', color: '#eab308' },
  { name: 'Travel', type: 'expense', icon: 'Plane', color: '#0ea5e9' },
  { name: 'Personal Care', type: 'expense', icon: 'Sparkles', color: '#f59e0b' },
  { name: 'Family', type: 'expense', icon: 'Users', color: '#8b5cf6' },
  { name: 'Gifts', type: 'expense', icon: 'Gift', color: '#ec4899' },
  { name: 'Electronics', type: 'expense', icon: 'Laptop', color: '#64748b' },
  { name: 'Subscriptions', type: 'expense', icon: 'Repeat', color: '#6366f1' },
  { name: 'Insurance', type: 'expense', icon: 'ShieldCheck', color: '#22c55e' },
  { name: 'Taxes & Fees', type: 'expense', icon: 'FileText', color: '#64748b' },
  { name: 'Other', type: 'expense', icon: 'MoreHorizontal', color: '#64748b' },
  // Income
  { name: 'Salary', type: 'income', icon: 'Wallet', color: '#22c55e' },
  { name: 'Business', type: 'income', icon: 'Briefcase', color: '#14b8a6' },
  { name: 'Freelance', type: 'income', icon: 'Laptop', color: '#0ea5e9' },
  { name: 'Bonus', type: 'income', icon: 'Sparkles', color: '#eab308' },
  { name: 'Interest', type: 'income', icon: 'Percent', color: '#84cc16' },
  { name: 'Investment', type: 'income', icon: 'TrendingUp', color: '#22c55e' },
  { name: 'Rental Income', type: 'income', icon: 'Building2', color: '#6366f1' },
  { name: 'Gift', type: 'income', icon: 'Gift', color: '#ec4899' },
  { name: 'Refund', type: 'income', icon: 'RotateCcw', color: '#f59e0b' },
  { name: 'Other', type: 'income', icon: 'MoreHorizontal', color: '#64748b' },
]

/**
 * Inserts any default categories that don't already exist yet, matched
 * by type + case-insensitive name. Safe to call on every app start:
 * - Never duplicates a default that's already there.
 * - Never touches or removes user-created custom categories.
 * - If a future app update adds new suggested defaults to the list
 *   above, only the newly-added ones get inserted — existing rows
 *   (including any the user has since renamed/customized) are untouched.
 */
export async function seedDefaultCategories(): Promise<void> {
  const existing = await db.categories.toArray()
  const existingKeys = new Set(existing.map((c) => `${c.type}:${c.name.trim().toLowerCase()}`))

  const missing = DEFAULT_CATEGORIES.filter(
    (c) => !existingKeys.has(`${c.type}:${c.name.toLowerCase()}`)
  )
  if (missing.length === 0) return

  const now = Date.now()
  const records: Category[] = missing.map((c) => ({
    id: generateId(),
    name: c.name,
    type: c.type,
    icon: c.icon,
    color: c.color,
    description: '',
    parentId: null,
    isDefault: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }))

  await db.categories.bulkAdd(records)
}
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
  { name: 'Transfer Charge', type: 'expense', icon: 'HandCoins', color: '#f59e0b' },
  { name: 'Other', type: 'expense', icon: 'MoreHorizontal', color: '#64748b' },
  // Expense (extended set)
  { name: 'Restaurants', type: 'expense', icon: 'Utensils', color: '#f97316' },
  { name: 'Coffee & Cafes', type: 'expense', icon: 'Coffee', color: '#ef4444' },
  { name: 'Fast Food', type: 'expense', icon: 'Pizza', color: '#ec4899' },
  { name: 'Snacks', type: 'expense', icon: 'IceCream', color: '#a855f7' },
  { name: 'Alcohol & Bars', type: 'expense', icon: 'Beer', color: '#8b5cf6' },
  { name: 'Wine & Spirits', type: 'expense', icon: 'Wine', color: '#6366f1' },
  { name: 'Bakery', type: 'expense', icon: 'Cake', color: '#3b82f6' },
  { name: 'Fruits & Vegetables', type: 'expense', icon: 'Apple', color: '#0ea5e9' },
  { name: 'Clothing', type: 'expense', icon: 'Shirt', color: '#14b8a6' },
  { name: 'Accessories', type: 'expense', icon: 'Watch', color: '#22c55e' },
  { name: 'Jewelry', type: 'expense', icon: 'Diamond', color: '#84cc16' },
  { name: 'Department Store', type: 'expense', icon: 'Store', color: '#eab308' },
  { name: 'Luggage & Bags', type: 'expense', icon: 'Backpack', color: '#f59e0b' },
  { name: 'Public Transport', type: 'expense', icon: 'Bus', color: '#64748b' },
  { name: 'Train', type: 'expense', icon: 'TrainFront', color: '#f97316' },
  { name: 'Ride Sharing', type: 'expense', icon: 'Car', color: '#ef4444' },
  { name: 'Parking', type: 'expense', icon: 'Car', color: '#ec4899' },
  { name: 'Bicycle', type: 'expense', icon: 'Bike', color: '#a855f7' },
  { name: 'Boat & Ferry', type: 'expense', icon: 'Ship', color: '#8b5cf6' },
  { name: 'Moving & Freight', type: 'expense', icon: 'Truck', color: '#6366f1' },
  { name: 'Vehicle Maintenance', type: 'expense', icon: 'Wrench', color: '#3b82f6' },
  { name: 'Electricity Bill', type: 'expense', icon: 'Zap', color: '#0ea5e9' },
  { name: 'Internet & Wifi', type: 'expense', icon: 'Wifi', color: '#14b8a6' },
  { name: 'Phone Bill', type: 'expense', icon: 'Phone', color: '#22c55e' },
  { name: 'Water Bill', type: 'expense', icon: 'Droplet', color: '#84cc16' },
  { name: 'Gas & Heating', type: 'expense', icon: 'Flame', color: '#eab308' },
  { name: 'Waste Disposal', type: 'expense', icon: 'Trash2', color: '#f59e0b' },
  { name: 'Home Maintenance', type: 'expense', icon: 'Wrench', color: '#64748b' },
  { name: 'Home Decor', type: 'expense', icon: 'Lightbulb', color: '#f97316' },
  { name: 'Furniture', type: 'expense', icon: 'Home', color: '#ef4444' },
  { name: 'Mortgage', type: 'expense', icon: 'Building2', color: '#ec4899' },
  { name: 'Property Tax', type: 'expense', icon: 'FileText', color: '#a855f7' },
  { name: 'Home Insurance', type: 'expense', icon: 'ShieldCheck', color: '#8b5cf6' },
  { name: 'Pharmacy', type: 'expense', icon: 'Pill', color: '#6366f1' },
  { name: 'Doctor Visits', type: 'expense', icon: 'Stethoscope', color: '#3b82f6' },
  { name: 'Dental Care', type: 'expense', icon: 'HeartPulse', color: '#0ea5e9' },
  { name: 'Fitness & Gym', type: 'expense', icon: 'Dumbbell', color: '#14b8a6' },
  { name: 'Mental Health', type: 'expense', icon: 'Brain', color: '#22c55e' },
  { name: 'Vaccinations', type: 'expense', icon: 'Syringe', color: '#84cc16' },
  { name: 'School Fees', type: 'expense', icon: 'School', color: '#eab308' },
  { name: 'Books & Supplies', type: 'expense', icon: 'BookOpen', color: '#f59e0b' },
  { name: 'Tuition', type: 'expense', icon: 'GraduationCap', color: '#64748b' },
  { name: 'Movies & Cinema', type: 'expense', icon: 'Film', color: '#f97316' },
  { name: 'Concerts & Events', type: 'expense', icon: 'Music', color: '#ef4444' },
  { name: 'Gaming', type: 'expense', icon: 'Gamepad2', color: '#ec4899' },
  { name: 'Hobbies', type: 'expense', icon: 'Palette', color: '#a855f7' },
  { name: 'Salon & Spa', type: 'expense', icon: 'Scissors', color: '#8b5cf6' },
  { name: 'Photography', type: 'expense', icon: 'Camera', color: '#6366f1' },
  { name: 'Parties & Celebrations', type: 'expense', icon: 'PartyPopper', color: '#3b82f6' },
  { name: 'Musical Instruments', type: 'expense', icon: 'Guitar', color: '#0ea5e9' },
  { name: 'Hotel & Lodging', type: 'expense', icon: 'Building', color: '#14b8a6' },
  { name: 'Flights', type: 'expense', icon: 'Plane', color: '#22c55e' },
  { name: 'Vacation Packages', type: 'expense', icon: 'Luggage', color: '#84cc16' },
  { name: 'Sightseeing', type: 'expense', icon: 'Compass', color: '#eab308' },
  { name: 'Pet Care', type: 'expense', icon: 'PawPrint', color: '#f59e0b' },
  { name: 'Camping & Outdoors', type: 'expense', icon: 'Tent', color: '#64748b' },
  { name: 'Childcare', type: 'expense', icon: 'Baby', color: '#f97316' },
  { name: 'Software & Apps', type: 'expense', icon: 'Laptop', color: '#ef4444' },
  { name: 'Mobile Phone Purchase', type: 'expense', icon: 'Smartphone', color: '#ec4899' },
  { name: 'Streaming Services', type: 'expense', icon: 'Tv', color: '#a855f7' },
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
  // Income (extended set)
  { name: 'Part-time Job', type: 'income', icon: 'Briefcase', color: '#f97316' },
  { name: 'Side Hustle', type: 'income', icon: 'Laptop', color: '#ef4444' },
  { name: 'Consulting', type: 'income', icon: 'Briefcase', color: '#ec4899' },
  { name: 'Commission', type: 'income', icon: 'HandCoins', color: '#a855f7' },
  { name: 'Tips', type: 'income', icon: 'Coins', color: '#8b5cf6' },
  { name: 'Dividends', type: 'income', icon: 'TrendingUp', color: '#6366f1' },
  { name: 'Capital Gains', type: 'income', icon: 'LineChart', color: '#3b82f6' },
  { name: 'Royalties', type: 'income', icon: 'FileText', color: '#0ea5e9' },
  { name: 'Pension', type: 'income', icon: 'PiggyBank', color: '#14b8a6' },
  { name: 'Provident Fund', type: 'income', icon: 'Landmark', color: '#22c55e' },
  { name: 'Government Benefit', type: 'income', icon: 'Landmark', color: '#84cc16' },
  { name: 'Grant', type: 'income', icon: 'Banknote', color: '#eab308' },
  { name: 'Scholarship', type: 'income', icon: 'GraduationCap', color: '#f59e0b' },
  { name: 'Prize & Award', type: 'income', icon: 'Star', color: '#64748b' },
  { name: 'Lottery', type: 'income', icon: 'Sparkles', color: '#f97316' },
  { name: 'Cashback', type: 'income', icon: 'CreditCard', color: '#ef4444' },
  { name: 'Reimbursement', type: 'income', icon: 'RotateCcw', color: '#ec4899' },
  { name: 'Insurance Payout', type: 'income', icon: 'ShieldCheck', color: '#a855f7' },
  { name: 'Alimony', type: 'income', icon: 'HandCoins', color: '#8b5cf6' },
  { name: 'Child Support', type: 'income', icon: 'Baby', color: '#6366f1' },
  { name: 'Inheritance', type: 'income', icon: 'Landmark', color: '#3b82f6' },
  { name: 'Sale of Assets', type: 'income', icon: 'Store', color: '#0ea5e9' },
  { name: 'Security Deposit Return', type: 'income', icon: 'Building2', color: '#14b8a6' },
  { name: 'Crypto Income', type: 'income', icon: 'Coins', color: '#22c55e' },
  { name: 'Affiliate Income', type: 'income', icon: 'LineChart', color: '#84cc16' },
  { name: 'Ad Revenue', type: 'income', icon: 'TrendingUp', color: '#eab308' },
  { name: 'Book Royalty', type: 'income', icon: 'BookOpen', color: '#f59e0b' },
  { name: 'Overtime Pay', type: 'income', icon: 'Wallet', color: '#64748b' },
  { name: 'Allowance', type: 'income', icon: 'Wallet', color: '#f97316' },
  { name: 'Loan Received', type: 'income', icon: 'HandCoins', color: '#ef4444' },
  { name: 'Debt Collected', type: 'income', icon: 'Banknote', color: '#ec4899' },
  { name: 'Tax Refund', type: 'income', icon: 'FileText', color: '#a855f7' },
  { name: 'Stipend', type: 'income', icon: 'Wallet', color: '#8b5cf6' },
  { name: 'Annuity', type: 'income', icon: 'PiggyBank', color: '#6366f1' },
  { name: 'Trust Fund', type: 'income', icon: 'Landmark', color: '#3b82f6' },
  { name: 'Farming Income', type: 'income', icon: 'Store', color: '#0ea5e9' },
  { name: 'Livestock Income', type: 'income', icon: 'Store', color: '#14b8a6' },
  { name: 'Export Income', type: 'income', icon: 'Truck', color: '#22c55e' },
  { name: 'Franchise Income', type: 'income', icon: 'Building2', color: '#84cc16' },
  { name: 'Other Income Source', type: 'income', icon: 'MoreHorizontal', color: '#eab308' },
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
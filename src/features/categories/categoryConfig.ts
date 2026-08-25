import {
  Utensils, Coffee, Pizza, ShoppingCart,
  ShoppingBag, Shirt, Gift,
  Car, Bus, TrainFront, Fuel,
  Receipt, Zap, Wifi, Phone, Home, Building2,
  HeartPulse, Pill, GraduationCap, BookOpen,
  Popcorn, Music, Gamepad2, Sparkles, Scissors,
  Plane, MapPin, Users, Baby,
  Laptop, Smartphone, Tv, Repeat,
  Wallet, Briefcase, Landmark, TrendingUp, Coins, PiggyBank, Banknote,
  RotateCcw, Percent, ShieldCheck, FileText,
  Tag, MoreHorizontal,
  type LucideIcon,
} from 'lucide-react'
import type { CategoryType } from '@/types/entities'

// Controlled color palette — keeps every category visually consistent
// instead of allowing arbitrary colors. Reused by defaults (seed.ts)
// and by the color picker in CategoryForm.
export const CATEGORY_COLORS: string[] = [
  '#f97316', '#ef4444', '#ec4899', '#a855f7',
  '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9',
  '#14b8a6', '#22c55e', '#84cc16', '#eab308',
  '#f59e0b', '#64748b',
]

// Curated icon set grouped for an easy, scannable mobile picker —
// intentionally NOT the full Lucide catalog.
export const CATEGORY_ICON_GROUPS: { label: string; icons: string[] }[] = [
  { label: 'Food & Dining', icons: ['Utensils', 'Coffee', 'Pizza', 'ShoppingCart'] },
  { label: 'Shopping & Gifts', icons: ['ShoppingBag', 'Shirt', 'Gift'] },
  { label: 'Transport', icons: ['Car', 'Bus', 'TrainFront', 'Fuel'] },
  { label: 'Bills & Home', icons: ['Receipt', 'Zap', 'Wifi', 'Phone', 'Home', 'Building2'] },
  { label: 'Health & Education', icons: ['HeartPulse', 'Pill', 'GraduationCap', 'BookOpen'] },
  { label: 'Lifestyle', icons: ['Popcorn', 'Music', 'Gamepad2', 'Sparkles', 'Scissors'] },
  { label: 'Travel & Family', icons: ['Plane', 'MapPin', 'Users', 'Baby'] },
  { label: 'Tech & Subscriptions', icons: ['Laptop', 'Smartphone', 'Tv', 'Repeat'] },
  {
    label: 'Finance & Income',
    icons: ['Wallet', 'Briefcase', 'Landmark', 'TrendingUp', 'Coins', 'PiggyBank', 'Banknote', 'RotateCcw', 'Percent', 'ShieldCheck', 'FileText'],
  },
  { label: 'Other', icons: ['Tag', 'MoreHorizontal'] },
]

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  Utensils, Coffee, Pizza, ShoppingCart,
  ShoppingBag, Shirt, Gift,
  Car, Bus, TrainFront, Fuel,
  Receipt, Zap, Wifi, Phone, Home, Building2,
  HeartPulse, Pill, GraduationCap, BookOpen,
  Popcorn, Music, Gamepad2, Sparkles, Scissors,
  Plane, MapPin, Users, Baby,
  Laptop, Smartphone, Tv, Repeat,
  Wallet, Briefcase, Landmark, TrendingUp, Coins, PiggyBank, Banknote,
  RotateCcw, Percent, ShieldCheck, FileText,
  Tag, MoreHorizontal,
}

export function getCategoryIcon(name: string): LucideIcon {
  return CATEGORY_ICON_MAP[name] ?? MoreHorizontal
}

export function categoryTypeLabel(type: CategoryType): string {
  return type === 'income' ? 'Income' : 'Expense'
}
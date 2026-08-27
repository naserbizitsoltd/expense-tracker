import {
  Utensils, Coffee, Pizza, ShoppingCart, IceCream, Beer, Wine, Cake, Apple,
  ShoppingBag, Shirt, Gift, Store, Watch, Backpack, Diamond,
  Car, Bus, TrainFront, Fuel, Bike, Ship, Truck, Anchor, Navigation,
  Receipt, Zap, Wifi, Phone, Home, Building2, Droplet, Flame, Trash2, Lightbulb, Thermometer, Wrench,
  HeartPulse, Pill, GraduationCap, BookOpen, Stethoscope, Dumbbell, School, Brain, Syringe,
  Popcorn, Music, Gamepad2, Sparkles, Scissors, Camera, Film, PartyPopper, Palette, Guitar,
  Plane, MapPin, Users, Baby, Luggage, Compass, PawPrint, Tent, Globe,
  Laptop, Smartphone, Tv, Repeat, Headphones, Cloud, Monitor, Gamepad, Keyboard,
  Wallet, Briefcase, Landmark, TrendingUp, Coins, PiggyBank, Banknote, CreditCard, HandCoins, LineChart, Building, Scale,
  RotateCcw, Percent, ShieldCheck, FileText,
  Tag, MoreHorizontal, HelpCircle, Bookmark, Star,
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
  { label: 'Food & Dining', icons: ['Utensils', 'Coffee', 'Pizza', 'ShoppingCart', 'IceCream', 'Beer', 'Wine', 'Cake', 'Apple'] },
  { label: 'Shopping & Gifts', icons: ['ShoppingBag', 'Shirt', 'Gift', 'Store', 'Watch', 'Backpack', 'Diamond'] },
  { label: 'Transport', icons: ['Car', 'Bus', 'TrainFront', 'Fuel', 'Bike', 'Ship', 'Truck', 'Anchor', 'Navigation'] },
  {
    label: 'Bills & Home',
    icons: ['Receipt', 'Zap', 'Wifi', 'Phone', 'Home', 'Building2', 'Droplet', 'Flame', 'Trash2', 'Lightbulb', 'Thermometer', 'Wrench'],
  },
  { label: 'Health & Education', icons: ['HeartPulse', 'Pill', 'GraduationCap', 'BookOpen', 'Stethoscope', 'Dumbbell', 'School', 'Brain', 'Syringe'] },
  {
    label: 'Lifestyle',
    icons: ['Popcorn', 'Music', 'Gamepad2', 'Sparkles', 'Scissors', 'Camera', 'Film', 'PartyPopper', 'Palette', 'Guitar'],
  },
  { label: 'Travel & Family', icons: ['Plane', 'MapPin', 'Users', 'Baby', 'Luggage', 'Compass', 'PawPrint', 'Tent', 'Globe'] },
  { label: 'Tech & Subscriptions', icons: ['Laptop', 'Smartphone', 'Tv', 'Repeat', 'Headphones', 'Cloud', 'Monitor', 'Gamepad', 'Keyboard'] },
  {
    label: 'Finance & Income',
    icons: [
      'Wallet', 'Briefcase', 'Landmark', 'TrendingUp', 'Coins', 'PiggyBank', 'Banknote',
      'RotateCcw', 'Percent', 'ShieldCheck', 'FileText', 'CreditCard', 'HandCoins', 'LineChart', 'Building', 'Scale',
    ],
  },
  { label: 'Other', icons: ['Tag', 'MoreHorizontal', 'HelpCircle', 'Bookmark', 'Star'] },
]

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  Utensils, Coffee, Pizza, ShoppingCart, IceCream, Beer, Wine, Cake, Apple,
  ShoppingBag, Shirt, Gift, Store, Watch, Backpack, Diamond,
  Car, Bus, TrainFront, Fuel, Bike, Ship, Truck, Anchor, Navigation,
  Receipt, Zap, Wifi, Phone, Home, Building2, Droplet, Flame, Trash2, Lightbulb, Thermometer, Wrench,
  HeartPulse, Pill, GraduationCap, BookOpen, Stethoscope, Dumbbell, School, Brain, Syringe,
  Popcorn, Music, Gamepad2, Sparkles, Scissors, Camera, Film, PartyPopper, Palette, Guitar,
  Plane, MapPin, Users, Baby, Luggage, Compass, PawPrint, Tent, Globe,
  Laptop, Smartphone, Tv, Repeat, Headphones, Cloud, Monitor, Gamepad, Keyboard,
  Wallet, Briefcase, Landmark, TrendingUp, Coins, PiggyBank, Banknote, CreditCard, HandCoins, LineChart, Building, Scale,
  RotateCcw, Percent, ShieldCheck, FileText,
  Tag, MoreHorizontal, HelpCircle, Bookmark, Star,
}

export function getCategoryIcon(name: string): LucideIcon {
  return CATEGORY_ICON_MAP[name] ?? MoreHorizontal
}

export function categoryTypeLabel(type: CategoryType): string {
  return type === 'income' ? 'Income' : 'Expense'
}
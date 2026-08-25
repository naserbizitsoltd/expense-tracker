import { Landmark, Building2, Banknote, type LucideIcon } from 'lucide-react'
import type { DepositStatus } from '@/types/entities'

export const FDR_ICON_OPTIONS = ['Landmark', 'Building2', 'Banknote']
export const DEFAULT_FDR_ICON = 'Landmark'

const FDR_ICONS: Record<string, LucideIcon> = { Landmark, Building2, Banknote }

export function getFdrIcon(name: string): LucideIcon {
  return FDR_ICONS[name] ?? Landmark
}

export const FDR_TENURE_OPTIONS: { label: string; months: number | 'custom' }[] = [
  { label: '3 months', months: 3 },
  { label: '6 months', months: 6 },
  { label: '1 year', months: 12 },
  { label: '2 years', months: 24 },
  { label: '3 years', months: 36 },
  { label: 'Custom', months: 'custom' },
]

export function fdrStatusLabel(status: DepositStatus): string {
  switch (status) {
    case 'active': return 'Active'
    case 'matured': return 'Matured'
    case 'paid_out': return 'Paid Out'
    case 'archived': return 'Archived'
    case 'renewed': return 'Renewed'
    case 'withdrawn': return 'Withdrawn'
  }
}

export function fdrStatusBadgeVariant(status: DepositStatus): 'default' | 'success' | 'danger' | 'warning' {
  switch (status) {
    case 'active': return 'success'
    case 'matured': return 'warning'
    case 'paid_out': return 'default'
    case 'archived': return 'default'
    case 'renewed': return 'default'
    case 'withdrawn': return 'danger'
  }
}
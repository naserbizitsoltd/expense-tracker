import { Landmark, PiggyBank, Building2, Banknote, type LucideIcon } from 'lucide-react'
import type { DpsStatus } from '@/types/entities'

export const DPS_ICON_OPTIONS = ['Landmark', 'PiggyBank', 'Building2', 'Banknote']
export const DEFAULT_DPS_ICON = 'PiggyBank'

const DPS_ICONS: Record<string, LucideIcon> = { Landmark, PiggyBank, Building2, Banknote }

export function getDpsIcon(name: string): LucideIcon {
  return DPS_ICONS[name] ?? PiggyBank
}

export function dpsStatusLabel(status: DpsStatus): string {
  switch (status) {
    case 'active': return 'Active'
    case 'completed': return 'Completed'
    case 'paused': return 'Paused'
    case 'archived': return 'Archived'
    case 'paid_out': return 'Paid Out'
  }
}

export function dpsStatusBadgeVariant(status: DpsStatus): 'default' | 'success' | 'danger' | 'warning' {
  switch (status) {
    case 'active': return 'success'
    case 'completed': return 'default'
    case 'paused': return 'warning'
    case 'archived': return 'default'
    case 'paid_out': return 'default'
  }
}
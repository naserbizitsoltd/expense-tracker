import { useMemo } from 'react'
import { accountRepository, useLiveQuery } from '@/db'
import { APP_CONFIG } from '@/config/app.config'

export function useAccounts() {
  const { data, error, isLoading } = useLiveQuery(() => accountRepository.getAll(), [])

  const accounts = data ?? []
  const activeAccounts = useMemo(() => accounts.filter((a) => !a.isArchived), [accounts])
  const archivedAccounts = useMemo(() => accounts.filter((a) => a.isArchived), [accounts])

  // Only same-currency accounts are summed into the headline total — no
  // currency conversion yet, so mixing currencies would be misleading.
  const totalBalance = useMemo(
    () => activeAccounts.filter((a) => a.currency === APP_CONFIG.defaultCurrency).reduce((sum, a) => sum + a.balance, 0),
    [activeAccounts]
  )

  return { accounts, activeAccounts, archivedAccounts, totalBalance, isLoading, error }
}

export function useAccount(id: string | null) {
  const { data, error, isLoading } = useLiveQuery(() => (id ? accountRepository.getById(id) : undefined), [id])
  return { account: data, isLoading, error }
}
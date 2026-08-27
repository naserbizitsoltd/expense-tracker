import { useEffect, useMemo, useRef, useState } from 'react'
import {
  recurringTransactionRepository,
  dpsRepository,
  dpsContributionRepository,
  fdrRepository,
  loanRepository,
  goalRepository,
  notificationLogRepository,
  useLiveQuery,
} from '@/db'
import { getLoanOutstandings } from '@/services/loanService'
import { buildReminderCandidates, fireBrowserNotification, type ReminderCandidate } from '@/services/notificationService'
import { useNotificationSettings } from './useNotificationSettings'

/**
 * Bumps whenever the app becomes visible/focused again (PWA
 * start/resume) — used to re-derive "days until due" against a fresh
 * `Date.now()` without ever running a timer/interval. Purely local
 * state; touches no data on its own.
 */
function useResumeTick(): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const bump = () => setTick((t) => t + 1)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') bump()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', bump)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', bump)
    }
  }, [])
  return tick
}

/**
 * Reactive list of every reminder currently "due" (its offset matches
 * today). Recomputes automatically whenever recurring/DPS/FDR/loan/goal
 * data changes (via useLiveQuery on each table) or the app resumes —
 * never via polling.
 */
export function useUpcomingReminders() {
  const { enabled, reminderOffsetDays } = useNotificationSettings()
  const resumeTick = useResumeTick()

  const recurringState = useLiveQuery(() => recurringTransactionRepository.getAll(), [])
  const dpsState = useLiveQuery(() => dpsRepository.getAll(), [])
  const dpsContribState = useLiveQuery(() => dpsContributionRepository.getAll(), [])
  const fdrState = useLiveQuery(() => fdrRepository.getAll(), [])
  const loanState = useLiveQuery(() => loanRepository.getAll(), [])
  const goalState = useLiveQuery(() => goalRepository.getAll(), [])

  const loans = loanState.data ?? []
  const outstandingState = useLiveQuery(
    () => getLoanOutstandings(loans.map((l) => l.id)),
    [loans.map((l) => l.id + l.principal).join(',')]
  )

  const candidates = useMemo<ReminderCandidate[]>(() => {
    const dps = dpsState.data ?? []
    const contributions = dpsContribState.data ?? []
    const dpsList = dps.map((d) => ({
      dps: d,
      paidInstallments: contributions.filter((c) => c.dpsId === d.id).length,
    }))

    return buildReminderCandidates({
      recurring: recurringState.data ?? [],
      dpsList,
      fdrs: fdrState.data ?? [],
      loans,
      loanOutstanding: outstandingState.data ?? {},
      goals: goalState.data ?? [],
      offsetDays: reminderOffsetDays,
      now: Date.now(),
    })
    // resumeTick intentionally forces recomputation with a fresh `now`
    // on app resume even when none of the underlying tables changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    recurringState.data,
    dpsState.data,
    dpsContribState.data,
    fdrState.data,
    loans,
    outstandingState.data,
    goalState.data,
    reminderOffsetDays,
    resumeTick,
  ])

  const isLoading =
    recurringState.isLoading || dpsState.isLoading || fdrState.isLoading || loanState.isLoading || goalState.isLoading

  return { candidates, isLoading, enabled }
}

/**
 * Drives the actual side effects: for every currently-due candidate
 * not already recorded in notificationLog, records it (dedupe) and —
 * only when notifications are enabled — fires a real browser
 * Notification. Also exposes the recent reminder history for the
 * Notification Center UI. Mount once app-wide (see
 * components/NotificationRunner.tsx) plus wherever the history needs
 * to be displayed (e.g. Settings) — the dedupe check makes it safe to
 * call from more than one place at once.
 */
export function useNotificationCenter() {
  const { candidates, enabled } = useUpcomingReminders()
  const recentState = useLiveQuery(() => notificationLogRepository.getRecent(20), [])
  const inFlight = useRef(new Set<string>())

  useEffect(() => {
    if (!enabled || candidates.length === 0) return
    let cancelled = false

    async function process() {
      for (const candidate of candidates) {
        if (cancelled) return
        if (inFlight.current.has(candidate.id)) continue
        inFlight.current.add(candidate.id)
        try {
          const alreadyShown = await notificationLogRepository.hasShown(candidate.id)
          if (alreadyShown || cancelled) continue
          await notificationLogRepository.markShown({
            id: candidate.id,
            type: candidate.type,
            entityId: candidate.entityId,
            title: candidate.title,
            body: candidate.body,
            dueDate: candidate.dueDate,
            shownAt: Date.now(),
          })
          fireBrowserNotification(candidate)
        } finally {
          inFlight.current.delete(candidate.id)
        }
      }
    }

    process()
    return () => {
      cancelled = true
    }
  }, [candidates, enabled])

  return { recent: recentState.data ?? [], isLoading: recentState.isLoading }
}
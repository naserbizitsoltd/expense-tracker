import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import { toAppDbError, type AppDbError } from './errors'

export interface LiveQueryState<T> {
  data: T | undefined
  error: AppDbError | undefined
  isLoading: boolean
}

/**
 * Subscribes a component to a reactive Dexie query. Any add/update/
 * delete on the tables touched inside `querier` re-runs it and
 * re-renders the component automatically — no manual refresh, no
 * "reload data" button needed.
 *
 * Pass a stable `deps` array (like useEffect) so the query re-subscribes
 * when its inputs change, e.g. useLiveQuery(() =>
 * transactionRepository.getByAccount(accountId), [accountId]).
 */
export function useLiveQuery<T>(
  querier: () => Promise<T> | T,
  deps: unknown[] = []
): LiveQueryState<T> {
  const [state, setState] = useState<LiveQueryState<T>>({
    data: undefined,
    error: undefined,
    isLoading: true,
  })

  useEffect(() => {
    const subscription = liveQuery(querier).subscribe({
      next: (value) => setState({ data: value, error: undefined, isLoading: false }),
      error: (err) => setState({ data: undefined, error: toAppDbError(err), isLoading: false }),
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}
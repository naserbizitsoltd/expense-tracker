// Wraps an async function so that while one call is still in flight,
// any further calls return the SAME in-flight promise instead of
// starting a second one. Used to make "Save" buttons safe against
// rapid double-taps without needing a debounce timer or a second
// network/DB round trip.
export function singleFlight<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>
): (...args: Args) => Promise<R> {
  let inFlight: Promise<R> | null = null

  return (...args: Args): Promise<R> => {
    if (inFlight) return inFlight
    inFlight = fn(...args).finally(() => {
      inFlight = null
    })
    return inFlight
  }
}
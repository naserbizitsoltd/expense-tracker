import 'fake-indexeddb/auto'

// Dexie/browsers rely on structuredClone; Node has it globally since
// v17, but guard in case the test runner's env doesn't expose it.
if (typeof structuredClone === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).structuredClone = (value: unknown) => JSON.parse(JSON.stringify(value))
}
import { describe, expect, it, vi } from 'vitest'
import { singleFlight } from '@/lib/singleFlight'

describe('singleFlight', () => {
  it('Test 7 — rapid duplicate calls collapse into a single underlying call', async () => {
    let callCount = 0
    const underlying = vi.fn(async (n: number) => {
      callCount += 1
      await new Promise((resolve) => setTimeout(resolve, 10))
      return n * 2
    })
    const guarded = singleFlight(underlying)

    const [a, b, c] = await Promise.all([guarded(21), guarded(21), guarded(21)])

    expect(callCount).toBe(1)
    expect(a).toBe(42)
    expect(b).toBe(42)
    expect(c).toBe(42)
  })

  it('allows a new call once the previous one has resolved', async () => {
    const underlying = vi.fn(async (n: number) => n + 1)
    const guarded = singleFlight(underlying)

    await guarded(1)
    await guarded(1)

    expect(underlying).toHaveBeenCalledTimes(2)
  })
})
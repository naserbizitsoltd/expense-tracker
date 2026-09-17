import { useEffect, useState } from 'react'

/**
 * Height (px) of the on-screen keyboard currently overlapping the layout
 * viewport. Returns 0 when there is no overlap — which is also what you get
 * on Chrome once `interactive-widget=resizes-content` is set, since there
 * the layout viewport already shrank. Safe to combine with it: the two
 * never double-count.
 */
export function useKeyboardInset(enabled: boolean): number {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setInset(0)
      return
    }
    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      const overlap = window.innerHeight - (vv.height + vv.offsetTop)
      // Small deltas are browser chrome (URL bar), not a keyboard.
      setInset(overlap > 80 ? Math.round(overlap) : 0)
    }

    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [enabled])

  return inset
}
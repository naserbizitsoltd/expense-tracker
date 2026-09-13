import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'

/**
 * How a screen swap should feel:
 *  - "tab"   → bottom-nav switches: a soft crossfade.
 *  - "push"  → drilling into a sub-page: slides in from the right, like a
 *              navigation push, with the previous screen peeking behind it.
 *  - "modal" → sheet-like overlays: gentle scale + fade up.
 *
 * The key trick: the OUTGOING screen is kept mounted (as a static "ghost")
 * for the ~200ms it takes the incoming screen to animate in on top of it,
 * instead of being removed the instant the new one starts. That's what
 * turns a hard cut (old vanishes, blank beat, new fades in) into an actual
 * swap — there's always something on screen, the new content slides/fades
 * over what was there a moment ago.
 */

export type PageTransitionKind = 'tab' | 'push' | 'modal'

const enterVariants = {
  tab: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.22, ease: 'easeOut' } },
  },
  push: {
    initial: { opacity: 0, x: 28 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] } },
  },
  modal: {
    initial: { opacity: 0, scale: 0.97, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  },
} as const

interface Screen {
  key: string
  kind: PageTransitionKind
  node: ReactNode
}

interface PageSwapperProps {
  screenKey: string
  kind?: PageTransitionKind
  className?: string
  children: ReactNode
}

/** Drop-in replacement for the old single-screen PageTransition. Wrap the
 * screen you're about to show; pass a unique `screenKey` per screen. */
export function PageTransition({ screenKey, kind = 'tab', className, children }: PageSwapperProps) {
  const current: Screen = { key: screenKey, kind, node: children }
  const [ghost, setGhost] = useState<Screen | null>(null)
  const [prevScreen, setPrevScreen] = useState<Screen>(current)

  // Deliberately setting state *during* render here (React's documented
  // pattern for "adjusting state when a prop changes"), not in an effect.
  // An effect runs after the browser has already painted the new screen at
  // its initial (invisible/offset) animation state, which is exactly the
  // one-frame blank flash we're trying to kill. Doing it here means React
  // re-renders with the ghost in place before anything reaches the screen.
  if (prevScreen.key !== current.key) {
    setGhost(prevScreen)
    setPrevScreen(current)
  }

  const v = enterVariants[kind]
  const isTransitioning = ghost !== null

  return (
    <div
      className={[className, 'relative', isTransitioning && 'transition-active'].filter(Boolean).join(' ')}
    >
      {ghost && (
        <div className="absolute inset-0 z-0" aria-hidden="true">
          {ghost.node}
        </div>
      )}
      <motion.div
        key={current.key}
        initial={v.initial}
        animate={v.animate}
        onAnimationComplete={() => setGhost(null)}
        className="relative z-10"
        style={{ willChange: isTransitioning ? 'transform, opacity' : undefined }}
      >
        {current.node}
      </motion.div>
    </div>
  )
}
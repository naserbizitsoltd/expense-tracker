import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

/**
 * Wraps a single screen so it animates in/out smoothly whenever it mounts or
 * unmounts. Two flavors:
 *  - "tab": soft cross-fade + rise, used for the four bottom-nav destinations
 *  - "push": slide-in-from-right, used for screens opened from the sidebar
 *    or drilled into (mirrors native app navigation push/pop)
 *
 * Usage: give each top-level page returned from App.tsx a stable `key` (its
 * route name) and wrap it in <PageTransition>. AnimatePresence in App.tsx
 * handles the exit animation of the outgoing screen.
 */

const variants = {
  tab: {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  },
  push: {
    initial: { opacity: 0, x: 28 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -18 },
  },
  modal: {
    initial: { opacity: 0, scale: 0.97, y: 8 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.98, y: 4 },
  },
} as const

export type PageTransitionKind = keyof typeof variants

interface PageTransitionProps {
  children: ReactNode
  kind?: PageTransitionKind
  className?: string
}

export function PageTransition({ children, kind = 'tab', className }: PageTransitionProps) {
  const v = variants[kind]
  return (
    <motion.div
      initial={v.initial}
      animate={v.animate}
      exit={v.exit}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

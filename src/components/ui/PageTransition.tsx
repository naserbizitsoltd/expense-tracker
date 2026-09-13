import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

/**
 * Wraps a single screen so it fades in the instant it mounts. The outgoing
 * screen is NOT animated on exit — it's removed immediately, same frame.
 * That's intentional: animating both the outgoing and incoming screen (even
 * "at the same time") still means two animations racing each other, which
 * reads as a delay before the new screen feels settled. Removing the old
 * screen instantly and only animating the new one in makes the swap feel
 * immediate, with just enough motion to not be a hard cut.
 */

const variants = {
  tab: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.12, ease: 'easeOut' } },
  },
  push: {
    initial: { opacity: 0, x: 16 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.16, ease: [0.22, 1, 0.36, 1] } },
  },
  modal: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.14, ease: 'easeOut' } },
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
    <motion.div initial={v.initial} animate={v.animate} className={className}>
      {children}
    </motion.div>
  )
}

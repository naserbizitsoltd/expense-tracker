import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type CardPadding = 'none' | 'sm' | 'md'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding
}

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3.5',
  md: 'p-4',
}

export function Card({ className, padding = 'md', ...props }: CardProps) {
  return (
    <div
      className={cn(
        'card-shadow rounded-xl border border-border bg-surface transition-shadow duration-200',
        paddingStyles[padding],
        className
      )}
      {...props}
    />
  )
}
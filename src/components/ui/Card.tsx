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

export function Card({ className, padding = 'md', onClick, ...props }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'card-shadow rounded-xl border border-border bg-surface transition-all duration-200',
        onClick && 'cursor-pointer active:scale-[0.985] hover:border-border hover:shadow-[var(--shadow-elevated)]',
        paddingStyles[padding],
        className
      )}
      {...props}
    />
  )
}
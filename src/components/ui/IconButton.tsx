import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/cn'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string
  variant?: 'default' | 'ghost'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = 'ghost', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-full transition-all duration-150 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:pointer-events-none',
        variant === 'default'
          ? 'bg-surface-elevated text-foreground hover:bg-border/40'
          : 'text-muted-foreground hover:bg-surface-elevated hover:text-foreground',
        className
      )}
      {...props}
    />
  )
)
IconButton.displayName = 'IconButton'
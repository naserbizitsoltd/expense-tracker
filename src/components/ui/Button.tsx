import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'gradient-hero text-primary-foreground shadow-[var(--shadow-glow)] hover:brightness-110 active:brightness-95',
  secondary: 'bg-surface-elevated text-foreground border border-border hover:bg-border/40 active:bg-border/60',
  outline: 'bg-transparent text-foreground border border-border hover:bg-surface-elevated active:bg-border/40',
  ghost: 'bg-transparent text-foreground hover:bg-surface-elevated active:bg-border/40',
  danger:
    'bg-danger text-white shadow-[0_8px_20px_-6px_rgba(251,69,112,0.5)] hover:brightness-110 active:brightness-95',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm rounded-xl gap-1.5',
  md: 'h-11 px-4.5 text-sm rounded-xl gap-2',
  lg: 'h-12 px-5 text-[15px] rounded-2xl gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  )
)
Button.displayName = 'Button'
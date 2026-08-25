import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  icon: ReactNode
  color?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeStyles = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
}

export function Avatar({ className, icon, color, size = 'md', style, ...props }: AvatarProps) {
  return (
    <div
      className={cn('flex shrink-0 items-center justify-center rounded-full', sizeStyles[size], className)}
      style={{ backgroundColor: color ? `${color}1f` : undefined, color, ...style }}
      {...props}
    >
      {icon}
    </div>
  )
}
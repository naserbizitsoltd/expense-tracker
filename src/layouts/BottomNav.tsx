import { Home, Receipt, Wallet, PieChart } from 'lucide-react'
import { cn } from '@/lib/cn'

const navItems = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'transactions', label: 'Transactions', icon: Receipt },
  { key: 'accounts', label: 'Accounts', icon: Wallet },
  { key: 'reports', label: 'Reports', icon: PieChart },
] as const

interface BottomNavProps {
  active: string
  onChange: (key: string) => void
}

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 backdrop-blur-lg" aria-label="Primary">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 pt-1.5">
        {navItems.map(({ key, label, icon: Icon }) => {
          const isActive = active === key
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              aria-current={isActive ? 'page' : undefined}
              className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors"
            >
              <span
                className={cn(
                  'flex h-8 w-11 items-center justify-center rounded-full transition-all duration-200',
                  isActive ? 'bg-primary-muted text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="h-[19px] w-[19px]" strokeWidth={isActive ? 2.25 : 2} />
              </span>
              <span className={isActive ? 'text-primary' : 'text-muted-foreground'}>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
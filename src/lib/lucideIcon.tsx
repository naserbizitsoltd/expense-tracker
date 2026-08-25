// Resolves a category/account's stored icon name (e.g. "utensils",
// "landmark") to a lucide-react component. Falls back to a generic
// icon so a bad/missing name never breaks the UI. If your project
// already has an icon-resolution helper (used by IconPicker.tsx),
// prefer that one instead of this — this is a minimal standalone
// fallback.
import { icons, Tag, type LucideProps } from 'lucide-react'

function toPascalCase(name: string): string {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

export function resolveLucideIcon(name: string): React.ComponentType<LucideProps> {
  const key = toPascalCase(name) as keyof typeof icons
  return (icons[key] as React.ComponentType<LucideProps>) ?? Tag
}

export function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = resolveLucideIcon(name)
  return <Icon {...props} />
}
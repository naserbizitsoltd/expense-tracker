import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
}

export function TagInput({ value, onChange, suggestions = [], placeholder = 'Add a tag, press Enter' }: TagInputProps) {
  const [draft, setDraft] = useState('')

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase()
    if (!tag || value.includes(tag)) {
      setDraft('')
      return
    }
    onChange([...value, tag])
    setDraft('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(draft)
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const suggestionMatches = suggestions
    .filter((s) => !value.includes(s) && s.includes(draft.trim().toLowerCase()))
    .slice(0, 6)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-elevated px-3 py-2.5">
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-primary-muted px-2.5 py-1 text-xs font-medium text-primary"
          >
            {tag}
            <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} aria-label={`Remove tag ${tag}`}>
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addTag(draft)}
          placeholder={value.length === 0 ? placeholder : ''}
          className="min-w-[80px] flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
        />
      </div>
      {draft && suggestionMatches.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5 px-1">
          {suggestionMatches.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className={cn(
                'rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-primary/60 hover:text-foreground'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
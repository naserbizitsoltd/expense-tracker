import { useMemo, useState } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  format,
} from 'date-fns'
import { CALENDAR_EVENT_CONFIG } from '../calendarConfig'
import { formatAmount } from '@/lib/money'
import type { CalendarEvent, CalendarEventType } from '@/services/calendarService'

interface CalendarMonthGridProps {
  monthAnchor: number
  events: CalendarEvent[]
  selectedDate: number | null
  onSelectDate: (date: number | null) => void
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
// Bangladesh's weekend is Friday–Saturday, not Sat–Sun — index 5 and 6 here.
const WEEKEND_INDICES = new Set([5, 6])
const MAX_SEGMENTS = 4
const TOOLTIP_ROW_THRESHOLD = 4 // rows 5+ (0-indexed) flip the tooltip upward

export function CalendarMonthGrid({ monthAnchor, events, selectedDate, onSelectDate }: CalendarMonthGridProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(monthAnchor))
    const gridEnd = endOfWeek(endOfMonth(monthAnchor))
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [monthAnchor])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of events) {
      const key = format(event.date, 'yyyy-MM-dd')
      const list = map.get(key) ?? []
      list.push(event)
      map.set(key, list)
    }
    return map
  }, [events])

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-7">
        {WEEKDAY_LABELS.map((label, index) => (
          <div
            key={label}
            className="pb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            style={WEEKEND_INDICES.has(index) ? { color: 'var(--info)', opacity: 0.75 } : undefined}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => {
          const key = format(day, 'yyyy-MM-dd')
          const inMonth = isSameMonth(day, monthAnchor)
          const selected = selectedDate !== null && isSameDay(day, selectedDate)
          const dayEvents = eventsByDay.get(key) ?? []
          const types = Array.from(new Set(dayEvents.map((e) => e.type))) as CalendarEventType[]
          const visibleTypes = types.slice(0, MAX_SEGMENTS)
          const overflowCount = types.length - visibleTypes.length
          const dayIsToday = isToday(day)
          const row = Math.floor(index / 7)
          const flipUp = row >= TOOLTIP_ROW_THRESHOLD
          const isHovered = hoveredKey === key && dayEvents.length > 0

          return (
            <div
              key={key}
              className="relative"
              onMouseEnter={() => inMonth && dayEvents.length > 0 && setHoveredKey(key)}
              onMouseLeave={() => setHoveredKey((k) => (k === key ? null : k))}
            >
              <button
                onClick={() => inMonth && onSelectDate(selected ? null : day.getTime())}
                disabled={!inMonth}
                className={[
                  'group relative flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-2xl text-[15px] tabular-nums transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  !inMonth ? 'cursor-default text-muted-foreground/25' : 'text-foreground',
                  selected
                    ? 'scale-[1.04] bg-primary font-semibold text-white shadow-lg shadow-primary/35 ring-2 ring-primary/20'
                    : dayIsToday
                    ? 'bg-primary-muted font-semibold text-primary ring-1 ring-primary/25'
                    : dayEvents.length > 0
                    ? 'bg-surface-elevated hover:-translate-y-0.5 hover:bg-surface-elevated/70 hover:shadow-sm'
                    : 'hover:bg-surface-elevated/50',
                ].join(' ')}
              >
                <span>{format(day, 'd')}</span>

                {types.length > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="flex h-[3px] w-7 gap-[2px] overflow-hidden rounded-full">
                      {visibleTypes.map((type) => (
                        <span
                          key={type}
                          className="h-full flex-1"
                          style={{
                            backgroundColor: selected ? 'rgba(255,255,255,0.85)' : CALENDAR_EVENT_CONFIG[type].color,
                          }}
                        />
                      ))}
                    </span>
                    {overflowCount > 0 && (
                      <span
                        className={`text-[8px] font-semibold leading-none ${
                          selected ? 'text-white/80' : 'text-muted-foreground'
                        }`}
                      >
                        +{overflowCount}
                      </span>
                    )}
                  </span>
                )}
              </button>

              {isHovered && (
                <div
                  className={`animate-scale-in absolute left-1/2 z-50 w-60 -translate-x-1/2 rounded-xl border border-border bg-surface p-3 shadow-xl ${
                    flipUp ? 'bottom-full mb-2' : 'top-full mt-2'
                  }`}
                >
                  <p className="mb-2 border-b border-border px-0.5 pb-1.5 text-[11px] font-semibold text-muted-foreground">
                    {format(day, 'EEE, MMM d')}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {dayEvents.slice(0, 4).map((event) => {
                      const config = CALENDAR_EVENT_CONFIG[event.type]
                      const Icon = config.icon
                      return (
                        <div key={event.id} className="flex items-center gap-2">
                          <span
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: `${config.color}26` }}
                          >
                            <Icon className="h-3 w-3" style={{ color: config.color }} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-foreground">{event.title}</p>
                          </div>
                          {event.amount !== null && event.currency && (
                            <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                              {formatAmount(event.amount, event.currency)}
                            </span>
                          )}
                        </div>
                      )
                    })}
                    {dayEvents.length > 4 && (
                      <p className="px-0.5 text-[11px] text-muted-foreground">+{dayEvents.length - 4} more — tap to view</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
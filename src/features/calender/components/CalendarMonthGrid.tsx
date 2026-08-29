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
const MAX_DOTS = 4
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
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-7">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="pb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, index) => {
          const key = format(day, 'yyyy-MM-dd')
          const inMonth = isSameMonth(day, monthAnchor)
          const selected = selectedDate !== null && isSameDay(day, selectedDate)
          const dayEvents = eventsByDay.get(key) ?? []
          const types = Array.from(new Set(dayEvents.map((e) => e.type))) as CalendarEventType[]
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
                  'flex h-14 w-full flex-col items-center justify-center gap-1 rounded-2xl text-sm transition-all duration-150',
                  !inMonth ? 'text-muted-foreground/30' : 'text-foreground',
                  selected
                    ? 'bg-primary text-white shadow-md shadow-primary/30 scale-[1.03]'
                    : dayIsToday
                    ? 'bg-primary/10 font-bold text-primary ring-1 ring-primary/30'
                    : dayEvents.length > 0
                    ? 'bg-surface-elevated hover:bg-surface-elevated/70 hover:-translate-y-0.5'
                    : 'hover:bg-surface-elevated/50',
                ].join(' ')}
              >
                <span>{format(day, 'd')}</span>
                {types.length > 0 && (
                  <span className="flex items-center gap-0.5">
                    {types.slice(0, MAX_DOTS).map((type) => (
                      <span
                        key={type}
                        className="h-1.5 w-1.5 rounded-full ring-1 ring-white/40"
                        style={{ backgroundColor: selected ? 'white' : CALENDAR_EVENT_CONFIG[type].color }}
                      />
                    ))}
                    {types.length > MAX_DOTS && (
                      <span className={`text-[9px] font-semibold ${selected ? 'text-white' : 'text-muted-foreground'}`}>
                        +{types.length - MAX_DOTS}
                      </span>
                    )}
                  </span>
                )}
              </button>

              {isHovered && (
                <div
                  className={`absolute left-1/2 z-50 w-56 -translate-x-1/2 rounded-xl border border-border bg-surface p-2.5 shadow-xl ${
                    flipUp ? 'bottom-full mb-2' : 'top-full mt-2'
                  }`}
                >
                  <p className="mb-1.5 px-0.5 text-[11px] font-semibold text-muted-foreground">
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
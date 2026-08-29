import { useMemo, useState } from 'react'
import { format, isSameDay } from 'date-fns' // Added isSameDay import
import { ChevronLeft, ChevronRight, CalendarX } from 'lucide-react'
import { AppShell } from '@/layouts/AppShell'
import { Card, Badge, EmptyState, LoadingState, Button, Dialog } from '@/components/ui'
import { formatAmount } from '@/lib/money'
import { useFinancialCalendarMonth } from '../useFinancialCalendar'
import { CALENDAR_EVENT_CONFIG } from '../calendarConfig'
import { CalendarMonthGrid } from '../components/CalendarMonthGrid' // Added import
import type { CalendarEvent, CalendarEventType } from '@/services/calendarService'

interface FinancialCalendarPageProps {
  onBack: () => void
}

const ALL_TYPES = Object.keys(CALENDAR_EVENT_CONFIG) as CalendarEventType[]

export function FinancialCalendarPage({ onBack }: FinancialCalendarPageProps) {
  const { monthAnchor, events, isLoading, goToPreviousMonth, goToNextMonth, goToToday } = useFinancialCalendarMonth()
  const [activeTypes, setActiveTypes] = useState<Set<CalendarEventType>>(new Set(ALL_TYPES))
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedDate, setSelectedDate] = useState<number | null>(null) // Added selection state

  function toggleType(type: CalendarEventType) {
    setActiveTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const visibleEvents = useMemo(() => events.filter((e) => activeTypes.has(e.type)), [events, activeTypes])

  // Added date-filtered events
  const dateFilteredEvents = useMemo(
    () => (selectedDate === null ? visibleEvents : visibleEvents.filter((e) => isSameDay(e.date, selectedDate))),
    [visibleEvents, selectedDate]
  )

  // Updated to use dateFilteredEvents
  const groups = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of dateFilteredEvents) {
      const key = format(event.date, 'yyyy-MM-dd')
      const list = map.get(key) ?? []
      list.push(event)
      map.set(key, list)
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : 1))
  }, [dateFilteredEvents])

  const isCurrentMonth = format(monthAnchor, 'yyyy-MM') === format(Date.now(), 'yyyy-MM')

  // Wrapped navigation handlers to clear selectedDate
  function handlePreviousMonth() {
    setSelectedDate(null)
    goToPreviousMonth()
  }

  function handleNextMonth() {
    setSelectedDate(null)
    goToNextMonth()
  }

  function handleGoToToday() {
    setSelectedDate(null)
    goToToday()
  }

  return (
    <AppShell title="Financial Calendar" headerBack={onBack}>
      <div className="flex flex-col gap-5">
        <Card className="flex items-center justify-between">
          <button
            onClick={handlePreviousMonth} // Updated
            aria-label="Previous month"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-elevated"
          >
            <ChevronLeft className="h-[18px] w-[18px]" />
          </button>
          <div className="flex flex-col items-center">
            <p className="text-sm font-semibold text-foreground">{format(monthAnchor, 'MMMM yyyy')}</p>
            {!isCurrentMonth && (
              <button onClick={handleGoToToday} className="text-xs font-medium text-primary">
                Today
              </button>
            )}
          </div>
          <button
            onClick={handleNextMonth} // Updated
            aria-label="Next month"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-elevated"
          >
            <ChevronRight className="h-[18px] w-[18px]" />
          </button>
        </Card>

        {/* Added CalendarMonthGrid */}
        <Card>
          <CalendarMonthGrid
            monthAnchor={monthAnchor}
            events={visibleEvents}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </Card>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {ALL_TYPES.map((type) => {
            const config = CALENDAR_EVENT_CONFIG[type]
            const active = activeTypes.has(type)
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active ? 'border-transparent text-white' : 'border-border bg-surface text-muted-foreground'
                }`}
                style={active ? { backgroundColor: config.color } : undefined}
              >
                {config.label}
              </button>
            )
          })}
        </div>

        {isLoading && <LoadingState label="Loading calendar..." />}

        {!isLoading && groups.length === 0 && (
          <EmptyState
            icon={<CalendarX className="h-6 w-6" />}
            title="Nothing scheduled"
            description="No financial events fall in this month for the selected filters."
          />
        )}

        {!isLoading &&
          groups.map(([dateKey, dayEvents]) => (
            <section key={dateKey} className="flex flex-col gap-1.5">
              <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {format(dayEvents[0].date, 'EEE, MMM d')}
              </p>
              <Card padding="sm" className="flex flex-col divide-y divide-border">
                {dayEvents.map((event) => {
                  const config = CALENDAR_EVENT_CONFIG[event.type]
                  const Icon = config.icon
                  return (
                    <button key={event.id} onClick={() => setSelectedEvent(event)} className="flex items-center gap-3 px-1 py-3 text-left">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${config.color}26` }}
                      >
                        <Icon className="h-[18px] w-[18px]" style={{ color: config.color }} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {event.entityName}
                          {event.isPast ? ' · Past' : ''}
                        </p>
                      </div>
                      {event.amount !== null && event.currency && (
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                          {formatAmount(event.amount, event.currency)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </Card>
            </section>
          ))}
      </div>

      <Dialog open={selectedEvent !== null} onClose={() => setSelectedEvent(null)} title={selectedEvent?.title}>
        {selectedEvent && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Badge>{CALENDAR_EVENT_CONFIG[selectedEvent.type].label}</Badge>
              {selectedEvent.isPast && <Badge variant="warning">Past</Badge>}
            </div>
            <DetailRow label="Date" value={format(selectedEvent.date, 'MMM d, yyyy')} />
            <DetailRow label="Account / Entity" value={selectedEvent.entityName} />
            {selectedEvent.amount !== null && selectedEvent.currency && (
              <DetailRow label="Amount" value={formatAmount(selectedEvent.amount, selectedEvent.currency)} />
            )}
            <div className="pt-2">
              <Button variant="secondary" onClick={() => setSelectedEvent(null)} className="w-full">
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </AppShell>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}
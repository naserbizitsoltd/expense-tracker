import { useMemo, useState } from 'react'
import { format, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarX } from 'lucide-react'
import { AppShell } from '@/layouts/AppShell'
import { Card, Badge, EmptyState, LoadingState, Button, Dialog } from '@/components/ui'
import { formatAmount } from '@/lib/money'
import { useFinancialCalendarMonth } from '../useFinancialCalendar'
import { CALENDAR_EVENT_CONFIG } from '../calendarConfig'
import { CalendarMonthGrid } from '../components/CalendarMonthGrid'
import type { CalendarEvent, CalendarEventType } from '@/services/calendarService'

interface FinancialCalendarPageProps {
  onBack: () => void
}

const ALL_TYPES = Object.keys(CALENDAR_EVENT_CONFIG) as CalendarEventType[]

export function FinancialCalendarPage({ onBack }: FinancialCalendarPageProps) {
  const { monthAnchor, events, isLoading, goToPreviousMonth, goToNextMonth, goToToday } = useFinancialCalendarMonth()
  const [activeTypes, setActiveTypes] = useState<Set<CalendarEventType>>(new Set(ALL_TYPES))
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedDate, setSelectedDate] = useState<number | null>(null)

  function toggleType(type: CalendarEventType) {
    setActiveTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const visibleEvents = useMemo(() => events.filter((e) => activeTypes.has(e.type)), [events, activeTypes])

  const dateFilteredEvents = useMemo(
    () => (selectedDate === null ? visibleEvents : visibleEvents.filter((e) => isSameDay(e.date, selectedDate))),
    [visibleEvents, selectedDate]
  )

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
      <div className="flex flex-col gap-5 overflow-x-hidden">
        <Card className="flex items-center justify-between">
          <button
            onClick={handlePreviousMonth}
            aria-label="Previous month"
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground active:scale-95"
          >
            <ChevronLeft className="h-[18px] w-[18px]" />
          </button>
          <div className="flex flex-col items-center gap-1">
            <p className="text-lg font-bold tracking-tight text-foreground">{format(monthAnchor, 'MMMM yyyy')}</p>
            {!isCurrentMonth ? (
              <button
                onClick={handleGoToToday}
                className="rounded-full bg-primary-muted px-2.5 py-0.5 text-[11px] font-semibold text-primary transition-colors hover:brightness-110"
              >
                Jump to today
              </button>
            ) : (
              <span className="text-[11px] font-medium text-muted-foreground">This month</span>
            )}
          </div>
          <button
            onClick={handleNextMonth}
            aria-label="Next month"
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground active:scale-95"
          >
            <ChevronRight className="h-[18px] w-[18px]" />
          </button>
        </Card>

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
            const Icon = config.icon
            const active = activeTypes.has(type)
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={[
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150',
                  active ? 'shadow-sm' : 'border-border bg-surface text-muted-foreground hover:bg-surface-elevated',
                ].join(' ')}
                style={
                  active
                    ? { backgroundColor: `${config.color}1A`, borderColor: `${config.color}40`, color: config.color }
                    : undefined
                }
              >
                <Icon className="h-3.5 w-3.5" style={active ? { color: config.color } : undefined} />
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
            <section key={dateKey} className="flex gap-3">
              <div className="flex w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-border bg-surface py-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {format(dayEvents[0].date, 'MMM')}
                </span>
                <span className="text-base font-bold tabular-nums text-foreground">
                  {format(dayEvents[0].date, 'd')}
                </span>
              </div>
              <Card padding="sm" className="flex flex-1 flex-col divide-y divide-border">
                {dayEvents.map((event) => {
                  const config = CALENDAR_EVENT_CONFIG[event.type]
                  const Icon = config.icon
                  return (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="flex items-center gap-3 px-1 py-3 text-left transition-colors hover:bg-surface-elevated/40"
                    >
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
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${CALENDAR_EVENT_CONFIG[selectedEvent.type].color}26` }}
              >
                {(() => {
                  const Icon = CALENDAR_EVENT_CONFIG[selectedEvent.type].icon
                  return <Icon className="h-5 w-5" style={{ color: CALENDAR_EVENT_CONFIG[selectedEvent.type].color }} />
                })()}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge>{CALENDAR_EVENT_CONFIG[selectedEvent.type].label}</Badge>
                {selectedEvent.isPast && <Badge variant="warning">Past</Badge>}
              </div>
            </div>

            {selectedEvent.amount !== null && selectedEvent.currency && (
              <div className="rounded-xl bg-surface-elevated px-4 py-3.5 text-center">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Amount</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
                  {formatAmount(selectedEvent.amount, selectedEvent.currency)}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <DetailRow label="Date" value={format(selectedEvent.date, 'MMM d, yyyy')} />
              <DetailRow label="Account / Entity" value={selectedEvent.entityName} />
            </div>

            <Button variant="secondary" onClick={() => setSelectedEvent(null)} className="w-full">
              Close
            </Button>
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
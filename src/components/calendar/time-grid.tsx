import * as React from "react"
import { format, isToday } from "date-fns"
import {
  MIN_HOUR_HEIGHT,
  UNTITLED_EVENT,
  conflictsAt,
  dateAtMinutes,
  dayEndMs,
  formatMinutes,
  isAllDay,
  layoutAllDayBars,
  layoutDayEvents,
  minutesIntoDay,
  snapMinutes,
} from "@/lib/calendar"
import type { AllDayEvent, CalendarEvent } from "@/lib/calendar"
import { cn } from "@/lib/utils"
import { EventPeek } from "./event-peek"

export type GridEvent = CalendarEvent & {
  color: string
  calendarName?: string
  categoryName?: string
  categoryEmoji?: string
  departmentName?: string
}

const MARKER_HEIGHT = 24
const ALL_DAY_LANE_HEIGHT = 26

const minutesAtY = (clientY: number, rectTop: number, hourHeight: number) =>
  snapMinutes(((clientY - rectTop) / hourHeight) * 60)

export function TimeGrid({
  days,
  events,
  pendingTime,
  highlightId,
  onSlotClick,
  onAllDayClick,
  onEventClick,
  onEventMove,
  onDayClick,
}: {
  days: Array<Date>
  events: Array<GridEvent>
  /** time (epoch ms) currently being created — shown as a ghost marker */
  pendingTime: number | null
  /** event to scroll into view and pulse (e.g. picked from search) */
  highlightId: string | null
  onSlotClick: (time: Date) => void
  /** click in the all-day row — create an all-day event on that day */
  onAllDayClick: (day: Date) => void
  onEventClick: (event: GridEvent) => void
  onEventMove: (event: GridEvent, time: Date) => void
  onDayClick: (day: Date) => void
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const headerRef = React.useRef<HTMLDivElement>(null)
  const justDraggedRef = React.useRef(false)
  const [now, setNow] = React.useState(() => new Date())
  const [hourHeight, setHourHeight] = React.useState(MIN_HOUR_HEIGHT)
  const [moving, setMoving] = React.useState<{
    id: string
    min: number
  } | null>(null)

  const timed = React.useMemo(
    () => events.filter((e) => !isAllDay(e)),
    [events]
  )
  const allDay = React.useMemo(
    () => events.filter((e): e is GridEvent & AllDayEvent => isAllDay(e)),
    [events]
  )

  // Stretch hours so a tall viewport is filled edge to edge; short
  // viewports keep a readable minimum and scroll instead.
  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => {
      const header = headerRef.current?.offsetHeight ?? 0
      setHourHeight(Math.max(MIN_HOUR_HEIGHT, (el.clientHeight - header) / 24))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    // Open the view around the morning, like Google Calendar.
    scrollRef.current?.scrollTo({ top: 7 * MIN_HOUR_HEIGHT })
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  // Center the highlighted event vertically. `events` stays a dependency
  // because the target may still be loading when the highlight is set.
  React.useEffect(() => {
    const el = scrollRef.current
    if (!highlightId || !el) return
    const target = timed.find((e) => e._id === highlightId)
    if (!target) return
    const top =
      (minutesIntoDay(new Date(target.time!)) / 60) * hourHeight -
      el.clientHeight / 2
    el.scrollTo({ top: Math.max(0, top), behavior: "smooth" })
  }, [highlightId, timed, hourHeight])

  const gridHeight = 24 * hourHeight

  const handleColumnClick = (
    e: React.MouseEvent<HTMLDivElement>,
    day: Date
  ) => {
    if (justDraggedRef.current) {
      justDraggedRef.current = false
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    onSlotClick(dateAtMinutes(day, minutesAtY(e.clientY, rect.top, hourHeight)))
  }

  const startMarkerDrag = (
    e: React.MouseEvent,
    event: GridEvent,
    day: Date,
    originMin: number
  ) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const startY = e.clientY
    let currentMin = originMin
    let moved = false

    const onMove = (ev: MouseEvent) => {
      if (Math.abs(ev.clientY - startY) > 3) moved = true
      const next = snapMinutes(
        originMin + ((ev.clientY - startY) / hourHeight) * 60
      )
      if (next !== currentMin) {
        currentMin = next
        setMoving({ id: event._id, min: next })
      }
    }
    const onUp = () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
      setMoving(null)
      if (moved) {
        justDraggedRef.current = true
        if (currentMin !== originMin) {
          onEventMove(event, dateAtMinutes(day, currentMin))
        }
      } else {
        onEventClick(event)
      }
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  const { bars, laneCount } = React.useMemo(
    () => layoutAllDayBars(allDay, days),
    [allDay, days]
  )
  const allDayHeight = Math.max(laneCount, 1) * ALL_DAY_LANE_HEIGHT + 6

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto select-none">
      {/* Day headers + all-day shelf */}
      <div
        ref={headerRef}
        className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-sm"
      >
        <div className="flex">
          <div className="w-14 shrink-0" />
          {days.map((day) => (
            <button
              key={day.getTime()}
              type="button"
              onClick={() => onDayClick(day)}
              className="group flex min-w-0 flex-1 flex-col items-center gap-0.5 border-l py-1.5 sm:py-2"
            >
              <span
                className={cn(
                  "text-[10px] font-medium tracking-wide uppercase sm:text-[11px]",
                  isToday(day) ? "text-primary" : "text-muted-foreground"
                )}
              >
                {format(day, "EEE")}
              </span>
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-base tabular-nums transition-[background-color,color,scale] duration-200 group-hover:scale-110 group-active:scale-[0.96] sm:size-9 sm:text-lg",
                  isToday(day)
                    ? "bg-primary font-medium text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {format(day, "d")}
              </span>
            </button>
          ))}
        </div>

        {/* All-day events sit above the hour grid, spanning their days. */}
        <div className="flex border-t border-border/60">
          <div className="flex w-14 shrink-0 items-start justify-end pt-1.5 pr-2">
            <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              all-day
            </span>
          </div>
          <div className="relative flex-1" style={{ height: allDayHeight }}>
            <div className="absolute inset-0 flex">
              {days.map((day) => (
                <div
                  key={day.getTime()}
                  className="min-w-0 flex-1 cursor-pointer border-l border-border/60 transition-colors hover:bg-muted/40"
                  onClick={() => onAllDayClick(day)}
                />
              ))}
            </div>
            {bars.map(
              ({ item, startCol, span, lane, startsBefore, endsAfter }) => (
                <React.Fragment key={item._id}>
                  <EventPeek
                    event={item}
                    conflicts={[]}
                    disabled={moving !== null}
                  >
                    <button
                      type="button"
                      className={cn(
                        "absolute z-10 flex animate-in items-center gap-1.5 overflow-hidden border border-black/5 px-2 text-left shadow-xs transition-[scale,box-shadow] duration-200 fill-mode-backwards zoom-in-95 fade-in hover:scale-[1.01] hover:shadow-md dark:border-white/10",
                        startsBefore ? "rounded-l-sm" : "rounded-l-full",
                        endsAfter ? "rounded-r-sm" : "rounded-r-full"
                      )}
                      style={{
                        top: 3 + lane * ALL_DAY_LANE_HEIGHT,
                        height: ALL_DAY_LANE_HEIGHT - 4,
                        left: `calc(${(startCol / days.length) * 100}% + 3px)`,
                        width: `calc(${(span / days.length) * 100}% - 6px)`,
                        background: `color-mix(in oklab, ${item.color} 30%, var(--background))`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventClick(item)
                      }}
                    >
                      {startsBefore && (
                        <span
                          aria-hidden
                          className="text-[10px] text-muted-foreground"
                        >
                          ‹
                        </span>
                      )}
                      {item.categoryEmoji && (
                        <span
                          aria-hidden
                          className="shrink-0 text-[11px] leading-none"
                        >
                          {item.categoryEmoji}
                        </span>
                      )}
                      <span className="truncate text-xs font-medium">
                        {item.title || UNTITLED_EVENT}
                      </span>
                      {endsAfter && (
                        <span
                          aria-hidden
                          className="ml-auto text-[10px] text-muted-foreground"
                        >
                          ›
                        </span>
                      )}
                    </button>
                  </EventPeek>
                  {highlightId === item._id && (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute z-30 rounded-full motion-safe:animate-spotlight motion-reduce:ring-2 motion-reduce:ring-primary"
                      style={{
                        top: 3 + lane * ALL_DAY_LANE_HEIGHT,
                        height: ALL_DAY_LANE_HEIGHT - 4,
                        left: `calc(${(startCol / days.length) * 100}% + 3px)`,
                        width: `calc(${(span / days.length) * 100}% - 6px)`,
                      }}
                    />
                  )}
                </React.Fragment>
              )
            )}
          </div>
        </div>
      </div>

      {/* Grid body */}
      <div className="relative flex">
        {/* Hour labels */}
        <div className="relative w-14 shrink-0" style={{ height: gridHeight }}>
          {Array.from({ length: 23 }, (_, i) => i + 1).map((hour) => (
            <span
              key={hour}
              className="absolute right-2 flex -translate-y-1/2 items-center gap-1 text-[10px] whitespace-nowrap text-muted-foreground tabular-nums sm:text-[11px]"
              style={{ top: hour * hourHeight }}
            >
              {formatMinutes(hour * 60, "h a")}
              <span aria-hidden className="h-px w-1.5 bg-border" />
            </span>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => (
          <DayColumn
            key={day.getTime()}
            day={day}
            events={timed}
            moving={moving}
            pendingTime={pendingTime}
            highlightId={highlightId}
            now={now}
            hourHeight={hourHeight}
            gridHeight={gridHeight}
            onClick={(e) => handleColumnClick(e, day)}
            onEventClick={onEventClick}
            onMarkerMouseDown={startMarkerDrag}
          />
        ))}
      </div>
    </div>
  )
}

function DayColumn({
  day,
  events,
  moving,
  pendingTime,
  highlightId,
  now,
  hourHeight,
  gridHeight,
  onClick,
  onEventClick,
  onMarkerMouseDown,
}: {
  day: Date
  events: Array<GridEvent>
  moving: { id: string; min: number } | null
  pendingTime: number | null
  highlightId: string | null
  now: Date
  hourHeight: number
  gridHeight: number
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void
  onEventClick: (event: GridEvent) => void
  onMarkerMouseDown: (
    e: React.MouseEvent,
    event: GridEvent,
    day: Date,
    originMin: number
  ) => void
}) {
  const dayStart = day.getTime()
  const dayEnd = dayEndMs(day)

  // The hover "dial": a snapped time indicator that follows the cursor.
  const [dial, setDial] = React.useState<number | null>(null)

  const positioned = React.useMemo(() => {
    const dayEvents = events.filter(
      (e) => e.time! >= dayStart && e.time! < dayEnd
    )
    return layoutDayEvents(
      dayEvents.map((e) => ({
        item: e,
        startMin:
          moving?.id === e._id ? moving.min : minutesIntoDay(new Date(e.time!)),
      }))
      // Same-time events always share a day, so dayEvents covers them.
    ).map((p) => ({
      ...p,
      conflicts: conflictsAt(dayEvents, p.item.time!, p.item._id),
    }))
  }, [events, dayStart, dayEnd, moving])

  const markerTop = (startMin: number) =>
    Math.min(
      Math.max((startMin / 60) * hourHeight - MARKER_HEIGHT / 2, 0),
      gridHeight - MARKER_HEIGHT
    )

  const pendingMin =
    pendingTime !== null && pendingTime >= dayStart && pendingTime < dayEnd
      ? minutesIntoDay(new Date(pendingTime))
      : null

  return (
    <div
      className="relative min-w-0 flex-1 border-l border-border/60"
      style={{ height: gridHeight }}
      onClick={onClick}
      onMouseMove={(e) => {
        if (moving !== null) return
        const rect = e.currentTarget.getBoundingClientRect()
        const min = minutesAtY(e.clientY, rect.top, hourHeight)
        setDial((prev) => (prev === min ? prev : min))
      }}
      onMouseLeave={() => setDial(null)}
    >
      {dial !== null && moving === null && (
        <div
          className="pointer-events-none absolute inset-x-0 z-20 animate-in transition-[top] duration-150 ease-out fade-in"
          style={{ top: (dial / 60) * hourHeight }}
        >
          <div className="border-t border-dashed border-primary/50" />
          <span className="absolute top-0 left-1.5 origin-left -translate-y-1/2 animate-in rounded-full border border-primary/25 bg-background px-1.5 py-0.5 text-[10px] font-medium text-primary tabular-nums shadow-xs duration-200 zoom-in-75 fade-in">
            {format(dateAtMinutes(day, dial), "h:mm a")}
          </span>
        </div>
      )}
      {positioned.map(({ item, startMin, col, cols, conflicts }, i) => {
        const isMoving = moving?.id === item._id
        const left = `calc((100% - 10px) * ${col / cols} + 3px)`
        const width = `calc((100% - 10px) * ${1 / cols} - 3px)`
        return (
          <React.Fragment key={item._id}>
            <EventPeek
              event={item}
              conflicts={conflicts}
              disabled={moving !== null}
            >
              <div
                role="button"
                tabIndex={0}
                className={cn(
                  "absolute z-10 flex cursor-grab items-center gap-1.5 overflow-hidden rounded-full border border-black/5 px-2 shadow-xs dark:border-white/10",
                  "animate-in transition-[top,left,width,scale,box-shadow] duration-200 ease-out fill-mode-backwards zoom-in-90 fade-in hover:scale-[1.03] hover:shadow-md",
                  isMoving && "z-30 scale-[1.03] cursor-grabbing shadow-lg"
                )}
                style={{
                  top: markerTop(startMin),
                  height: MARKER_HEIGHT,
                  left,
                  width,
                  background: `color-mix(in oklab, ${item.color} 25%, var(--background))`,
                  animationDelay: `${Math.min(i * 25, 250)}ms`,
                }}
                onMouseDown={(e) => onMarkerMouseDown(e, item, day, startMin)}
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={() => setDial(null)}
                onMouseMove={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onEventClick(item)
                  }
                }}
              >
                {item.categoryEmoji ? (
                  <span
                    aria-hidden
                    className="shrink-0 text-[11px] leading-none"
                  >
                    {item.categoryEmoji}
                  </span>
                ) : (
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                )}
                <span className="shrink-0 text-[10px] font-medium text-muted-foreground tabular-nums">
                  {format(dateAtMinutes(day, startMin), "h:mm")}
                </span>
                <span className="truncate text-xs font-medium">
                  {item.title || UNTITLED_EVENT}
                </span>
              </div>
            </EventPeek>
            {/* Search spotlight: a transient overlay so the pings never
              contend with the marker's own enter animation. It ends
              invisible, so unmounting it is seamless. */}
            {highlightId === item._id && (
              <div
                aria-hidden
                className="pointer-events-none absolute z-30 rounded-full motion-safe:animate-spotlight motion-reduce:ring-2 motion-reduce:ring-primary"
                style={{
                  top: markerTop(startMin),
                  height: MARKER_HEIGHT,
                  left,
                  width,
                }}
              />
            )}
          </React.Fragment>
        )
      })}

      {pendingMin !== null && (
        <div
          className="pointer-events-none absolute inset-x-1 z-20 flex animate-in items-center gap-1.5 rounded-full bg-primary px-2 text-primary-foreground shadow-md transition-[top] duration-200 ease-out zoom-in-95 fade-in"
          style={{ top: markerTop(pendingMin), height: MARKER_HEIGHT }}
        >
          <span className="text-[10px] font-medium tabular-nums">
            {format(dateAtMinutes(day, pendingMin), "h:mm a")}
          </span>
          <span className="truncate text-xs font-medium">New event</span>
        </div>
      )}

      {isToday(day) && (
        <div
          className="pointer-events-none absolute inset-x-0 z-30"
          style={{ top: (minutesIntoDay(now) / 60) * hourHeight }}
        >
          <div className="relative h-0.5 bg-red-500">
            <div className="absolute -top-[3px] -left-1 size-2 animate-ping rounded-full bg-red-500 [animation-duration:3s]" />
            <div className="absolute -top-[3px] -left-1 size-2 rounded-full bg-red-500" />
          </div>
        </div>
      )}
    </div>
  )
}

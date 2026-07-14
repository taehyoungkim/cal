import * as React from "react"
import { format, isToday } from "date-fns"
import {
  DAY_MINUTES,
  MIN_HOUR_HEIGHT,
  dateAtMinutes,
  layoutDayEvents,
  minutesIntoDay,
  snapMinutes,
} from "@/lib/calendar"
import type { CalendarEvent } from "@/lib/calendar"
import { cn } from "@/lib/utils"

export type GridEvent = CalendarEvent & { color: string }

const MARKER_HEIGHT = 24

export function TimeGrid({
  days,
  events,
  pendingTime,
  onSlotClick,
  onEventClick,
  onEventMove,
  onDayClick,
}: {
  days: Array<Date>
  events: Array<GridEvent>
  /** time (epoch ms) currently being created — shown as a ghost marker */
  pendingTime: number | null
  onSlotClick: (time: Date) => void
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
    const minutes = snapMinutes(((e.clientY - rect.top) / hourHeight) * 60)
    onSlotClick(dateAtMinutes(day, minutes))
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

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto select-none">
      {/* Day headers */}
      <div
        ref={headerRef}
        className="sticky top-0 z-40 flex border-b bg-background/95 backdrop-blur-sm"
      >
        <div className="w-12 shrink-0 sm:w-14" />
        {days.map((day) => (
          <button
            key={day.getTime()}
            type="button"
            onClick={() => onDayClick(day)}
            className="flex min-w-0 flex-1 flex-col items-center gap-0.5 border-l py-1.5 sm:py-2"
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
                "flex size-7 items-center justify-center rounded-full text-base tabular-nums transition-colors sm:size-9 sm:text-lg",
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

      {/* Grid body */}
      <div className="relative flex">
        {/* Hour labels */}
        <div
          className="relative w-12 shrink-0 sm:w-14"
          style={{ height: gridHeight }}
        >
          {Array.from({ length: 23 }, (_, i) => i + 1).map((hour) => (
            <span
              key={hour}
              className="absolute right-2 flex -translate-y-1/2 items-center gap-1 text-[10px] text-muted-foreground tabular-nums sm:text-[11px]"
              style={{ top: hour * hourHeight }}
            >
              {format(new Date(2000, 0, 1, hour), "h a")}
              <span aria-hidden className="h-px w-1.5 bg-border" />
            </span>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => (
          <DayColumn
            key={day.getTime()}
            day={day}
            events={events}
            moving={moving}
            pendingTime={pendingTime}
            now={now}
            hourHeight={hourHeight}
            gridHeight={gridHeight}
            onClick={(e) => handleColumnClick(e, day)}
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
  now,
  hourHeight,
  gridHeight,
  onClick,
  onMarkerMouseDown,
}: {
  day: Date
  events: Array<GridEvent>
  moving: { id: string; min: number } | null
  pendingTime: number | null
  now: Date
  hourHeight: number
  gridHeight: number
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void
  onMarkerMouseDown: (
    e: React.MouseEvent,
    event: GridEvent,
    day: Date,
    originMin: number
  ) => void
}) {
  const dayStart = day.getTime()
  const dayEnd = dayStart + DAY_MINUTES * 60_000

  // The hover "dial": a snapped time indicator that follows the cursor.
  const [dial, setDial] = React.useState<number | null>(null)

  const positioned = layoutDayEvents(
    events
      .filter((e) => e.time >= dayStart && e.time < dayEnd)
      .map((e) => ({
        item: e,
        startMin:
          moving?.id === e._id ? moving.min : minutesIntoDay(new Date(e.time)),
      }))
  )

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
        const rect = e.currentTarget.getBoundingClientRect()
        const min = snapMinutes(((e.clientY - rect.top) / hourHeight) * 60)
        setDial((prev) => (prev === min ? prev : min))
      }}
      onMouseLeave={() => setDial(null)}
    >
      {dial !== null && moving === null && (
        <div
          className="pointer-events-none absolute inset-x-0 z-20"
          style={{ top: (dial / 60) * hourHeight }}
        >
          <div className="border-t border-dashed border-primary/50" />
          <span className="absolute top-0 left-1.5 -translate-y-1/2 rounded-full border border-primary/25 bg-background px-1.5 py-0.5 text-[10px] font-medium text-primary tabular-nums shadow-xs">
            {format(dateAtMinutes(day, dial), "h:mm a")}
          </span>
        </div>
      )}
      {positioned.map(({ item, startMin, col, cols }) => {
        const isMoving = moving?.id === item._id
        return (
          <div
            key={item._id}
            role="button"
            tabIndex={0}
            className={cn(
              "absolute z-10 flex cursor-grab items-center gap-1.5 overflow-hidden rounded-full border border-black/5 px-2 shadow-xs transition-shadow hover:shadow-sm dark:border-white/10",
              isMoving && "z-30 cursor-grabbing shadow-md"
            )}
            style={{
              top: markerTop(startMin),
              height: MARKER_HEIGHT,
              left: `calc((100% - 10px) * ${col / cols} + 3px)`,
              width: `calc((100% - 10px) * ${1 / cols} - 3px)`,
              background: `color-mix(in oklab, ${item.color} 25%, var(--background))`,
            }}
            onMouseDown={(e) => onMarkerMouseDown(e, item, day, startMin)}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => setDial(null)}
            onMouseMove={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onMarkerMouseDown(
                  e as unknown as React.MouseEvent,
                  item,
                  day,
                  startMin
                )
              }
            }}
          >
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="shrink-0 text-[10px] font-medium text-muted-foreground tabular-nums">
              {format(dateAtMinutes(day, startMin), "h:mm")}
            </span>
            <span className="truncate text-xs font-medium">
              {item.title || "(No title)"}
            </span>
          </div>
        )
      })}

      {pendingMin !== null && (
        <div
          className="pointer-events-none absolute inset-x-1 z-20 flex items-center gap-1.5 rounded-full bg-primary px-2 text-primary-foreground shadow-md"
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
            <div className="absolute -top-[3px] -left-1 size-2 rounded-full bg-red-500" />
          </div>
        </div>
      )}
    </div>
  )
}

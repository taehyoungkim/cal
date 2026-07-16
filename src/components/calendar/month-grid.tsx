import * as React from "react"
import {
  addDays,
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import {
  UNTITLED_EVENT,
  dayKey,
  isAllDay,
  layoutAllDayBars,
  minutesIntoDay,
} from "@/lib/calendar"
import type { AllDayEvent } from "@/lib/calendar"
import { cn } from "@/lib/utils"
import { EventPeek } from "./event-peek"
import type { GridEvent } from "./time-grid"

const CELL_HEADER_HEIGHT = 30
const LANE_HEIGHT = 24
/** Vertical slots (bars + chips) a cell shows before "+N more". */
const MAX_SLOTS = 4

/** The Sundays of every week the month view shows. */
export function monthGridRange(anchor: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 }),
  }
}

export function MonthGrid({
  anchor,
  events,
  highlightId,
  onDayClick,
  onDayCreate,
  onEventClick,
}: {
  anchor: Date
  events: Array<GridEvent>
  highlightId: string | null
  /** open a day (date-number click, "+N more") */
  onDayClick: (day: Date) => void
  /** click on a cell's empty space — create an all-day event that day */
  onDayCreate: (day: Date) => void
  onEventClick: (event: GridEvent) => void
}) {
  const { start, end } = monthGridRange(anchor)
  const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 0 })

  // One pass buckets the month's timed events per day, so cells don't
  // each re-filter the whole list.
  const timedByDay = React.useMemo(() => {
    const buckets = new Map<string, Array<GridEvent>>()
    for (const event of events) {
      if (isAllDay(event)) continue
      const key = dayKey(new Date(event.time!))
      const bucket = buckets.get(key)
      if (bucket) bucket.push(event)
      else buckets.set(key, [event])
    }
    for (const bucket of buckets.values()) {
      bucket.sort((a, b) => a.time! - b.time!)
    }
    return buckets
  }, [events])
  const allDay = React.useMemo(
    () => events.filter((e): e is GridEvent & AllDayEvent => isAllDay(e)),
    [events]
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col select-none">
      <div className="grid shrink-0 grid-cols-7 border-b">
        {Array.from({ length: 7 }, (_, i) => (
          <span
            key={i}
            className="py-1.5 text-center text-[10px] font-medium tracking-wide text-muted-foreground uppercase sm:text-[11px]"
          >
            {format(addDays(start, i), "EEE")}
          </span>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 auto-rows-fr overflow-y-auto">
        {weeks.map((weekStart) => (
          <WeekRow
            key={weekStart.getTime()}
            weekStart={weekStart}
            anchor={anchor}
            timedByDay={timedByDay}
            allDay={allDay}
            highlightId={highlightId}
            onDayClick={onDayClick}
            onDayCreate={onDayCreate}
            onEventClick={onEventClick}
          />
        ))}
      </div>
    </div>
  )
}

function WeekRow({
  weekStart,
  anchor,
  timedByDay,
  allDay,
  highlightId,
  onDayClick,
  onDayCreate,
  onEventClick,
}: {
  weekStart: Date
  anchor: Date
  timedByDay: Map<string, Array<GridEvent>>
  allDay: Array<GridEvent & AllDayEvent>
  highlightId: string | null
  onDayClick: (day: Date) => void
  onDayCreate: (day: Date) => void
  onEventClick: (event: GridEvent) => void
}) {
  const days = React.useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )
  const { bars, laneCount } = React.useMemo(
    () => layoutAllDayBars(allDay, days),
    [allDay, days]
  )
  const chipBudget = Math.max(0, MAX_SLOTS - laneCount)

  return (
    <div className="relative grid min-h-24 grid-cols-7 border-b border-border/60">
      {days.map((day) => {
        const dayEvents = timedByDay.get(dayKey(day)) ?? []
        const visible = dayEvents.slice(0, chipBudget)
        const overflow = dayEvents.length - visible.length
        const outside = !isSameMonth(day, anchor)
        return (
          <div
            key={day.getTime()}
            className={cn(
              "flex min-w-0 flex-col overflow-hidden border-l border-border/60 pb-1 transition-colors first:border-l-0 hover:bg-muted/30",
              outside && "bg-muted/20"
            )}
            onClick={() => onDayCreate(day)}
          >
            <div
              className="flex shrink-0 items-start justify-center pt-1"
              style={{ height: CELL_HEADER_HEIGHT }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDayClick(day)
                }}
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs tabular-nums transition-[background-color,color,scale] duration-200 hover:scale-110 active:scale-[0.96] sm:text-sm",
                  isToday(day)
                    ? "bg-primary font-medium text-primary-foreground"
                    : outside
                      ? "text-muted-foreground/60 hover:bg-muted"
                      : "text-foreground hover:bg-muted"
                )}
              >
                {format(day, "d")}
              </button>
            </div>
            {/* Space held for the week's spanning all-day bars. */}
            <div
              aria-hidden
              className="shrink-0"
              style={{ height: laneCount * LANE_HEIGHT }}
            />
            {visible.map((event) => (
              <EventPeek
                key={event._id}
                event={event}
                conflicts={event.conflicts ?? []}
                disabled={false}
              >
                <button
                  type="button"
                  className={cn(
                    "mx-1 mt-0.5 flex shrink-0 items-center gap-1 truncate rounded-md px-1 py-px text-left text-[11px] transition-colors hover:bg-muted",
                    highlightId === event._id &&
                      "motion-safe:animate-spotlight motion-reduce:ring-2 motion-reduce:ring-primary"
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    onEventClick(event)
                  }}
                >
                  {event.categoryEmoji ? (
                    <span
                      aria-hidden
                      className="shrink-0 text-[10px] leading-none"
                    >
                      {event.categoryEmoji}
                    </span>
                  ) : (
                    <span
                      aria-hidden
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: event.color }}
                    />
                  )}
                  <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums max-sm:hidden">
                    {formatChipTime(event.time!)}
                  </span>
                  <span className="truncate font-medium">
                    {event.title || UNTITLED_EVENT}
                  </span>
                </button>
              </EventPeek>
            ))}
            {overflow > 0 && (
              <button
                type="button"
                className="mx-1 mt-0.5 shrink-0 rounded-md px-1 py-px text-left text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation()
                  onDayClick(day)
                }}
              >
                +{overflow} more
              </button>
            )}
          </div>
        )
      })}

      {/* Spanning all-day bars, laid over the whole week row. */}
      {bars.map(({ item, startCol, span, lane, startsBefore, endsAfter }) => (
        <React.Fragment key={item._id}>
          <EventPeek event={item} conflicts={[]} disabled={false}>
            <button
              type="button"
              className={cn(
                "absolute z-10 flex items-center overflow-hidden border border-black/5 px-1.5 text-left shadow-xs transition-[scale,box-shadow] duration-200 hover:z-20 hover:scale-[1.01] hover:shadow-md dark:border-white/10",
                startsBefore ? "rounded-l-sm" : "rounded-l-full",
                endsAfter ? "rounded-r-sm" : "rounded-r-full",
                highlightId === item._id &&
                  "motion-safe:animate-spotlight motion-reduce:ring-2 motion-reduce:ring-primary"
              )}
              style={{
                top: CELL_HEADER_HEIGHT + lane * LANE_HEIGHT,
                height: LANE_HEIGHT - 4,
                left: `calc(${(startCol / 7) * 100}% + 3px)`,
                width: `calc(${(span / 7) * 100}% - 6px)`,
                background: `color-mix(in oklab, ${item.color} 30%, var(--background))`,
              }}
              onClick={(e) => {
                e.stopPropagation()
                onEventClick(item)
              }}
            >
              {item.categoryEmoji && (
                <span
                  aria-hidden
                  className="mr-1 shrink-0 text-[10px] leading-none"
                >
                  {item.categoryEmoji}
                </span>
              )}
              <span className="truncate text-[11px] font-medium">
                {item.title || UNTITLED_EVENT}
              </span>
            </button>
          </EventPeek>
        </React.Fragment>
      ))}
    </div>
  )
}

/** "9:30" / "14:05" style chip time — compact, minute-precise. */
function formatChipTime(time: number): string {
  const date = new Date(time)
  return minutesIntoDay(date) % 60 === 0
    ? format(date, "h a").toLowerCase().replace(" ", "")
    : format(date, "h:mm")
}

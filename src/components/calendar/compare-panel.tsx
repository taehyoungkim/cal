import * as React from "react"
import { Link } from "@tanstack/react-router"
import { format, isSameDay, startOfDay } from "date-fns"
import { ArrowUpRight, X } from "lucide-react"
import {
  UNTITLED_EVENT,
  calendarKey,
  dayKey,
  formatDaySpan,
  isAllDay,
  isTimed,
} from "@/lib/calendar"
import type { CalendarDoc } from "@/lib/calendar"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { ColorDot } from "./label-picker"
import type { GridEvent } from "./time-grid"

/**
 * A side panel showing another calendar's schedule for one day, so a
 * cross-calendar conflict can be compared without leaving the current
 * view. Slides in next to the grid; on phones it overlays it.
 */
export function ComparePanel({
  calendar,
  highlightTime,
  events,
  onClose,
  onEventClick,
}: {
  calendar: CalendarDoc
  /** the clashing minute — its rows get the amber treatment, and its
   * day is the one the panel shows */
  highlightTime: number
  /** the compared calendar's events (any range; filtered to the day here) */
  events: Array<GridEvent>
  onClose: () => void
  onEventClick: (event: GridEvent) => void
}) {
  const day = React.useMemo(
    () => startOfDay(new Date(highlightTime)),
    [highlightTime]
  )
  const key = dayKey(day)
  const timed = React.useMemo(
    () =>
      events
        .filter(isTimed)
        .filter((e) => isSameDay(new Date(e.time), day))
        .sort((a, b) => a.time - b.time),
    [events, day]
  )
  const allDay = React.useMemo(
    () =>
      events
        .filter(isAllDay)
        .filter((e) => e.startDate <= key && e.endDate >= key),
    [events, key]
  )

  return (
    <aside className="flex w-72 shrink-0 animate-in flex-col border-l bg-background duration-300 fade-in slide-in-from-right-6 max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:z-40 max-md:shadow-xl">
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <ColorDot color={calendar.color} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {calendar.name}
        </span>
        <Link
          to="/calendar/$calendarKey"
          params={{ calendarKey: calendarKey(calendar) }}
          aria-label={`Open ${calendar.name}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "size-6 text-muted-foreground hover:text-foreground"
          )}
        >
          <ArrowUpRight className="size-4" />
        </Link>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close comparison"
          className="size-6 text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </header>
      <p className="border-b px-3 py-1.5 text-xs text-muted-foreground">
        {format(day, "EEEE, MMM d")}
      </p>

      <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {allDay.map((event) => (
          <button
            key={event._id}
            type="button"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:brightness-95"
            style={{
              background: `color-mix(in oklab, ${event.color} 25%, var(--background))`,
            }}
            onClick={() => onEventClick(event)}
          >
            {event.categoryEmoji && (
              <span aria-hidden className="shrink-0 text-xs leading-none">
                {event.categoryEmoji}
              </span>
            )}
            <span className="min-w-0 flex-1 truncate text-xs font-medium">
              {event.title || UNTITLED_EVENT}
            </span>
            <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
              {formatDaySpan(event)}
            </span>
          </button>
        ))}

        {timed.map((event) => {
          const clashing = event.time === highlightTime
          return (
            <button
              key={event._id}
              type="button"
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted",
                clashing && "bg-amber-500/10 hover:bg-amber-500/15"
              )}
              onClick={() => onEventClick(event)}
            >
              <span
                className={cn(
                  "shrink-0 text-[11px] tabular-nums",
                  clashing
                    ? "font-semibold text-amber-700 dark:text-amber-300"
                    : "text-muted-foreground"
                )}
              >
                {format(event.time, "h:mm a")}
              </span>
              {event.categoryEmoji && (
                <span aria-hidden className="shrink-0 text-xs leading-none">
                  {event.categoryEmoji}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-xs font-medium">
                {event.title || UNTITLED_EVENT}
              </span>
            </button>
          )
        })}

        {timed.length === 0 && allDay.length === 0 && (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">
            Nothing on this day.
          </p>
        )}
      </div>
    </aside>
  )
}

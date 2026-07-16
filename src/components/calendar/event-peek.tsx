import * as React from "react"
import { format } from "date-fns"
import { Building2, ChevronRight } from "lucide-react"
import { UNTITLED_EVENT, formatDaySpan, isAllDay } from "@/lib/calendar"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { ColorDot } from "./label-picker"
import type { GridEvent } from "./time-grid"

/**
 * A read-only preview card that floats next to an event marker after a
 * short hover. The trigger is the marker itself (via base-ui's render
 * prop), so the card anchors to it without extra DOM.
 */
export function EventPeek({
  event,
  conflicts,
  disabled,
  onConflictClick,
  children,
}: {
  event: GridEvent
  conflicts: Array<GridEvent>
  /** suppress while any marker is being dragged */
  disabled: boolean
  /** makes cross-calendar conflict rows clickable (compare view) */
  onConflictClick?: (event: GridEvent) => void
  children: React.ReactElement
}) {
  const [open, setOpen] = React.useState(false)

  // A drag that starts mid-hover closes the card and keeps it closed.
  React.useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  const when = isAllDay(event)
    ? `${formatDaySpan(event)} · All day`
    : format(new Date(event.time!), "EEEE, MMM d · h:mm a")

  return (
    <HoverCard open={open} onOpenChange={(next) => setOpen(next && !disabled)}>
      <HoverCardTrigger
        render={children}
        delay={500}
        onMouseDown={() => setOpen(false)}
      />
      <HoverCardContent
        side="right"
        align="start"
        sideOffset={10}
        className="w-64"
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-balance">
              {event.title || UNTITLED_EVENT}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">{when}</p>
          </div>

          {(event.calendarName || event.categoryName) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {event.calendarName && (
                <div className="flex items-center gap-1.5">
                  <ColorDot color={event.color} className="size-2" />
                  <span className="text-xs text-muted-foreground">
                    {event.calendarName}
                  </span>
                </div>
              )}
              {event.categoryName && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {event.categoryEmoji && (
                    <span aria-hidden className="mr-1">
                      {event.categoryEmoji}
                    </span>
                  )}
                  {event.categoryName}
                </span>
              )}
            </div>
          )}

          {event.departmentName && (
            <div className="flex items-center gap-1.5">
              <Building2 className="size-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {event.departmentName}
              </span>
            </div>
          )}

          {event.details && (
            <p className="line-clamp-4 border-t border-border/60 pt-2 text-xs text-pretty text-muted-foreground">
              {event.details}
            </p>
          )}

          {conflicts.length > 0 && (
            <div className="flex flex-col gap-1 border-t border-border/60 pt-2">
              <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                Also at this time
              </span>
              {conflicts.map((conflict) => {
                const crossCalendar = conflict.calendarId !== event.calendarId
                const clickable = Boolean(
                  crossCalendar && conflict.calendarId && onConflictClick
                )
                const content = (
                  <>
                    <ColorDot color={conflict.color} className="size-2" />
                    <span className="min-w-0 flex-1 truncate">
                      {conflict.title || UNTITLED_EVENT}
                    </span>
                    {crossCalendar && conflict.calendarName && (
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {conflict.calendarName}
                      </span>
                    )}
                    {clickable && (
                      <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
                    )}
                  </>
                )
                if (!clickable) {
                  return (
                    <div
                      key={conflict._id}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      {content}
                    </div>
                  )
                }
                return (
                  <button
                    key={conflict._id}
                    type="button"
                    className="-mx-1.5 flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-xs transition-colors hover:bg-muted"
                    onClick={() => {
                      setOpen(false)
                      onConflictClick?.(conflict)
                    }}
                  >
                    {content}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

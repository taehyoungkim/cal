import * as React from "react"
import { format } from "date-fns"
import { UNTITLED_EVENT } from "@/lib/calendar"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { CategoryDot } from "./category-picker"
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
  children,
}: {
  event: GridEvent
  conflicts: Array<GridEvent>
  /** suppress while any marker is being dragged */
  disabled: boolean
  children: React.ReactElement
}) {
  const [open, setOpen] = React.useState(false)

  // A drag that starts mid-hover closes the card and keeps it closed.
  React.useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

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
            <p className="text-xs text-muted-foreground tabular-nums">
              {format(new Date(event.time), "EEEE, MMM d · h:mm a")}
            </p>
          </div>

          {event.categoryName && (
            <div className="flex items-center gap-1.5">
              <CategoryDot color={event.color} className="size-2" />
              <span className="text-xs text-muted-foreground">
                {event.categoryName}
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
              {conflicts.map((conflict) => (
                <div
                  key={conflict._id}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <CategoryDot color={conflict.color} className="size-2" />
                  <span className="truncate">
                    {conflict.title || UNTITLED_EVENT}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

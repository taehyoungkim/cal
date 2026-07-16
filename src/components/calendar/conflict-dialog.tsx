import * as React from "react"
import { format } from "date-fns"
import {
  Building2,
  CalendarRange,
  ChevronDown,
  TriangleAlert,
} from "lucide-react"
import {
  DEFAULT_EVENT_COLOR,
  UNTITLED_EVENT,
  categoryEmoji,
  departmentName,
  formatDaySpan,
} from "@/lib/calendar"
import type {
  AllDayEvent,
  CalendarDoc,
  CalendarEvent,
  Category,
  Department,
} from "@/lib/calendar"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ColorDot } from "./label-picker"

type Lookups = {
  calendars: Array<CalendarDoc>
  categories: Array<Category>
  departments: Array<Department>
}

/**
 * One quiet row: calendar dot, title, and the calendar it lives on.
 * Rows holding more (category, department, details) expand on click.
 */
function EventRow({
  event,
  meta,
  lookups,
}: {
  event: CalendarEvent
  /** right-aligned label — the calendar name, and a span for multi-day */
  meta?: string
  lookups: Lookups
}) {
  const [open, setOpen] = React.useState(false)

  const calendar = event.calendarId
    ? lookups.calendars.find((c) => c._id === event.calendarId)
    : undefined
  const category = event.categoryId
    ? lookups.categories.find((c) => c._id === event.categoryId)
    : undefined
  const department = departmentName(event, lookups.departments)
  const hasMore = Boolean(category || department || event.details)

  const row = (
    <>
      <ColorDot
        color={calendar?.color ?? DEFAULT_EVENT_COLOR}
        className="size-2"
      />
      <span className="min-w-0 flex-1 truncate text-sm">
        {event.title || UNTITLED_EVENT}
      </span>
      {meta && (
        <span className="shrink-0 text-xs text-muted-foreground">{meta}</span>
      )}
    </>
  )

  if (!hasMore) {
    return <li className="flex items-center gap-2.5 px-3 py-2">{row}</li>
  }

  return (
    <li>
      <Collapsible
        open={open}
        onOpenChange={setOpen}
        className={cn("transition-colors duration-200", open && "bg-muted/40")}
      >
        <CollapsibleTrigger className="group flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted/40">
          {row}
          <ChevronDown className="size-3 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-data-[panel-open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
          <div className="flex flex-col gap-1.5 px-3 pt-0.5 pb-2.5 pl-[30px] text-xs text-muted-foreground">
            {category && (
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="w-3 text-center leading-none">
                  {categoryEmoji(category)}
                </span>
                {category.name}
              </span>
            )}
            {department && (
              <span className="flex items-center gap-1.5">
                <Building2 className="size-3 shrink-0" />
                {department}
              </span>
            )}
            {event.details && (
              <p className="line-clamp-3 leading-relaxed text-pretty">
                {event.details}
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </li>
  )
}

function Panel({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="animate-in overflow-hidden rounded-xl border border-border/60 duration-300 fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        {icon}
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      <ul className="max-h-56 divide-y divide-border/60 overflow-y-auto">
        {children}
      </ul>
    </div>
  )
}

/** Timed events occupying the exact same minute. */
export function ConflictList({
  time,
  conflicts,
  ...lookups
}: {
  time: number
  conflicts: Array<CalendarEvent>
} & Lookups) {
  return (
    <Panel
      icon={
        <TriangleAlert className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
      }
      label={`Already booked at ${format(time, "h:mm a")}`}
    >
      {conflicts.map((event) => (
        <EventRow
          key={event._id}
          event={event}
          meta={lookups.calendars.find((c) => c._id === event.calendarId)?.name}
          lookups={lookups}
        />
      ))}
    </Panel>
  )
}

/** All-day events covering the chosen day(s) — context, not a clash. */
export function AllDayList({
  events,
  ...lookups
}: {
  events: Array<AllDayEvent>
} & Lookups) {
  return (
    <Panel
      icon={
        <CalendarRange className="size-3.5 shrink-0 text-muted-foreground" />
      }
      label="All day"
    >
      {events.map((event) => {
        const name = lookups.calendars.find(
          (c) => c._id === event.calendarId
        )?.name
        const span =
          event.startDate !== event.endDate ? formatDaySpan(event) : undefined
        return (
          <EventRow
            key={event._id}
            event={event}
            meta={[span, name].filter(Boolean).join(" · ") || undefined}
            lookups={lookups}
          />
        )
      })}
    </Panel>
  )
}

/** Asks the user to confirm moving an event onto an occupied time slot. */
export function ConflictDialog({
  time,
  conflicts,
  onCancel,
  onContinue,
  ...lookups
}: {
  time: number
  conflicts: Array<CalendarEvent>
  onCancel: () => void
  onContinue: () => void
} & Lookups) {
  return (
    <AlertDialog open onOpenChange={(value) => !value && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Move to {format(time, "h:mm a")}?</AlertDialogTitle>
          <AlertDialogDescription>
            That time already has{" "}
            {conflicts.length === 1 ? "an event" : `${conflicts.length} events`}
            .
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ConflictList time={time} conflicts={conflicts} {...lookups} />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onContinue}>
            Move anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

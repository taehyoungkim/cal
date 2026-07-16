import { format } from "date-fns"
import { CalendarRange, TriangleAlert } from "lucide-react"
import {
  UNTITLED_EVENT,
  byId,
  categoryEmoji,
  eventColor,
  formatDaySpan,
} from "@/lib/calendar"
import type {
  AllDayEvent,
  CalendarDoc,
  CalendarEvent,
  Category,
  Department,
} from "@/lib/calendar"
import type { Id } from "../../../convex/_generated/dataModel"
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
import { ColorDot } from "./label-picker"

/** The events occupying a time slot, rendered as proper event rows.
 * Conflicts from a different calendar than `calendarId` get called out. */
export function ConflictList({
  time,
  conflicts,
  calendars,
  categories,
  departments,
  calendarId,
}: {
  time: number
  conflicts: Array<CalendarEvent>
  calendars: Array<CalendarDoc>
  categories: Array<Category>
  departments: Array<Department>
  calendarId: Id<"calendars"> | null
}) {
  const calendarsById = byId(calendars)
  const categoriesById = byId(categories)
  const departmentsById = byId(departments)
  return (
    <div className="animate-in overflow-hidden rounded-2xl border border-amber-500/30 duration-300 fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-3 py-2">
        <TriangleAlert className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
          Already booked at {format(time, "h:mm a")}
        </span>
      </div>
      <ul className="max-h-44 divide-y divide-border/60 overflow-y-auto">
        {conflicts.map((event) => {
          const calendar = event.calendarId
            ? calendarsById.get(event.calendarId)
            : undefined
          const category = event.categoryId
            ? categoriesById.get(event.categoryId)
            : undefined
          const department = event.departmentId
            ? departmentsById.get(event.departmentId)?.name
            : event.department
          const crossCalendar = event.calendarId !== (calendarId ?? undefined)
          const context = [
            calendar?.name,
            category && `${categoryEmoji(category)} ${category.name}`,
            department,
          ]
            .filter(Boolean)
            .join(" · ")
          return (
            <li key={event._id} className="flex items-start gap-2.5 px-3 py-2">
              <ColorDot
                color={eventColor(event, calendarsById)}
                className="mt-[5px]"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {event.title || UNTITLED_EVENT}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {format(event.time!, "h:mm a")}
                  </span>
                </div>
                {context && (
                  <span className="truncate text-xs text-muted-foreground">
                    {context}
                  </span>
                )}
                {crossCalendar && (
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    On a different calendar
                  </span>
                )}
                {event.details && (
                  <span className="line-clamp-2 text-xs text-pretty text-muted-foreground">
                    {event.details}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * All-day events covering the chosen day(s) — quieter context than the
 * amber time-clash list, since they don't occupy a specific minute.
 */
export function AllDayList({
  events,
  calendars,
  categories,
  calendarId,
}: {
  events: Array<AllDayEvent>
  calendars: Array<CalendarDoc>
  categories: Array<Category>
  calendarId: Id<"calendars"> | null
}) {
  const calendarsById = byId(calendars)
  const categoriesById = byId(categories)
  return (
    <div className="animate-in overflow-hidden rounded-2xl border border-border/60 duration-300 fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/50 px-3 py-2">
        <CalendarRange className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          All day, same{" "}
          {events.some((e) => e.startDate !== e.endDate) ? "days" : "day"}
        </span>
      </div>
      <ul className="max-h-32 divide-y divide-border/60 overflow-y-auto">
        {events.map((event) => {
          const calendar = event.calendarId
            ? calendarsById.get(event.calendarId)
            : undefined
          const category = event.categoryId
            ? categoriesById.get(event.categoryId)
            : undefined
          const crossCalendar = event.calendarId !== (calendarId ?? undefined)
          return (
            <li
              key={event._id}
              className="flex items-center gap-2.5 px-3 py-1.5"
            >
              <ColorDot color={eventColor(event, calendarsById)} />
              {category && (
                <span aria-hidden className="shrink-0 text-xs leading-none">
                  {categoryEmoji(category)}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm">
                {event.title || UNTITLED_EVENT}
              </span>
              {crossCalendar && calendar && (
                <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-px text-[10px] font-medium text-amber-700 dark:text-amber-300">
                  {calendar.name}
                </span>
              )}
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {formatDaySpan(event)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Asks the user to confirm moving an event onto an occupied time slot. */
export function ConflictDialog({
  time,
  conflicts,
  calendars,
  categories,
  departments,
  calendarId,
  onCancel,
  onContinue,
}: {
  time: number
  conflicts: Array<CalendarEvent>
  calendars: Array<CalendarDoc>
  categories: Array<Category>
  departments: Array<Department>
  calendarId: Id<"calendars"> | null
  onCancel: () => void
  onContinue: () => void
}) {
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
        <ConflictList
          time={time}
          conflicts={conflicts}
          calendars={calendars}
          categories={categories}
          departments={departments}
          calendarId={calendarId}
        />
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

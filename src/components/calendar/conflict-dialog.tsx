import { format } from "date-fns"
import { TriangleAlert } from "lucide-react"
import { UNTITLED_EVENT, categoryColor } from "@/lib/calendar"
import type { CalendarEvent, Category } from "@/lib/calendar"
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
import { CategoryDot } from "./category-picker"

/** The events occupying a time slot, rendered as proper event rows. */
export function ConflictList({
  time,
  conflicts,
  categories,
}: {
  time: number
  conflicts: Array<CalendarEvent>
  categories: Array<Category>
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-amber-500/30 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-3 py-2">
        <TriangleAlert className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
          Already booked at {format(time, "h:mm a")}
        </span>
      </div>
      <ul className="max-h-44 divide-y divide-border/60 overflow-y-auto">
        {conflicts.map((event) => {
          const category = categories.find(
            (cat) => cat._id === event.categoryId
          )
          return (
            <li key={event._id} className="flex items-start gap-2.5 px-3 py-2">
              <CategoryDot color={categoryColor(category)} className="mt-[5px]" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {event.title || UNTITLED_EVENT}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {format(event.time, "h:mm a")}
                  </span>
                </div>
                {category && (
                  <span className="truncate text-xs text-muted-foreground">
                    {category.name}
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

/** Asks the user to confirm moving an event onto an occupied time slot. */
export function ConflictDialog({
  time,
  conflicts,
  categories,
  onCancel,
  onContinue,
}: {
  time: number
  conflicts: Array<CalendarEvent>
  categories: Array<Category>
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
          categories={categories}
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

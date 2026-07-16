import * as React from "react"
import { useMutation, useQuery } from "convex/react"
import { format, startOfDay } from "date-fns"
import { CalendarIcon, Trash2 } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import {
  UNTITLED_EVENT,
  conflictsAt,
  dateAtMinutes,
  dayEndMs,
  dayKey,
  isAllDay,
  minutesIntoDay,
  parseDayKey,
} from "@/lib/calendar"
import type {
  CalendarDoc,
  CalendarEvent,
  Category,
  Department,
} from "@/lib/calendar"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { CalendarPicker } from "./calendar-picker"
import { CategoryPicker } from "./category-picker"
import { AllDayList, ConflictList } from "./conflict-dialog"
import { DepartmentPicker } from "./department-picker"
import { TimePicker } from "./time-picker"
import type { DateRange } from "react-day-picker"

export type EventDialogState =
  | { mode: "create"; time: Date; allDay?: boolean }
  | { mode: "edit"; event: CalendarEvent }

export function EventDialog({
  state,
  calendars,
  categories,
  departments,
  defaultCalendarId = null,
  onClose,
}: {
  state: EventDialogState | null
  calendars: Array<CalendarDoc>
  categories: Array<Category>
  departments: Array<Department>
  /** preselected calendar for new events (a focused calendar page) */
  defaultCalendarId?: Id<"calendars"> | null
  onClose: () => void
}) {
  // The body owns the Dialog so its close handler can consult the form's
  // dirty state directly; it remounts fresh for every open.
  if (!state) return null
  return (
    <EventDialogBody
      state={state}
      calendars={calendars}
      categories={categories}
      departments={departments}
      defaultCalendarId={defaultCalendarId}
      onClose={onClose}
    />
  )
}

function EventDialogBody({
  state,
  calendars,
  categories,
  departments,
  defaultCalendarId,
  onClose,
}: {
  state: EventDialogState
  calendars: Array<CalendarDoc>
  categories: Array<Category>
  departments: Array<Department>
  defaultCalendarId: Id<"calendars"> | null
  onClose: () => void
}) {
  const createEvent = useMutation(api.events.create)
  const updateEvent = useMutation(api.events.update)
  const removeEvent = useMutation(api.events.remove)

  const initial = React.useMemo(() => {
    if (state.mode === "create") {
      const day = startOfDay(state.time)
      return {
        title: "",
        details: "",
        departmentId: null,
        allDay: state.allDay ?? false,
        day,
        timeMin: minutesIntoDay(state.time),
        range: { from: day, to: day },
        calendarId: defaultCalendarId,
        categoryId: null,
      }
    }
    const event = state.event
    const allDay = isAllDay(event)
    const day = allDay
      ? parseDayKey(event.startDate)
      : startOfDay(new Date(event.time!))
    return {
      title: event.title,
      details: event.details ?? "",
      departmentId: event.departmentId ?? null,
      allDay,
      day,
      timeMin: allDay ? 9 * 60 : minutesIntoDay(new Date(event.time!)),
      range: allDay
        ? { from: day, to: parseDayKey(event.endDate) }
        : { from: day, to: day },
      calendarId: event.calendarId ?? null,
      categoryId: event.categoryId ?? null,
    }
  }, [state, defaultCalendarId])

  const [title, setTitle] = React.useState(initial.title)
  const [details, setDetails] = React.useState(initial.details)
  const [departmentId, setDepartmentId] =
    React.useState<Id<"departments"> | null>(initial.departmentId)
  const [allDay, setAllDay] = React.useState(initial.allDay)
  const [day, setDay] = React.useState(initial.day)
  const [timeMin, setTimeMin] = React.useState(initial.timeMin)
  const [range, setRange] = React.useState<DateRange>(initial.range)
  const [calendarId, setCalendarId] = React.useState<Id<"calendars"> | null>(
    initial.calendarId
  )
  const [categoryId, setCategoryId] = React.useState<Id<"categories"> | null>(
    initial.categoryId
  )
  const [dateOpen, setDateOpen] = React.useState(false)
  const [rangeOpen, setRangeOpen] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [confirmDiscard, setConfirmDiscard] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  // An armed delete button quietly disarms if left alone.
  React.useEffect(() => {
    if (!confirmDelete) return
    const timer = setTimeout(() => setConfirmDelete(false), 3000)
    return () => clearTimeout(timer)
  }, [confirmDelete])

  // Same rhythm for discarding unsaved changes.
  React.useEffect(() => {
    if (!confirmDiscard) return
    const timer = setTimeout(() => setConfirmDiscard(false), 3000)
    return () => clearTimeout(timer)
  }, [confirmDiscard])

  const time = dateAtMinutes(day, timeMin).getTime()

  const rangeFrom = range.from ?? day
  const rangeTo = range.to ?? rangeFrom

  // The chosen day(s): timed events look at `day`, all-day at the range.
  const spanStart = allDay ? startOfDay(rangeFrom) : day
  const spanEnd = allDay ? startOfDay(rangeTo) : day
  const sameDay = useQuery(api.events.list, {
    rangeStart: spanStart.getTime(),
    rangeEnd: dayEndMs(spanEnd),
    rangeStartDate: dayKey(spanStart),
    rangeEndDate: dayKey(spanEnd),
  })

  const editingId = state.mode === "edit" ? state.event._id : undefined
  const conflicts = allDay ? [] : conflictsAt(sameDay ?? [], time, editingId)
  const allDayNeighbors = (sameDay ?? [])
    .filter(isAllDay)
    .filter((e) => e._id !== editingId)
  // Context docks in a side column so the dialog never grows downward.
  const hasContext = conflicts.length > 0 || allDayNeighbors.length > 0

  const rangeLabel =
    dayKey(rangeFrom) === dayKey(rangeTo)
      ? format(rangeFrom, "EEE, MMM d, yyyy")
      : `${format(rangeFrom, "MMM d")} – ${format(rangeTo, "MMM d, yyyy")}`

  const isDirty =
    title !== initial.title ||
    details !== initial.details ||
    departmentId !== initial.departmentId ||
    calendarId !== initial.calendarId ||
    categoryId !== initial.categoryId ||
    allDay !== initial.allDay ||
    (allDay
      ? dayKey(rangeFrom) !== dayKey(initial.range.from) ||
        dayKey(rangeTo) !== dayKey(initial.range.to)
      : day.getTime() !== initial.day.getTime() || timeMin !== initial.timeMin)

  // Closing with unsaved changes takes two attempts, like delete: the
  // first arms the Cancel button ("Discard changes"), the second — or a
  // click on the armed button — actually discards. No stacked dialogs.
  const requestClose = () => {
    if (!isDirty || confirmDiscard) {
      onClose()
      return
    }
    setConfirmDiscard(true)
  }

  const doSave = async () => {
    const shared = {
      title: title.trim() || UNTITLED_EVENT,
    }
    if (state.mode === "create") {
      await createEvent({
        ...shared,
        ...(allDay
          ? { startDate: dayKey(rangeFrom), endDate: dayKey(rangeTo) }
          : { time }),
        details: details.trim() || undefined,
        departmentId: departmentId ?? undefined,
        calendarId: calendarId ?? undefined,
        categoryId: categoryId ?? undefined,
      })
    } else {
      await updateEvent({
        id: state.event._id,
        ...shared,
        // Setting one shape clears the other's fields.
        ...(allDay
          ? {
              time: null,
              startDate: dayKey(rangeFrom),
              endDate: dayKey(rangeTo),
            }
          : { time, startDate: null, endDate: null }),
        details: details.trim() || null,
        departmentId,
        calendarId,
        categoryId,
      })
    }
    onClose()
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    void doSave()
  }

  const handleDelete = async () => {
    if (state.mode !== "edit") return
    setDeleting(true)
    await removeEvent({ id: state.event._id })
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && requestClose()}>
      <DialogContent
        className={cn(
          "max-h-[90svh] overflow-y-auto transition-[max-width] duration-300 sm:max-w-md",
          hasContext && "md:max-w-3xl"
        )}
      >
        <DialogHeader>
          <DialogTitle>
            {state.mode === "create" ? "New event" : "Edit event"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Set the event title, time, calendar, category, department, and
            details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 md:flex-row md:gap-6">
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <Input
                autoFocus
                placeholder="Add title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-base"
              />

              <div className="flex items-center justify-between gap-2">
                <Label
                  htmlFor="event-all-day"
                  className="font-normal text-muted-foreground"
                >
                  All day
                </Label>
                <Switch
                  id="event-all-day"
                  checked={allDay}
                  onCheckedChange={(checked) => {
                    setAllDay(checked)
                    // Keep the two shapes in sync so toggling is lossless.
                    if (checked) setRange({ from: day, to: day })
                    else setDay(startOfDay(range.from ?? day))
                  }}
                />
              </div>

              {allDay ? (
                <div className="flex flex-col gap-2">
                  <Label className="text-muted-foreground">Dates</Label>
                  <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
                    <PopoverTrigger
                      render={
                        <Button
                          variant="outline"
                          className="w-full justify-start font-normal"
                        />
                      }
                    >
                      <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{rangeLabel}</span>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="start">
                      <Calendar
                        mode="range"
                        selected={range}
                        defaultMonth={rangeFrom}
                        numberOfMonths={1}
                        onSelect={(next) => {
                          if (next?.from) setRange(next)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              ) : (
                <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                  <div className="flex min-w-0 flex-col gap-2">
                    <Label className="text-muted-foreground">Date</Label>
                    <Popover open={dateOpen} onOpenChange={setDateOpen}>
                      <PopoverTrigger
                        render={
                          <Button
                            variant="outline"
                            className="w-full justify-start font-normal"
                          />
                        }
                      >
                        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          {format(day, "EEE, MMM d, yyyy")}
                        </span>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2" align="start">
                        <Calendar
                          mode="single"
                          selected={day}
                          onSelect={(date) => {
                            if (date) setDay(startOfDay(date))
                            setDateOpen(false)
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="event-time"
                      className="text-muted-foreground"
                    >
                      Time
                    </Label>
                    <TimePicker
                      id="event-time"
                      minutes={timeMin}
                      onChange={setTimeMin}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label className="text-muted-foreground">Calendar</Label>
                  <CalendarPicker
                    calendars={calendars}
                    value={calendarId}
                    onChange={setCalendarId}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-muted-foreground">Category</Label>
                  <CategoryPicker
                    categories={categories}
                    value={categoryId}
                    onChange={setCategoryId}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-muted-foreground">Department</Label>
                <DepartmentPicker
                  departments={departments}
                  value={departmentId}
                  onChange={setDepartmentId}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="event-details"
                  className="text-muted-foreground"
                >
                  Details
                </Label>
                <Textarea
                  id="event-details"
                  placeholder="Add notes, links, an agenda…"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="min-h-20 resize-none"
                />
              </div>
            </div>

            {hasContext && (
              <aside className="flex flex-col gap-3 md:w-72 md:shrink-0">
                {conflicts.length > 0 && (
                  <ConflictList
                    time={time}
                    conflicts={conflicts}
                    calendars={calendars}
                    categories={categories}
                    departments={departments}
                  />
                )}
                {allDayNeighbors.length > 0 && (
                  <AllDayList
                    events={allDayNeighbors}
                    calendars={calendars}
                    categories={categories}
                    departments={departments}
                  />
                )}
              </aside>
            )}
          </div>

          <DialogFooter className="mt-2">
            {state.mode === "edit" && (
              <Button
                type="button"
                variant={confirmDelete ? "destructive" : "ghost"}
                disabled={deleting}
                aria-live="polite"
                className={cn(
                  "mr-auto transition-[background-color,color,scale] active:scale-[0.96]",
                  confirmDelete
                    ? "animate-shake"
                    : "text-destructive hover:text-destructive"
                )}
                onClick={() => {
                  if (confirmDelete) void handleDelete()
                  else setConfirmDelete(true)
                }}
                onBlur={() => setConfirmDelete(false)}
              >
                <Trash2 className="size-4" />
                {confirmDelete ? "Confirm delete" : "Delete"}
              </Button>
            )}
            <Button
              type="button"
              variant={confirmDiscard ? "destructive" : "outline"}
              aria-live="polite"
              className={cn(
                "transition-[background-color,color,scale] active:scale-[0.96]",
                confirmDiscard && "animate-shake"
              )}
              onClick={requestClose}
            >
              {confirmDiscard ? "Discard changes" : "Cancel"}
            </Button>
            <Button
              type="submit"
              className="transition-transform active:scale-[0.96]"
            >
              {state.mode === "create" && conflicts.length > 0
                ? "Schedule anyway"
                : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

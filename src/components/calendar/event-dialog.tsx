import * as React from "react"
import { useMutation, useQuery } from "convex/react"
import { format, startOfDay } from "date-fns"
import { CalendarIcon, Trash2 } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import {
  DAY_MINUTES,
  SNAP_MINUTES,
  UNTITLED_EVENT,
  conflictsAt,
  dateAtMinutes,
  dayEndMs,
  formatMinutes,
  minutesIntoDay,
  snapMinutes,
} from "@/lib/calendar"
import type { CalendarEvent, Category } from "@/lib/calendar"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CategoryPicker } from "./category-picker"
import { ConflictList } from "./conflict-dialog"

export type EventDialogState =
  { mode: "create"; time: Date } | { mode: "edit"; event: CalendarEvent }

// Every half hour of the day — times are "magnetic" to :00 and :30.
const TIME_OPTIONS = Array.from(
  { length: DAY_MINUTES / SNAP_MINUTES },
  (_, i) => {
    const minutes = i * SNAP_MINUTES
    return {
      value: String(minutes),
      label: formatMinutes(minutes),
    }
  }
)

export function EventDialog({
  state,
  categories,
  onClose,
}: {
  state: EventDialogState | null
  categories: Array<Category>
  onClose: () => void
}) {
  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      {state && (
        <EventDialogBody
          state={state}
          categories={categories}
          onClose={onClose}
        />
      )}
    </Dialog>
  )
}

function EventDialogBody({
  state,
  categories,
  onClose,
}: {
  state: EventDialogState
  categories: Array<Category>
  onClose: () => void
}) {
  const createEvent = useMutation(api.events.create)
  const updateEvent = useMutation(api.events.update)
  const removeEvent = useMutation(api.events.remove)

  const initial =
    state.mode === "create"
      ? {
          title: "",
          details: "",
          time: state.time,
          categoryId: null,
        }
      : {
          title: state.event.title,
          details: state.event.details ?? "",
          time: new Date(state.event.time),
          categoryId: state.event.categoryId ?? null,
        }

  const [title, setTitle] = React.useState(initial.title)
  const [details, setDetails] = React.useState(initial.details)
  const [day, setDay] = React.useState(() => startOfDay(initial.time))
  const [timeMin, setTimeMin] = React.useState(() =>
    snapMinutes(minutesIntoDay(initial.time))
  )
  const [categoryId, setCategoryId] = React.useState<Id<"categories"> | null>(
    initial.categoryId
  )
  const [dateOpen, setDateOpen] = React.useState(false)

  const time = dateAtMinutes(day, timeMin).getTime()

  const sameDay = useQuery(api.events.list, {
    rangeStart: day.getTime(),
    rangeEnd: dayEndMs(day),
  })
  const conflicts = conflictsAt(
    sameDay ?? [],
    time,
    state.mode === "edit" ? state.event._id : undefined
  )

  const doSave = async () => {
    const payload = { title: title.trim() || UNTITLED_EVENT, time }
    if (state.mode === "create") {
      await createEvent({
        ...payload,
        details: details.trim() || undefined,
        categoryId: categoryId ?? undefined,
      })
    } else {
      await updateEvent({
        id: state.event._id,
        ...payload,
        details: details.trim() || null,
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
    await removeEvent({ id: state.event._id })
    onClose()
  }

  return (
    <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {state.mode === "create" ? "New event" : "Edit event"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Set the event title, time, category, and details.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <Input
          autoFocus
          placeholder="Add title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-base"
        />

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
            <Label className="text-muted-foreground">Time</Label>
            <Select
              items={TIME_OPTIONS}
              value={String(timeMin)}
              onValueChange={(value) => {
                if (value !== null) setTimeMin(Number(value))
              }}
            >
              <SelectTrigger className="tabular-nums">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {TIME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {conflicts.length > 0 && (
          <ConflictList
            time={time}
            conflicts={conflicts}
            categories={categories}
          />
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="event-details" className="text-muted-foreground">
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

        <div className="flex flex-col gap-2">
          <Label className="text-muted-foreground">Category</Label>
          <CategoryPicker
            categories={categories}
            value={categoryId}
            onChange={setCategoryId}
          />
        </div>

        <DialogFooter className="mt-2">
          {state.mode === "edit" && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              className="mr-auto text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="transition-transform active:scale-[0.96]"
          >
            {conflicts.length > 0 ? "Schedule anyway" : "Save"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

import * as React from "react"
import { useMutation, useQuery } from "convex/react"
import { addDays, format, isSameMonth, startOfDay } from "date-fns"
import { CalendarDays, ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import {
  DEFAULT_EVENT_COLOR,
  VIEW_DAY_COUNT,
  visibleDays,
} from "@/lib/calendar"
import type { CalendarEvent, CalendarView } from "@/lib/calendar"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Toaster } from "@/components/ui/sonner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CategoryDot } from "./category-picker"
import { ConflictDialog } from "./conflict-dialog"
import { EventDialog } from "./event-dialog"
import type { EventDialogState } from "./event-dialog"
import { TimeGrid } from "./time-grid"
import type { GridEvent } from "./time-grid"

const VIEWS: Array<{ value: CalendarView; label: string }> = [
  { value: "day", label: "Day" },
  { value: "3day", label: "3 Day" },
  { value: "week", label: "Week" },
]

export function CalendarApp() {
  const [anchor, setAnchor] = React.useState(() => startOfDay(new Date()))
  // Rendered client-side only (behind the code gate), so window is available.
  const [view, setView] = React.useState<CalendarView>(() =>
    window.innerWidth < 640 ? "day" : "week"
  )
  const [miniMonth, setMiniMonth] = React.useState<Date>(anchor)
  const [hidden, setHidden] = React.useState<Set<string>>(new Set())
  const [dialog, setDialog] = React.useState<EventDialogState | null>(null)
  const [moveConfirm, setMoveConfirm] = React.useState<{
    event: GridEvent
    time: Date
    conflicts: Array<CalendarEvent>
  } | null>(null)

  const days = React.useMemo(() => visibleDays(anchor, view), [anchor, view])
  const rangeStart = days[0].getTime()
  const rangeEnd = addDays(days[days.length - 1], 1).getTime()

  const events = useQuery(api.events.list, { rangeStart, rangeEnd })
  const categories = useQuery(api.categories.list) ?? []
  const removeCategory = useMutation(api.categories.remove)
  const updateEvent = useMutation(api.events.update)

  const gridEvents: Array<GridEvent> = React.useMemo(() => {
    const colorById = new Map(categories.map((c) => [c._id, c.color]))
    return (events ?? [])
      .filter((e) => !e.categoryId || !hidden.has(e.categoryId))
      .map((e) => ({
        ...e,
        color:
          (e.categoryId ? colorById.get(e.categoryId) : undefined) ??
          DEFAULT_EVENT_COLOR,
      }))
  }, [events, categories, hidden])

  const navigate = (date: Date) => {
    const day = startOfDay(date)
    setAnchor(day)
    setMiniMonth(day)
  }

  const step = VIEW_DAY_COUNT[view]
  const first = days[0]
  const last = days[days.length - 1]
  const title = isSameMonth(first, last)
    ? format(first, "MMMM yyyy")
    : `${format(first, "MMM")} – ${format(last, "MMM yyyy")}`

  const toggleCategory = (id: string) => {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const pendingTime = dialog?.mode === "create" ? dialog.time.getTime() : null

  const handleEventMove = (event: GridEvent, time: Date) => {
    const t = time.getTime()
    const clash = (events ?? []).filter(
      (e) => e.time === t && e._id !== event._id
    )
    if (clash.length > 0) {
      setMoveConfirm({ event, time, conflicts: clash })
    } else {
      void updateEvent({ id: event._id, time: t })
    }
  }

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background text-foreground">
      {/* Top bar */}
      <header className="flex shrink-0 items-center gap-1.5 border-b px-2 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
        <div className="flex items-center gap-2 max-md:hidden">
          <CalendarDays className="size-5 text-primary" />
          <span className="text-lg font-medium">Calendar</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(new Date())}
        >
          Today
        </Button>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous"
            onClick={() => navigate(addDays(anchor, -step))}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next"
            onClick={() => navigate(addDays(anchor, step))}
          >
            <ChevronRight />
          </Button>
        </div>
        <h1 className="min-w-0 truncate text-base sm:text-lg">{title}</h1>
        <div className="ml-auto shrink-0">
          <ToggleGroup
            value={[view]}
            onValueChange={(value: Array<unknown>) => {
              const next = value[0] as CalendarView | undefined
              if (next) setView(next)
            }}
          >
            {VIEWS.map((v) => (
              <ToggleGroupItem
                key={v.value}
                value={v.value}
                className="px-2 text-xs sm:px-3 sm:text-sm"
              >
                {v.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col gap-3 overflow-y-auto border-r p-3 md:flex">
          <Calendar
            mode="single"
            selected={anchor}
            onSelect={(date) => date && navigate(date)}
            month={miniMonth}
            onMonthChange={setMiniMonth}
            className="mx-auto p-0 [--cell-size:--spacing(8)]"
          />
          <Separator />
          <div className="flex flex-col gap-1">
            <span className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Categories
            </span>
            {categories.length === 0 && (
              <p className="px-1 py-2 text-sm text-pretty text-muted-foreground">
                No categories yet. Create one while adding an event.
              </p>
            )}
            {categories.map((category) => (
              <div
                key={category._id}
                className="group flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted"
              >
                <Label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1 font-normal">
                  <Checkbox
                    checked={!hidden.has(category._id)}
                    onCheckedChange={() => toggleCategory(category._id)}
                  />
                  <CategoryDot color={category.color} />
                  <span className="truncate">{category.name}</span>
                </Label>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete category ${category.name}`}
                  className="size-6 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
                  onClick={async () => {
                    const deleted = await removeCategory({ id: category._id })
                    if (!deleted) {
                      toast.warning(
                        `“${category.name}” still has events. Reassign or delete them first.`
                      )
                    }
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        </aside>

        {/* Main grid */}
        <main className="flex min-w-0 flex-1 flex-col">
          <TimeGrid
            days={days}
            events={gridEvents}
            pendingTime={pendingTime}
            onSlotClick={(time) => setDialog({ mode: "create", time })}
            onEventClick={(event) => setDialog({ mode: "edit", event })}
            onEventMove={handleEventMove}
            onDayClick={(day) => {
              navigate(day)
              setView("day")
            }}
          />
        </main>
      </div>

      <EventDialog
        state={dialog}
        categories={categories}
        onClose={() => setDialog(null)}
      />
      {moveConfirm && (
        <ConflictDialog
          open
          time={moveConfirm.time.getTime()}
          conflicts={moveConfirm.conflicts}
          categories={categories}
          onCancel={() => setMoveConfirm(null)}
          onContinue={() => {
            void updateEvent({
              id: moveConfirm.event._id,
              time: moveConfirm.time.getTime(),
            })
            setMoveConfirm(null)
          }}
        />
      )}
      <Toaster position="bottom-left" />
    </div>
  )
}

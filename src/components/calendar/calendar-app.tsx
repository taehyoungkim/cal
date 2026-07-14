import * as React from "react"
import { useMutation, useQuery } from "convex/react"
import { addDays, format, isSameMonth, startOfDay } from "date-fns"
import { CalendarDays, ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import {
  VIEW_DAY_COUNT,
  categoriesById,
  categoryColor,
  conflictsAt,
  dayEndMs,
  visibleDays,
} from "@/lib/calendar"
import type { CalendarEvent, CalendarView } from "@/lib/calendar"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Toaster } from "@/components/ui/sonner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CategoryDot } from "./category-picker"
import { ConflictDialog } from "./conflict-dialog"
import { EventDialog } from "./event-dialog"
import { EventSearch } from "./event-search"
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
  const [isNarrow, setIsNarrow] = React.useState(() => window.innerWidth < 640)
  const [view, setView] = React.useState<CalendarView>(
    isNarrow ? "day" : "week"
  )
  const [miniMonth, setMiniMonth] = React.useState<Date>(anchor)
  const [hidden, setHidden] = React.useState<Set<string>>(new Set())
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [dialog, setDialog] = React.useState<EventDialogState | null>(null)
  const [moveConfirm, setMoveConfirm] = React.useState<{
    event: GridEvent
    time: number
    conflicts: Array<CalendarEvent>
  } | null>(null)
  const [highlightId, setHighlightId] = React.useState<
    CalendarEvent["_id"] | null
  >(null)

  // The highlight ring on a searched-for event fades out on its own.
  React.useEffect(() => {
    if (!highlightId) return
    const timer = setTimeout(() => setHighlightId(null), 2500)
    return () => clearTimeout(timer)
  }, [highlightId])

  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)")
    const onChange = () => setIsNarrow(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  // Week view doesn't fit a phone; fall back when the screen narrows.
  React.useEffect(() => {
    if (isNarrow && view === "week") setView("3day")
  }, [isNarrow, view])

  const days = React.useMemo(() => visibleDays(anchor, view), [anchor, view])
  const rangeStart = days[0].getTime()
  const rangeEnd = dayEndMs(days[days.length - 1])

  const events = useQuery(api.events.list, { rangeStart, rangeEnd })
  const categories = useQuery(api.categories.list) ?? []
  const removeCategory = useMutation(api.categories.remove)
  const updateEvent = useMutation(api.events.update)

  const gridEvents: Array<GridEvent> = React.useMemo(() => {
    const byId = categoriesById(categories)
    return (events ?? [])
      .filter((e) => !e.categoryId || !hidden.has(e.categoryId))
      .map((e) => {
        const category = e.categoryId ? byId.get(e.categoryId) : undefined
        return {
          ...e,
          color: categoryColor(category),
          categoryName: category?.name,
        }
      })
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

  const views = isNarrow ? VIEWS.filter((v) => v.value !== "week") : VIEWS

  const pendingTime = dialog?.mode === "create" ? dialog.time.getTime() : null

  // Jump the calendar to a searched-for event and pulse it.
  const revealEvent = (event: CalendarEvent) => {
    navigate(new Date(event.time))
    if (event.categoryId && hidden.has(event.categoryId)) {
      toggleCategory(event.categoryId)
    }
    setHighlightId(event._id)
  }

  const handleEventMove = (event: GridEvent, time: Date) => {
    const t = time.getTime()
    const clash = conflictsAt(events ?? [], t, event._id)
    if (clash.length > 0) {
      setMoveConfirm({ event, time: t, conflicts: clash })
    } else {
      void updateEvent({ id: event._id, time: t })
    }
  }

  // Shared by the desktop sidebar and the mobile sheet.
  const sidebar = (
    <>
      <Calendar
        mode="single"
        selected={anchor}
        onSelect={(date) => {
          if (date) {
            navigate(date)
            setSheetOpen(false)
          }
        }}
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
            className="group flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors duration-150 hover:bg-muted"
          >
            <Label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1 font-normal">
              <Checkbox
                checked={!hidden.has(category._id)}
                onCheckedChange={() => toggleCategory(category._id)}
              />
              <CategoryDot
                color={category.color}
                className="transition-transform duration-200 group-hover:scale-125"
              />
              <span className="truncate">{category.name}</span>
            </Label>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete category ${category.name}`}
              className="size-6 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100 max-md:opacity-100"
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
    </>
  )

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background text-foreground">
      {/* Top bar */}
      <header className="flex shrink-0 items-center gap-1.5 border-b px-2 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
        <div className="flex items-center gap-2 max-md:hidden">
          <CalendarDays className="size-5 text-primary" />
          <span className="text-lg font-medium">Calendar</span>
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Open calendar menu"
                className="active:scale-[0.96] md:hidden"
              />
            }
          >
            <CalendarDays className="size-5 text-primary" />
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-80 gap-3 overflow-y-auto p-4 pt-12"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Calendar</SheetTitle>
            </SheetHeader>
            {sidebar}
          </SheetContent>
        </Sheet>
        <Button
          variant="outline"
          size="sm"
          className="active:scale-[0.96]"
          onClick={() => navigate(new Date())}
        >
          Today
        </Button>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous"
            className="active:scale-[0.96]"
            onClick={() => navigate(addDays(anchor, -step))}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next"
            className="active:scale-[0.96]"
            onClick={() => navigate(addDays(anchor, step))}
          >
            <ChevronRight />
          </Button>
        </div>
        <h1 className="min-w-0 truncate text-base sm:text-lg">{title}</h1>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <EventSearch categories={categories} onPick={revealEvent} />
          <ToggleGroup
            value={[view]}
            onValueChange={(value: Array<unknown>) => {
              const next = value[0] as CalendarView | undefined
              if (next) setView(next)
            }}
          >
            {views.map((v) => (
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
          {sidebar}
        </aside>

        {/* Main grid */}
        <main className="flex min-w-0 flex-1 flex-col">
          <TimeGrid
            days={days}
            events={gridEvents}
            pendingTime={pendingTime}
            highlightId={highlightId}
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
          time={moveConfirm.time}
          conflicts={moveConfirm.conflicts}
          categories={categories}
          onCancel={() => setMoveConfirm(null)}
          onContinue={() => {
            void updateEvent({
              id: moveConfirm.event._id,
              time: moveConfirm.time,
            })
            setMoveConfirm(null)
          }}
        />
      )}
      <Toaster position="bottom-left" />
    </div>
  )
}

import * as React from "react"
import { useMutation, useQuery } from "convex/react"
import { Link } from "@tanstack/react-router"
import { addDays, addMonths, format, isSameMonth, startOfDay } from "date-fns"
import {
  Building2,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Tag,
} from "lucide-react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import {
  VIEW_DAY_COUNT,
  byId,
  categoryEmoji,
  conflictsAt,
  dayEndMs,
  dayKey,
  eventColor,
  isAllDay,
  nextColor,
  parseDayKey,
  visibleDays,
} from "@/lib/calendar"
import type { CalendarEvent, CalendarView } from "@/lib/calendar"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
import { ConflictDialog } from "./conflict-dialog"
import { EventDialog } from "./event-dialog"
import { EventSearch } from "./event-search"
import type { EventDialogState } from "./event-dialog"
import { MonthGrid, monthGridRange } from "./month-grid"
import { LabelList } from "./sidebar-section"
import { TimeGrid } from "./time-grid"
import type { GridEvent } from "./time-grid"

const VIEWS: Array<{ value: CalendarView; label: string }> = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
]

export function CalendarApp() {
  const [anchor, setAnchor] = React.useState(() => startOfDay(new Date()))
  // Rendered client-side only (behind the code gate), so window is available.
  const [isNarrow, setIsNarrow] = React.useState(() => window.innerWidth < 640)
  const [view, setView] = React.useState<CalendarView>(
    isNarrow ? "day" : "week"
  )
  const [miniMonth, setMiniMonth] = React.useState<Date>(anchor)
  const [hiddenCalendars, setHiddenCalendars] = React.useState<Set<string>>(
    new Set()
  )
  const [hiddenCategories, setHiddenCategories] = React.useState<Set<string>>(
    new Set()
  )
  const [hiddenDepartments, setHiddenDepartments] = React.useState<Set<string>>(
    new Set()
  )
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
    if (isNarrow && view === "week") setView("day")
  }, [isNarrow, view])

  // The visible span: grid days for day/week, whole week-rows for month.
  const days = React.useMemo(
    () => (view === "month" ? [] : visibleDays(anchor, view)),
    [anchor, view]
  )
  const { rangeStartDay, rangeEndDay } = React.useMemo(() => {
    if (view === "month") {
      const { start, end } = monthGridRange(anchor)
      return { rangeStartDay: start, rangeEndDay: startOfDay(end) }
    }
    return { rangeStartDay: days[0], rangeEndDay: days[days.length - 1] }
  }, [view, anchor, days])

  const events = useQuery(api.events.list, {
    rangeStart: rangeStartDay.getTime(),
    rangeEnd: dayEndMs(rangeEndDay),
    rangeStartDate: dayKey(rangeStartDay),
    rangeEndDate: dayKey(rangeEndDay),
  })
  const calendars = useQuery(api.calendars.list) ?? []
  const categories = useQuery(api.categories.list) ?? []
  const departments = useQuery(api.departments.list) ?? []
  const createCalendar = useMutation(api.calendars.create)
  const removeCalendar = useMutation(api.calendars.remove)
  const removeCategory = useMutation(api.categories.remove)
  const updateCategory = useMutation(api.categories.update)
  const createDepartment = useMutation(api.departments.create)
  const removeDepartment = useMutation(api.departments.remove)
  const updateEvent = useMutation(api.events.update)

  const gridEvents: Array<GridEvent> = React.useMemo(() => {
    const calendarsById = byId(calendars)
    const categoriesById = byId(categories)
    const departmentsById = byId(departments)
    return (events ?? [])
      .filter(
        (e) =>
          !(e.calendarId && hiddenCalendars.has(e.calendarId)) &&
          !(e.categoryId && hiddenCategories.has(e.categoryId)) &&
          !(e.departmentId && hiddenDepartments.has(e.departmentId))
      )
      .map((e) => {
        const category = e.categoryId
          ? categoriesById.get(e.categoryId)
          : undefined
        return {
          ...e,
          color: eventColor(e, calendarsById),
          calendarName: e.calendarId
            ? calendarsById.get(e.calendarId)?.name
            : undefined,
          categoryName: category?.name,
          categoryEmoji: category ? categoryEmoji(category) : undefined,
          // Falls back to the legacy free-text field on old events.
          departmentName: e.departmentId
            ? departmentsById.get(e.departmentId)?.name
            : e.department,
        }
      })
  }, [
    events,
    calendars,
    categories,
    departments,
    hiddenCalendars,
    hiddenCategories,
    hiddenDepartments,
  ])

  const navigate = (date: Date) => {
    const day = startOfDay(date)
    setAnchor(day)
    setMiniMonth(day)
  }

  const step = (direction: 1 | -1) =>
    navigate(
      view === "month"
        ? addMonths(anchor, direction)
        : addDays(anchor, direction * VIEW_DAY_COUNT[view])
    )

  const title = React.useMemo(() => {
    if (view === "month") return format(anchor, "MMMM yyyy")
    const first = days[0]
    const last = days[days.length - 1]
    return isSameMonth(first, last)
      ? format(first, "MMMM yyyy")
      : `${format(first, "MMM")} – ${format(last, "MMM yyyy")}`
  }, [view, anchor, days])

  const toggleIn =
    (setter: React.Dispatch<React.SetStateAction<Set<string>>>) =>
    (id: string) => {
      setter((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    }
  const toggleCalendar = toggleIn(setHiddenCalendars)
  const toggleCategory = toggleIn(setHiddenCategories)
  const toggleDepartment = toggleIn(setHiddenDepartments)

  const views = isNarrow ? VIEWS.filter((v) => v.value !== "week") : VIEWS

  const pendingTime =
    dialog?.mode === "create" && !dialog.allDay ? dialog.time.getTime() : null

  // Jump the calendar to a searched-for event and pulse it.
  const revealEvent = (event: CalendarEvent) => {
    navigate(
      isAllDay(event) ? parseDayKey(event.startDate) : new Date(event.time!)
    )
    if (event.calendarId && hiddenCalendars.has(event.calendarId)) {
      toggleCalendar(event.calendarId)
    }
    if (event.categoryId && hiddenCategories.has(event.categoryId)) {
      toggleCategory(event.categoryId)
    }
    if (event.departmentId && hiddenDepartments.has(event.departmentId)) {
      toggleDepartment(event.departmentId)
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

  const openDay = (day: Date) => {
    navigate(day)
    setView("day")
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
      <LabelList
        title="Calendars"
        items={calendars}
        hidden={hiddenCalendars}
        icon={CalendarRange}
        emptyHint="No calendars yet. Add one per artist, team, or project."
        onToggle={toggleCalendar}
        onDelete={async (calendar) => {
          const deleted = await removeCalendar({ id: calendar._id })
          if (!deleted) {
            toast.warning(
              `“${calendar.name}” still has events. Reassign or delete them first.`
            )
          }
        }}
        onCreate={async (name) => {
          await createCalendar({ name, color: nextColor(calendars) })
        }}
        createLabel="New calendar"
      />
      <Separator />
      <LabelList
        title="Categories"
        items={categories.map((c) => ({ ...c, emoji: categoryEmoji(c) }))}
        hidden={hiddenCategories}
        icon={Tag}
        emptyHint="No categories yet. Create one while adding an event."
        onToggle={toggleCategory}
        onDelete={async (category) => {
          const deleted = await removeCategory({ id: category._id })
          if (!deleted) {
            toast.warning(
              `“${category.name}” still has events. Reassign or delete them first.`
            )
          }
        }}
        onEmojiChange={(category, emoji) => {
          void updateCategory({ id: category._id, emoji })
        }}
      />
      <Separator />
      <LabelList
        title="Departments"
        items={departments}
        hidden={hiddenDepartments}
        icon={Building2}
        emptyHint="No departments yet. Add the teams in charge."
        onToggle={toggleDepartment}
        onDelete={async (department) => {
          const deleted = await removeDepartment({ id: department._id })
          if (!deleted) {
            toast.warning(
              `“${department.name}” still has events. Reassign or delete them first.`
            )
          }
        }}
        onCreate={async (name) => {
          await createDepartment({ name })
        }}
        createLabel="New department"
      />
      <Separator />
      <Link
        to="/manage"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "justify-start gap-2 font-normal text-muted-foreground hover:text-foreground"
        )}
      >
        <Settings2 className="size-4" />
        Manage
      </Link>
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
            onClick={() => step(-1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next"
            className="active:scale-[0.96]"
            onClick={() => step(1)}
          >
            <ChevronRight />
          </Button>
        </div>
        <h1 className="min-w-0 truncate text-base sm:text-lg">{title}</h1>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <EventSearch calendars={calendars} onPick={revealEvent} />
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
          {view === "month" ? (
            <MonthGrid
              anchor={anchor}
              events={gridEvents}
              highlightId={highlightId}
              onDayClick={openDay}
              onDayCreate={(day) =>
                setDialog({ mode: "create", time: day, allDay: true })
              }
              onEventClick={(event) => setDialog({ mode: "edit", event })}
            />
          ) : (
            <TimeGrid
              days={days}
              events={gridEvents}
              pendingTime={pendingTime}
              highlightId={highlightId}
              onSlotClick={(time) => setDialog({ mode: "create", time })}
              onAllDayClick={(day) =>
                setDialog({ mode: "create", time: day, allDay: true })
              }
              onEventClick={(event) => setDialog({ mode: "edit", event })}
              onEventMove={handleEventMove}
              onDayClick={openDay}
            />
          )}
        </main>
      </div>

      <EventDialog
        state={dialog}
        calendars={calendars}
        categories={categories}
        departments={departments}
        onClose={() => setDialog(null)}
      />
      {moveConfirm && (
        <ConflictDialog
          time={moveConfirm.time}
          conflicts={moveConfirm.conflicts}
          calendars={calendars}
          categories={categories}
          departments={departments}
          calendarId={moveConfirm.event.calendarId ?? null}
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

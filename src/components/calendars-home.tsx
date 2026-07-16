import { useMutation, useQuery } from "convex/react"
import { Link, useNavigate } from "@tanstack/react-router"
import { CalendarDays, LayoutGrid, Plus, Settings2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../convex/_generated/api"
import { calendarKey, formatEventCount, nextColor } from "@/lib/calendar"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useInlineCreate } from "@/hooks/use-inline-create"

const cardClass =
  "flex items-center gap-3 rounded-xl border p-4 transition-[background-color,scale] duration-150 hover:bg-muted/50 active:scale-[0.99]"

/** The landing page: every calendar at a glance, each opening its own view. */
export function CalendarsHome() {
  const calendars = useQuery(api.calendars.list) ?? []
  const counts = useQuery(api.events.counts)
  const createCalendar = useMutation(api.calendars.create)
  const navigate = useNavigate()

  const creator = useInlineCreate(async (name) => {
    const { slug, created } = await createCalendar({
      name,
      color: nextColor(calendars),
    })
    if (!created) {
      // Keep the input (and the typed name) so it can be adjusted.
      toast.warning(`“${name}” already exists.`)
      return false
    }
    void navigate({
      to: "/calendar/$calendarKey",
      params: { calendarKey: slug },
    })
  })

  const eventCount = (id: string) => {
    const n = counts?.calendars[id] ?? 0
    return n === 0 ? "No events" : formatEventCount(n)
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 pt-8 pb-10">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-5 text-primary" />
          <span className="text-lg font-medium">Calendar</span>
        </div>
        <Link
          to="/manage"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "gap-2 font-normal text-muted-foreground hover:text-foreground"
          )}
        >
          <Settings2 className="size-4" />
          Manage
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 pb-16">
        <h1 className="pb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Calendars
        </h1>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link to="/calendar" className={cn(cardClass, "animate-in fade-in")}>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <LayoutGrid className="size-4 text-muted-foreground" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">
                All calendars
              </span>
              <span className="truncate text-xs text-muted-foreground">
                Everything in one view
              </span>
            </span>
          </Link>

          {calendars.map((calendar, i) => (
            <Link
              key={calendar._id}
              to="/calendar/$calendarKey"
              params={{ calendarKey: calendarKey(calendar) }}
              className={cn(
                cardClass,
                "animate-in fill-mode-backwards fade-in"
              )}
              style={{ animationDelay: `${Math.min((i + 1) * 40, 400)}ms` }}
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: `color-mix(in oklab, ${calendar.color} 30%, var(--background))`,
                }}
              >
                <span
                  aria-hidden
                  className="size-3 rounded-full"
                  style={{ backgroundColor: calendar.color }}
                />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">
                  {calendar.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {eventCount(calendar._id)}
                </span>
              </span>
            </Link>
          ))}

          {creator.adding ? (
            <div
              className={cn(cardClass, "border-dashed hover:bg-transparent")}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Plus className="size-4 text-muted-foreground" />
              </span>
              <Input
                placeholder="Calendar name"
                {...creator.inputProps}
                className="h-8 rounded-md bg-muted/60 px-2 text-sm shadow-none focus-visible:border-transparent focus-visible:bg-muted focus-visible:ring-0"
              />
            </div>
          ) : (
            <button
              type="button"
              className={cn(
                cardClass,
                "cursor-pointer border-dashed text-left text-muted-foreground hover:text-foreground"
              )}
              onClick={creator.start}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Plus className="size-4" />
              </span>
              <span className="text-sm font-medium">New calendar</span>
            </button>
          )}
        </div>
      </main>
    </div>
  )
}

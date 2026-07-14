import * as React from "react"
import { useQuery } from "convex/react"
import { format, isThisYear, isToday, isTomorrow, isYesterday } from "date-fns"
import { Search } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import { UNTITLED_EVENT, categoriesById, categoryColor } from "@/lib/calendar"
import type { CalendarEvent, Category } from "@/lib/calendar"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import { Kbd } from "@/components/ui/kbd"
import { CategoryDot } from "./category-picker"

const DEBOUNCE_MS = 150

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return debounced
}

function eventDateLabel(time: number): string {
  const date = new Date(time)
  const day = isToday(date)
    ? "Today"
    : isTomorrow(date)
      ? "Tomorrow"
      : isYesterday(date)
        ? "Yesterday"
        : format(date, isThisYear(date) ? "EEE, MMM d" : "MMM d, yyyy")
  return `${day} · ${format(date, "h:mm a")}`
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Title with the matched search terms emphasized. */
function MatchedTitle({ text, query }: { text: string; query: string }) {
  const terms = query.trim().split(/\s+/).filter(Boolean).map(escapeRegExp)
  if (terms.length === 0) return <>{text}</>
  // Split on a capture group: odd indices are the matched substrings.
  const parts = text.split(new RegExp(`(${terms.join("|")})`, "gi"))
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="font-semibold text-primary">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  )
}

export function EventSearch({
  categories,
  onPick,
}: {
  categories: Array<Category>
  onPick: (event: CalendarEvent) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [openedAt, setOpenedAt] = React.useState(() => Date.now())
  const [query, setQuery] = React.useState("")
  const isMac = React.useMemo(
    () => /Mac|iPhone|iPad/.test(navigator.userAgent),
    []
  )

  const searching = query.trim() !== ""
  const debounced = useDebounced(query.trim(), DEBOUNCE_MS)

  const results = useQuery(
    api.events.search,
    open && debounced !== "" ? { query: debounced } : "skip"
  )
  const upcoming = useQuery(
    api.events.upcoming,
    open ? { after: openedAt } : "skip"
  )

  // Hold on to the last loaded results so the list doesn't flicker to
  // empty while a keystroke's query is in flight.
  const lastResults = React.useRef<Array<CalendarEvent>>([])
  if (results !== undefined) lastResults.current = results
  const items = searching ? (results ?? lastResults.current) : (upcoming ?? [])
  const loaded = searching ? results !== undefined : upcoming !== undefined

  const colorById = React.useMemo(
    () => categoriesById(categories),
    [categories]
  )

  const openDialog = React.useCallback(() => {
    setQuery("")
    setOpenedAt(Date.now())
    lastResults.current = []
    setOpen(true)
  }, [])

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        openDialog()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [openDialog])

  const pick = (event: CalendarEvent) => {
    setOpen(false)
    onPick(event)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden w-40 justify-start gap-2 font-normal text-muted-foreground active:scale-[0.96] md:flex"
        onClick={openDialog}
      >
        <Search className="size-4" />
        Search
        <Kbd className="ml-auto">{isMac ? "⌘K" : "Ctrl K"}</Kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Search events"
        className="active:scale-[0.96] md:hidden"
        onClick={openDialog}
      >
        <Search className="size-5" />
      </Button>

      <CommandDialog
        title="Search events"
        description="Type to search events by title"
        open={open}
        onOpenChange={setOpen}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search events…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loaded && items.length === 0 && (
              <CommandEmpty>
                {searching ? "No events found." : "No upcoming events."}
              </CommandEmpty>
            )}
            {items.length > 0 && (
              <CommandGroup heading={searching ? "Events" : "Upcoming"}>
                {items.map((event) => (
                  <CommandItem
                    key={event._id}
                    value={event._id}
                    onSelect={() => pick(event)}
                  >
                    <CategoryDot
                      color={categoryColor(
                        event.categoryId
                          ? colorById.get(event.categoryId)
                          : undefined
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {event.title ? (
                        <MatchedTitle
                          text={event.title}
                          query={searching ? debounced : ""}
                        />
                      ) : (
                        UNTITLED_EVENT
                      )}
                      {event.details && (
                        <span className="font-normal text-muted-foreground">
                          {" — "}
                          {event.details}
                        </span>
                      )}
                    </span>
                    <CommandShortcut className="shrink-0 pl-3 tracking-normal whitespace-nowrap tabular-nums">
                      {eventDateLabel(event.time)}
                    </CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}

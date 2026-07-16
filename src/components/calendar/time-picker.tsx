import * as React from "react"
import { Clock } from "lucide-react"
import { DAY_MINUTES, formatMinutes } from "@/lib/calendar"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandInput,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

/** The list shown while browsing; typing reaches any minute. */
const BROWSE_STEP = 30
const BROWSE_OPTIONS = Array.from(
  { length: DAY_MINUTES / BROWSE_STEP },
  (_, i) => i * BROWSE_STEP
)

/**
 * Loose wall-clock parsing: "8", "8:31", "831", "1430", "8:31pm", "8p"…
 * Returns the minutes-into-day candidates the text could mean (a bare
 * 12-hour time is offered as both AM and PM).
 */
function parseTime(text: string): Array<number> {
  const compact = text.toLowerCase().replace(/[\s.]/g, "")
  const match = /^(\d{1,2}):?(\d{2})?(a|p)?m?$/.exec(compact)
  if (!match) return []
  const hour = Number(match[1])
  // .at() is honest about optional capture groups being undefined.
  const minute = Number(match.at(2) ?? "0")
  const meridiem = match.at(3)
  if (minute > 59) return []
  if (meridiem) {
    if (hour < 1 || hour > 12) return []
    const h24 = (hour % 12) + (meridiem === "p" ? 12 : 0)
    return [h24 * 60 + minute]
  }
  if (hour > 23) return []
  // 24-hour times are unambiguous; "8:31" could be morning or evening.
  if (hour === 0 || hour > 12) return [hour * 60 + minute]
  return [(hour % 12) * 60 + minute, (hour % 12) * 60 + minute + 12 * 60]
}

/** A shadcn combobox for picking a time of day, down to the minute. */
export function TimePicker({
  id,
  minutes,
  onChange,
}: {
  id?: string
  minutes: number
  onChange: (minutes: number) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const listRef = React.useRef<HTMLDivElement>(null)

  const typed = parseTime(query.trim())
  const options = query.trim() === "" ? BROWSE_OPTIONS : typed

  // Opening drops the list onto the current value instead of midnight.
  React.useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => {
      listRef.current
        ?.querySelector('[data-checked="true"]')
        ?.scrollIntoView({ block: "center" })
    })
    return () => cancelAnimationFrame(frame)
  }, [open])

  const pick = (min: number) => {
    onChange(min)
    setQuery("")
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery("")
      }}
    >
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-start font-normal tabular-nums"
          />
        }
      >
        <Clock className="size-4 shrink-0 text-muted-foreground" />
        {formatMinutes(minutes)}
      </PopoverTrigger>
      <PopoverContent className="w-40 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="e.g. 8:31 PM"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList ref={listRef} className="max-h-56">
            <CommandEmpty>No matching time.</CommandEmpty>
            <CommandGroup>
              {options.map((min) => (
                <CommandItem
                  key={min}
                  value={String(min)}
                  data-checked={min === minutes}
                  className="tabular-nums"
                  onSelect={() => pick(min)}
                >
                  {formatMinutes(min)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

import { useMutation } from "convex/react"
import { CalendarRange } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { nextColor } from "@/lib/calendar"
import type { CalendarDoc } from "@/lib/calendar"
import { LabelPicker } from "./label-picker"

export function CalendarPicker({
  calendars,
  value,
  onChange,
}: {
  calendars: Array<CalendarDoc>
  value: Id<"calendars"> | null
  onChange: (id: Id<"calendars"> | null) => void
}) {
  const createCalendar = useMutation(api.calendars.create)

  return (
    <LabelPicker
      items={calendars}
      value={value}
      onChange={onChange}
      onCreate={(name) => createCalendar({ name, color: nextColor(calendars) })}
      icon={CalendarRange}
      noneLabel="No calendar"
      emptyLabel="No calendars yet."
    />
  )
}

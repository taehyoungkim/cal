import { createFileRoute } from "@tanstack/react-router"
import { CalendarApp } from "@/components/calendar/calendar-app"

export const Route = createFileRoute("/_gated/calendar/$calendarKey")({
  component: SingleCalendar,
})

function SingleCalendar() {
  const { calendarKey } = Route.useParams()
  // Remount when switching calendars so view state starts fresh.
  return <CalendarApp key={calendarKey} focusKey={calendarKey} />
}

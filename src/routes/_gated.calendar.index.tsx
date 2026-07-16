import { createFileRoute } from "@tanstack/react-router"
import { CalendarApp } from "@/components/calendar/calendar-app"

export const Route = createFileRoute("/_gated/calendar/")({
  component: AllCalendars,
})

function AllCalendars() {
  return <CalendarApp />
}

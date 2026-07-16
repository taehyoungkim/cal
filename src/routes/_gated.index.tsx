import { createFileRoute } from "@tanstack/react-router"
import { CalendarsHome } from "@/components/calendars-home"

export const Route = createFileRoute("/_gated/")({ component: CalendarsHome })

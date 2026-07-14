import { createFileRoute } from "@tanstack/react-router"
import { CodeGate } from "@/components/code-gate"
import { CalendarApp } from "@/components/calendar/calendar-app"

export const Route = createFileRoute("/")({ component: App })

function App() {
  return (
    <CodeGate>
      <CalendarApp />
    </CodeGate>
  )
}

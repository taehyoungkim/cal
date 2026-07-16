import { createFileRoute } from "@tanstack/react-router"
import { CodeGate } from "@/components/code-gate"
import { ManagePage } from "@/components/manage-page"

export const Route = createFileRoute("/manage")({ component: Manage })

function Manage() {
  return (
    <CodeGate>
      <ManagePage />
    </CodeGate>
  )
}

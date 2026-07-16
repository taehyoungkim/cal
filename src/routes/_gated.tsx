import { Outlet, createFileRoute } from "@tanstack/react-router"
import { CodeGate } from "@/components/code-gate"

/**
 * Pathless layout: every page nests under the access-code gate, so new
 * routes can't accidentally ship ungated, and the gate (with its verify
 * round trip) survives client-side navigation.
 */
export const Route = createFileRoute("/_gated")({ component: Gated })

function Gated() {
  return (
    <CodeGate>
      <Outlet />
    </CodeGate>
  )
}

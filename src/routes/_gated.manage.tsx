import { createFileRoute } from "@tanstack/react-router"
import { ManagePage } from "@/components/manage-page"

export const Route = createFileRoute("/_gated/manage")({
  component: ManagePage,
})

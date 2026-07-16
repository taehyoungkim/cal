import { useMutation } from "convex/react"
import { Building2 } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import type { Department } from "@/lib/calendar"
import { LabelPicker } from "./label-picker"

export function DepartmentPicker({
  departments,
  value,
  onChange,
}: {
  departments: Array<Department>
  value: Id<"departments"> | null
  onChange: (id: Id<"departments"> | null) => void
}) {
  const createDepartment = useMutation(api.departments.create)

  return (
    <LabelPicker
      items={departments}
      value={value}
      onChange={onChange}
      onCreate={(name) => createDepartment({ name })}
      icon={Building2}
      noneLabel="No department"
      emptyLabel="No departments yet."
    />
  )
}

import { useMutation } from "convex/react"
import { Tag } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { categoryEmoji, nextEmoji } from "@/lib/calendar"
import type { Category } from "@/lib/calendar"
import { LabelPicker } from "./label-picker"

export function CategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: Array<Category>
  value: Id<"categories"> | null
  onChange: (id: Id<"categories"> | null) => void
}) {
  const createCategory = useMutation(api.categories.create)

  return (
    <LabelPicker
      items={categories.map((c) => ({ ...c, emoji: categoryEmoji(c) }))}
      value={value}
      onChange={onChange}
      onCreate={(name) =>
        createCategory({ name, emoji: nextEmoji(categories) })
      }
      icon={Tag}
      noneLabel="No category"
      emptyLabel="No categories yet."
    />
  )
}

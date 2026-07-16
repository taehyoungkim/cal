import { useMutation, useQuery } from "convex/react"
import { Link } from "@tanstack/react-router"
import { ArrowLeft, Building2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "../../convex/_generated/api"
import { categoryEmoji, nextColor, nextEmoji } from "@/lib/calendar"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner"
import { ColorPicker } from "./calendar/color-picker"
import { EmojiPicker } from "./calendar/emoji-picker"
import { ManageRow, NewLabelInput } from "./manage-row"

function SectionHeading({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b pb-2">
      <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      <p className="text-xs text-muted-foreground/70">{hint}</p>
    </div>
  )
}

/** One flat page to curate calendars, categories, and departments. */
export function ManagePage() {
  const calendars = useQuery(api.calendars.list) ?? []
  const categories = useQuery(api.categories.list) ?? []
  const departments = useQuery(api.departments.list) ?? []
  const counts = useQuery(api.events.counts)

  const createCalendar = useMutation(api.calendars.create)
  const updateCalendar = useMutation(api.calendars.update)
  const removeCalendar = useMutation(api.calendars.remove)
  const createCategory = useMutation(api.categories.create)
  const updateCategory = useMutation(api.categories.update)
  const removeCategory = useMutation(api.categories.remove)
  const createDepartment = useMutation(api.departments.create)
  const updateDepartment = useMutation(api.departments.update)
  const removeDepartment = useMutation(api.departments.remove)

  const guardDelete = async (name: string, deleted: boolean) => {
    if (!deleted) {
      toast.warning(
        `“${name}” still has events. Reassign or delete them first.`
      )
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-5xl items-center gap-2 px-6 pt-6 pb-10">
        <Link
          to="/"
          aria-label="Back to calendar"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "text-muted-foreground hover:text-foreground active:scale-[0.96]"
          )}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-base font-medium">Manage</h1>
      </header>

      <main className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-x-14 gap-y-10 px-6 pb-16 md:grid-cols-3">
        <section className="flex flex-col gap-2">
          <SectionHeading
            title="Calendars"
            hint="Color paints the events — click a dot to change it."
          />
          {calendars.map((calendar) => (
            <ManageRow
              key={calendar._id}
              name={calendar.name}
              count={counts?.calendars[calendar._id] ?? 0}
              onRename={(name) =>
                void updateCalendar({ id: calendar._id, name })
              }
              onDelete={async () =>
                guardDelete(
                  calendar.name,
                  await removeCalendar({ id: calendar._id })
                )
              }
              badge={
                <ColorPicker
                  value={calendar.color}
                  onChange={(color) =>
                    void updateCalendar({ id: calendar._id, color })
                  }
                >
                  <button
                    type="button"
                    aria-label={`Change color for ${calendar.name}`}
                    className="mx-1 size-4 shrink-0 rounded-full transition-transform duration-150 hover:scale-125 active:scale-100"
                    style={{ backgroundColor: calendar.color }}
                  />
                </ColorPicker>
              }
            />
          ))}
          <NewLabelInput
            label="New calendar"
            onCreate={async (name) => {
              await createCalendar({ name, color: nextColor(calendars) })
            }}
          />
        </section>

        <section className="flex flex-col gap-2">
          <SectionHeading
            title="Categories"
            hint="Event types — click an emoji to change it."
          />
          {categories.map((category) => (
            <ManageRow
              key={category._id}
              name={category.name}
              count={counts?.categories[category._id] ?? 0}
              onRename={(name) =>
                void updateCategory({ id: category._id, name })
              }
              onDelete={async () =>
                guardDelete(
                  category.name,
                  await removeCategory({ id: category._id })
                )
              }
              badge={
                <EmojiPicker
                  onChange={(emoji) =>
                    void updateCategory({ id: category._id, emoji })
                  }
                >
                  <button
                    type="button"
                    aria-label={`Change emoji for ${category.name}`}
                    className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-md text-sm transition-colors duration-150 hover:bg-muted active:scale-95"
                  >
                    {categoryEmoji(category)}
                  </button>
                </EmojiPicker>
              }
            />
          ))}
          <NewLabelInput
            label="New category"
            onCreate={async (name) => {
              await createCategory({ name, emoji: nextEmoji(categories) })
            }}
          />
        </section>

        <section className="flex flex-col gap-2">
          <SectionHeading
            title="Departments"
            hint="The teams in charge of events."
          />
          {departments.map((department) => (
            <ManageRow
              key={department._id}
              name={department.name}
              count={counts?.departments[department._id] ?? 0}
              onRename={(name) =>
                void updateDepartment({ id: department._id, name })
              }
              onDelete={async () =>
                guardDelete(
                  department.name,
                  await removeDepartment({ id: department._id })
                )
              }
              badge={
                <span className="flex size-6 shrink-0 items-center justify-center">
                  <Building2 className="size-3.5 text-muted-foreground" />
                </span>
              }
            />
          ))}
          <NewLabelInput
            label="New department"
            onCreate={async (name) => {
              await createDepartment({ name })
            }}
          />
        </section>
      </main>
      <Toaster position="bottom-left" />
    </div>
  )
}

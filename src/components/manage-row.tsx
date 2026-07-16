import * as React from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/**
 * One manage-page entry: badge, a name that edits in place (Enter or
 * blur saves, Escape reverts), how many events use it, and delete.
 */
export function ManageRow({
  name,
  count,
  badge,
  onRename,
  onDelete,
}: {
  name: string
  count: number
  badge: React.ReactNode
  onRename: (name: string) => void
  onDelete: () => void
}) {
  const [draft, setDraft] = React.useState(name)

  // Track outside renames (another tab, live query refresh).
  React.useEffect(() => setDraft(name), [name])

  const commit = () => {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === name) {
      setDraft(name)
      return
    }
    onRename(trimmed)
  }

  return (
    <div className="group -mx-2 flex items-center gap-1.5 rounded-lg px-2 py-0.5 transition-colors duration-150 hover:bg-muted/50">
      {badge}
      <Input
        aria-label={`Rename ${name}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            e.currentTarget.blur()
          }
          if (e.key === "Escape") {
            setDraft(name)
            e.currentTarget.blur()
          }
        }}
        className="h-7 min-w-0 flex-1 rounded-md border-transparent bg-transparent px-1.5 text-sm shadow-none focus-visible:border-transparent focus-visible:bg-muted focus-visible:ring-0 dark:bg-transparent"
      />
      <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
        {count === 0 ? "" : count === 1 ? "1 event" : `${count} events`}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete ${name}`}
        className="size-6 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100 max-md:opacity-100"
        onClick={onDelete}
      >
        <Trash2 />
      </Button>
    </div>
  )
}

/** A quiet "+ New …" row that turns into an input when clicked. */
export function NewLabelInput({
  label,
  onCreate,
}: {
  label: string
  onCreate: (name: string) => Promise<void>
}) {
  const [adding, setAdding] = React.useState(false)
  const [name, setName] = React.useState("")

  const commit = async () => {
    const trimmed = name.trim()
    setAdding(false)
    setName("")
    if (trimmed) await onCreate(trimmed)
  }

  if (!adding) {
    return (
      <button
        type="button"
        className="-mx-2 mt-0.5 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted/50 hover:text-foreground"
        onClick={() => setAdding(true)}
      >
        <Plus className="size-4" />
        {label}
      </button>
    )
  }

  return (
    <Input
      autoFocus
      placeholder={label}
      value={name}
      onChange={(e) => setName(e.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          void commit()
        }
        if (e.key === "Escape") {
          setName("")
          setAdding(false)
        }
      }}
      className="mt-1 h-8 animate-in rounded-md bg-muted/60 px-2 text-sm shadow-none duration-150 fade-in focus-visible:border-transparent focus-visible:bg-muted focus-visible:ring-0"
    />
  )
}

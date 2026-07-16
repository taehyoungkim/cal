import * as React from "react"
import { ChevronDown, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useInlineCreate } from "@/hooks/use-inline-create"
import { EmojiPicker } from "./emoji-picker"
import { LabelBadge } from "./label-picker"
import type { LucideIcon } from "lucide-react"

/**
 * A collapsible sidebar block of toggleable labels (calendars,
 * categories, departments): visibility checkboxes, hover-to-delete, an
 * optional inline "type a name" creator, and — when `onEmojiChange` is
 * given — a click-to-swap emoji badge. Whether it's open is remembered
 * per section.
 */
export function LabelList<
  T extends { _id: string; name: string; emoji?: string; color?: string },
>({
  title,
  items,
  hidden,
  icon,
  emptyHint,
  onToggle,
  onDelete,
  onCreate,
  createLabel,
  onEmojiChange,
}: {
  title: string
  items: Array<T>
  hidden: Set<string>
  icon: LucideIcon
  emptyHint: string
  onToggle: (id: string) => void
  onDelete: (item: T) => void
  onCreate?: (name: string) => Promise<void>
  createLabel?: string
  onEmojiChange?: (item: T, emoji: string) => void
}) {
  const storageKey = `sidebar-section:${title}`
  // Rendered client-side only (behind the code gate), so localStorage
  // is available during the initial render.
  const [open, setOpenState] = React.useState(
    () => localStorage.getItem(storageKey) !== "closed"
  )
  const creator = useInlineCreate(async (name) => {
    await onCreate?.(name)
  })

  const setOpen = (next: boolean) => {
    setOpenState(next)
    localStorage.setItem(storageKey, next ? "open" : "closed")
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center justify-between px-1">
        <CollapsibleTrigger className="group flex min-w-0 flex-1 cursor-pointer items-center gap-1 py-0.5 text-xs font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground">
          <ChevronDown className="size-3.5 shrink-0 -rotate-90 transition-transform duration-200 group-data-[panel-open]:rotate-0" />
          <span className="truncate">{title}</span>
          {!open && items.length > 0 && (
            <span className="font-normal normal-case tabular-nums">
              ({items.length})
            </span>
          )}
        </CollapsibleTrigger>
        {onCreate && !creator.adding && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={createLabel}
            className="size-6 text-muted-foreground hover:text-foreground"
            onClick={() => {
              if (!open) setOpen(true)
              creator.start()
            }}
          >
            <Plus className="size-4" />
          </Button>
        )}
      </div>
      <CollapsibleContent className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
        <div className="flex flex-col gap-1 pt-1">
          {items.length === 0 && !creator.adding && (
            <p className="px-1 py-2 text-sm text-pretty text-muted-foreground">
              {emptyHint}
            </p>
          )}
          {items.map((item) => (
            <div
              key={item._id}
              className="group flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors duration-150 hover:bg-muted"
            >
              <Checkbox
                id={`label-vis-${item._id}`}
                aria-label={`Show ${item.name}`}
                checked={!hidden.has(item._id)}
                onCheckedChange={() => onToggle(item._id)}
              />
              {onEmojiChange ? (
                <EmojiPicker onChange={(emoji) => onEmojiChange(item, emoji)}>
                  <button
                    type="button"
                    aria-label={`Change emoji for ${item.name}`}
                    className="flex size-6 shrink-0 items-center justify-center rounded-md transition-colors duration-150 hover:bg-background active:scale-95"
                  >
                    <LabelBadge item={item} icon={icon} />
                  </button>
                </EmojiPicker>
              ) : (
                <span className="transition-transform duration-200 group-hover:scale-110">
                  <LabelBadge item={item} icon={icon} />
                </span>
              )}
              <Label
                htmlFor={`label-vis-${item._id}`}
                className="min-w-0 flex-1 cursor-pointer truncate py-1 font-normal"
              >
                {item.name}
              </Label>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${item.name}`}
                className="size-6 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100 max-md:opacity-100"
                onClick={() => onDelete(item)}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          {creator.adding && (
            <Input
              placeholder={createLabel}
              {...creator.inputProps}
              className="h-8 animate-in rounded-md bg-muted/60 px-2 text-sm shadow-none duration-150 fade-in slide-in-from-top-1 focus-visible:border-transparent focus-visible:bg-muted focus-visible:ring-0"
            />
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

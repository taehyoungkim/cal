import * as React from "react"
import { ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { LucideIcon } from "lucide-react"

export function ColorDot({
  color,
  className,
}: {
  color: string
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color }}
    />
  )
}

export type LabelItem = {
  name: string
  emoji?: string
  color?: string
}

/** An item's leading badge: its emoji, its color dot, or the fallback icon. */
export function LabelBadge({
  item,
  icon: Icon,
}: {
  item: LabelItem
  icon: LucideIcon
}) {
  if (item.emoji)
    return (
      <span
        aria-hidden
        className="w-4 shrink-0 text-center text-sm leading-none"
      >
        {item.emoji}
      </span>
    )
  if (item.color) return <ColorDot color={item.color} />
  return <Icon className="size-4 shrink-0 text-muted-foreground" />
}

/**
 * A combobox over named labels (calendars, categories, departments):
 * pick one, clear it, or create a new one by typing its name.
 */
export function LabelPicker<TId extends string>({
  items,
  value,
  onChange,
  onCreate,
  icon: Icon,
  noneLabel,
  emptyLabel,
}: {
  items: Array<LabelItem & { _id: TId }>
  value: TId | null
  onChange: (id: TId | null) => void
  onCreate: (name: string) => Promise<TId>
  icon: LucideIcon
  noneLabel: string
  emptyLabel: string
}) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const selected = items.find((item) => item._id === value) ?? null
  const query = search.trim()
  const exactMatch = items.some(
    (item) => item.name.toLowerCase() === query.toLowerCase()
  )

  const handleCreate = async () => {
    if (!query) return
    onChange(await onCreate(query))
    setSearch("")
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          />
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected ? (
            <>
              <LabelBadge item={selected} icon={Icon} />
              <span className="truncate">{selected.name}</span>
            </>
          ) : (
            <>
              <Icon className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">{noneLabel}</span>
            </>
          )}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) min-w-64 p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search or create…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                data-checked={value === null}
                onSelect={() => {
                  onChange(null)
                  setOpen(false)
                }}
              >
                <Icon className="size-4 text-muted-foreground" />
                {noneLabel}
              </CommandItem>
              {items.map((item) => (
                <CommandItem
                  key={item._id}
                  value={item.name}
                  data-checked={value === item._id}
                  onSelect={() => {
                    onChange(item._id)
                    setOpen(false)
                  }}
                >
                  <LabelBadge item={item} icon={Icon} />
                  {item.name}
                </CommandItem>
              ))}
            </CommandGroup>
            {query && !exactMatch && (
              <CommandGroup>
                <CommandItem
                  value={`__create__${query}`}
                  onSelect={handleCreate}
                >
                  <Plus className="size-4 transition-transform duration-200 group-data-[selected=true]/command-item:rotate-90" />
                  Create “{query}”
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

import * as React from "react"
import { useMutation } from "convex/react"
import { ChevronsUpDown, Plus, Tag } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { nextCategoryColor } from "@/lib/calendar"
import type { Category } from "@/lib/calendar"
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

export function CategoryDot({
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

export function CategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: Array<Category>
  value: Id<"categories"> | null
  onChange: (id: Id<"categories"> | null) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const createCategory = useMutation(api.categories.create)

  const selected = categories.find((c) => c._id === value) ?? null
  const query = search.trim()
  const exactMatch = categories.some(
    (c) => c.name.toLowerCase() === query.toLowerCase()
  )

  const handleCreate = async () => {
    if (!query) return
    const id = await createCategory({
      name: query,
      color: nextCategoryColor(categories),
    })
    onChange(id)
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
              <CategoryDot color={selected.color} />
              <span className="truncate">{selected.name}</span>
            </>
          ) : (
            <>
              <Tag className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">No category</span>
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
            <CommandEmpty>No categories yet.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                data-checked={value === null}
                onSelect={() => {
                  onChange(null)
                  setOpen(false)
                }}
              >
                <Tag className="size-4 text-muted-foreground" />
                No category
              </CommandItem>
              {categories.map((category) => (
                <CommandItem
                  key={category._id}
                  value={category.name}
                  data-checked={value === category._id}
                  onSelect={() => {
                    onChange(category._id)
                    setOpen(false)
                  }}
                >
                  <CategoryDot color={category.color} />
                  {category.name}
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

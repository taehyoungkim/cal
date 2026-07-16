import * as React from "react"
import { EmojiPicker as EmojiPickerPrimitive } from "frimousse"
import type {
  EmojiPickerListCategoryHeaderProps,
  EmojiPickerListEmojiProps,
  EmojiPickerListRowProps,
} from "frimousse"
import { SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function EmojiPicker({
  className,
  ...props
}: React.ComponentProps<typeof EmojiPickerPrimitive.Root>) {
  return (
    <EmojiPickerPrimitive.Root
      data-slot="emoji-picker"
      className={cn(
        "isolate flex h-full w-fit flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
        className
      )}
      {...props}
    />
  )
}

function EmojiPickerSearch({
  className,
  ...props
}: React.ComponentProps<typeof EmojiPickerPrimitive.Search>) {
  return (
    <div
      data-slot="emoji-picker-search-wrapper"
      className="flex h-9 items-center gap-2 border-b px-3"
    >
      <SearchIcon className="size-4 shrink-0 opacity-50" />
      <EmojiPickerPrimitive.Search
        data-slot="emoji-picker-search"
        className={cn(
          "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  )
}

function EmojiPickerRow({ children, ...props }: EmojiPickerListRowProps) {
  return (
    <div {...props} className="scroll-my-1 px-1">
      {children}
    </div>
  )
}

function EmojiPickerEmoji({
  emoji,
  className,
  ...props
}: EmojiPickerListEmojiProps & { className?: string }) {
  return (
    <button
      {...props}
      className={cn(
        "flex size-7 items-center justify-center rounded-sm text-base data-[active]:bg-accent",
        className
      )}
    >
      {emoji.emoji}
    </button>
  )
}

function EmojiPickerCategoryHeader({
  category,
  ...props
}: EmojiPickerListCategoryHeaderProps) {
  return (
    <div
      {...props}
      className="bg-popover px-3 pt-3.5 pb-2 text-xs leading-none text-muted-foreground"
    >
      {category.label}
    </div>
  )
}

function EmojiPickerContent({
  className,
  ...props
}: React.ComponentProps<typeof EmojiPickerPrimitive.Viewport>) {
  return (
    <EmojiPickerPrimitive.Viewport
      data-slot="emoji-picker-viewport"
      className={cn("relative flex-1 outline-hidden", className)}
      {...props}
    >
      <EmojiPickerPrimitive.Loading
        data-slot="emoji-picker-loading"
        className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground"
      >
        Loading…
      </EmojiPickerPrimitive.Loading>
      <EmojiPickerPrimitive.Empty
        data-slot="emoji-picker-empty"
        className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground"
      >
        No emoji found.
      </EmojiPickerPrimitive.Empty>
      <EmojiPickerPrimitive.List
        data-slot="emoji-picker-list"
        className="select-none pb-1"
        components={{
          CategoryHeader: EmojiPickerCategoryHeader,
          Row: EmojiPickerRow,
          Emoji: EmojiPickerEmoji,
        }}
      />
    </EmojiPickerPrimitive.Viewport>
  )
}

export {
  EmojiPicker,
  EmojiPickerSearch,
  EmojiPickerContent,
  EmojiPickerRow,
  EmojiPickerEmoji,
  EmojiPickerCategoryHeader,
}

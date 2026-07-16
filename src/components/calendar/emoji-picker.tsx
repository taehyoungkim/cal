import * as React from "react"
import {
  EmojiPicker as EmojiPickerPanel,
  EmojiPickerContent,
  EmojiPickerSearch,
} from "@/components/ui/emoji-picker"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

/**
 * The full emoji palette in a popover. The trigger is the caller's
 * element (usually the current emoji itself).
 */
export function EmojiPicker({
  onChange,
  children,
}: {
  onChange: (emoji: string) => void
  children: React.ReactElement
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={children} />
      {/* Pinned to the right of the trigger: the sidebar sits at the left
        edge, so there's always room, and no top/bottom flipping. */}
      <PopoverContent
        className="w-fit p-0"
        side="right"
        align="center"
        sideOffset={8}
      >
        <EmojiPickerPanel
          className="h-80"
          onEmojiSelect={({ emoji }) => {
            onChange(emoji)
            setOpen(false)
          }}
        >
          <EmojiPickerSearch placeholder="Search emoji…" autoFocus />
          <EmojiPickerContent />
        </EmojiPickerPanel>
      </PopoverContent>
    </Popover>
  )
}

import * as React from "react"
import { Check } from "lucide-react"
import { PALETTE } from "@/lib/calendar"
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

/** The calendar palette in a popover; the trigger is the caller's element. */
export function ColorPicker({
  value,
  onChange,
  children,
}: {
  value?: string
  onChange: (color: string) => void
  children: React.ReactElement
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={children} />
      <PopoverContent
        className="w-auto p-2"
        side="right"
        align="center"
        sideOffset={8}
      >
        <div className="grid grid-cols-6 gap-1.5">
          {PALETTE.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Use ${color}`}
              className={cn(
                "flex size-7 items-center justify-center rounded-full transition-transform duration-150 hover:scale-110 active:scale-100",
                color === value && "ring-2 ring-foreground/40 ring-offset-2"
              )}
              style={{ backgroundColor: color }}
              onClick={() => {
                onChange(color)
                setOpen(false)
              }}
            >
              {color === value && <Check className="size-3.5 text-black/60" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

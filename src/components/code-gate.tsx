import * as React from "react"
import { CalendarDays } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"

const ACCESS_CODE = "austin"
const STORAGE_KEY = "calendar-access-code"

export function CodeGate({ children }: { children: React.ReactNode }) {
  // null = not yet checked (avoids SSR/localStorage mismatch)
  const [unlocked, setUnlocked] = React.useState<boolean | null>(null)
  const [code, setCode] = React.useState("")
  const [error, setError] = React.useState(false)

  React.useEffect(() => {
    setUnlocked(localStorage.getItem(STORAGE_KEY) === ACCESS_CODE)
  }, [])

  if (unlocked === null) return null
  if (unlocked) return <>{children}</>

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim().toLowerCase() === ACCESS_CODE) {
      localStorage.setItem(STORAGE_KEY, ACCESS_CODE)
      setUnlocked(true)
    } else {
      setError(true)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <form
        onSubmit={submit}
        className="flex w-full max-w-2xs flex-col items-center gap-8"
      >
        <div className="flex animate-in flex-col items-center gap-2.5 duration-500 fade-in slide-in-from-bottom-2">
          <CalendarDays aria-hidden className="size-6" strokeWidth={1.5} />
          <h1 className="text-sm font-medium tracking-tight">Calendar</h1>
        </div>
        <div
          className="flex w-full animate-in flex-col items-center gap-3 duration-500 fade-in slide-in-from-bottom-2"
          style={{ animationDelay: "100ms", animationFillMode: "both" }}
        >
          <Input
            type="password"
            autoFocus
            placeholder="Access code"
            aria-label="Access code"
            aria-invalid={error || undefined}
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              setError(false)
            }}
            className="h-10 text-center"
          />
          <p aria-live="polite" className="h-4 text-xs">
            {error ? (
              <span className="text-destructive">Wrong code — try again</span>
            ) : (
              <span className="text-muted-foreground">
                Press <Kbd>Enter</Kbd> to unlock
              </span>
            )}
          </p>
        </div>
      </form>
    </main>
  )
}

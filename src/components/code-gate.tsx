import * as React from "react"
import { useConvex } from "convex/react"
import { CalendarDays } from "lucide-react"
import { api } from "../../convex/_generated/api"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"

const STORAGE_KEY = "calendar-access-code"

export function CodeGate({ children }: { children: React.ReactNode }) {
  const convex = useConvex()
  // null = not yet checked (avoids SSR/localStorage mismatch)
  const [unlocked, setUnlocked] = React.useState<boolean | null>(null)
  const [code, setCode] = React.useState("")
  const [error, setError] = React.useState(false)
  const [attempts, setAttempts] = React.useState(0)
  const [checking, setChecking] = React.useState(false)

  // Re-verify the remembered code on load, so codes removed from the
  // accessCodes table lock previously unlocked browsers back out.
  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      setUnlocked(false)
      return
    }
    let cancelled = false
    convex
      .query(api.access.verify, { code: stored })
      .then((ok) => {
        if (cancelled) return
        if (!ok) localStorage.removeItem(STORAGE_KEY)
        setUnlocked(ok)
      })
      .catch(() => {
        if (!cancelled) setUnlocked(false)
      })
    return () => {
      cancelled = true
    }
  }, [convex])

  if (unlocked === null) return null
  if (unlocked) return <>{children}</>

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (checking) return
    setChecking(true)
    try {
      const ok = await convex.query(api.access.verify, { code })
      if (ok) {
        localStorage.setItem(STORAGE_KEY, code.trim().toLowerCase())
        setUnlocked(true)
        return
      }
    } catch {
      // network failure lands in the same retry path as a wrong code
    } finally {
      setChecking(false)
    }
    setError(true)
    setAttempts((n) => n + 1)
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <form
        onSubmit={(e) => void submit(e)}
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
          <div
            key={attempts}
            className={cn("w-full", attempts > 0 && "animate-shake")}
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
          </div>
          <p aria-live="polite" className="h-4 text-xs">
            {checking ? (
              <span className="text-muted-foreground">Checking…</span>
            ) : error ? (
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

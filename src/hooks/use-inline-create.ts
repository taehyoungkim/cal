import * as React from "react"

/**
 * The "quiet button becomes an input" creator used by the sidebar
 * sections, the manage page, and the landing page: Enter or blur
 * commits, Escape cancels. `onCreate` may return `false` to keep the
 * input open (e.g. a duplicate name the user should adjust).
 */
export function useInlineCreate(
  onCreate: (name: string) => Promise<boolean | void>
) {
  const [adding, setAdding] = React.useState(false)
  const [name, setName] = React.useState("")

  const cancel = () => {
    setAdding(false)
    setName("")
  }

  const commit = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      cancel()
      return
    }
    if ((await onCreate(trimmed)) === false) return
    cancel()
  }

  /** Spread onto the (already styled) Input element. */
  const inputProps = {
    autoFocus: true,
    value: name,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setName(e.target.value),
    onBlur: () => void commit(),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        void commit()
      }
      if (e.key === "Escape") cancel()
    },
  }

  return { adding, start: () => setAdding(true), inputProps }
}

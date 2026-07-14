import { addDays, format, startOfDay, startOfWeek } from "date-fns"
import type { Doc } from "../../convex/_generated/dataModel"

export type CalendarView = "day" | "3day" | "week"

export type CalendarEvent = Doc<"events">
export type Category = Doc<"categories">

/** Events snap ("magnetically") to hours and half hours. */
export const SNAP_MINUTES = 30
export const MIN_HOUR_HEIGHT = 48
export const DAY_MINUTES = 24 * 60

export const VIEW_DAY_COUNT: Record<CalendarView, number> = {
  day: 1,
  "3day": 3,
  week: 7,
}

// Pastel palette — soft backgrounds that take dark text.
export const CATEGORY_COLORS = [
  "#93c5fd", // blue
  "#6ee7b7", // emerald
  "#fcd34d", // amber
  "#fda4af", // rose
  "#c4b5fd", // violet
  "#f9a8d4", // pink
  "#7dd3fc", // sky
  "#fdba74", // orange
  "#a5b4fc", // indigo
  "#5eead4", // teal
  "#bef264", // lime
  "#d8b4fe", // purple
]

export const DEFAULT_EVENT_COLOR = "#cbd5e1"

export const UNTITLED_EVENT = "(No title)"

export function categoryColor(category: Category | undefined): string {
  return category?.color ?? DEFAULT_EVENT_COLOR
}

export function nextCategoryColor(existing: Array<Category>): string {
  const used = new Set(existing.map((c) => c.color))
  const unused = CATEGORY_COLORS.filter((color) => !used.has(color))
  const pool = unused.length > 0 ? unused : CATEGORY_COLORS
  return pool[Math.floor(Math.random() * pool.length)]
}

/** The list of days visible for a given anchor date + view. */
export function visibleDays(anchor: Date, view: CalendarView): Array<Date> {
  const count = VIEW_DAY_COUNT[view]
  const first =
    view === "week"
      ? startOfWeek(anchor, { weekStartsOn: 0 })
      : startOfDay(anchor)
  return Array.from({ length: count }, (_, i) => addDays(first, i))
}

/** Rounds minutes-into-day to the nearest half hour, clamped to the day. */
export function snapMinutes(minutes: number): number {
  const snapped = Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES
  return Math.max(0, Math.min(snapped, DAY_MINUTES - SNAP_MINUTES))
}

export function dateAtMinutes(day: Date, minutes: number): Date {
  const d = startOfDay(day)
  d.setMinutes(minutes)
  return d
}

export function minutesIntoDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

/** Formats minutes-into-day as a wall-clock label, independent of any date. */
export function formatMinutes(minutes: number, fmt = "h:mm a"): string {
  return format(new Date(2000, 0, 1, 0, minutes), fmt)
}

/** Exclusive end (epoch ms) of the day containing `day`. */
export function dayEndMs(day: Date): number {
  return addDays(startOfDay(day), 1).getTime()
}

/** Events already booked at exactly `time`, excluding the event being placed. */
export function conflictsAt(
  events: Array<CalendarEvent>,
  time: number,
  excludeId?: CalendarEvent["_id"]
): Array<CalendarEvent> {
  return events.filter((e) => e.time === time && e._id !== excludeId)
}

export type PositionedEvent<T> = {
  item: T
  /** minutes from midnight */
  startMin: number
  /** horizontal slot when several events share a time */
  col: number
  cols: number
}

/**
 * Assign side-by-side columns to events that land on (or near) the same
 * time, so simultaneous events stay readable.
 */
export function layoutDayEvents<T>(
  items: Array<{ item: T; startMin: number }>
): Array<PositionedEvent<T>> {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin)
  const result: Array<PositionedEvent<T>> = []

  // Break into clusters of transitively-overlapping markers.
  let cluster: typeof sorted = []
  let clusterEnd = -1

  const flush = () => {
    if (cluster.length === 0) return
    const colEnds: Array<number> = []
    const placed = cluster.map((e) => {
      let col = colEnds.findIndex((end) => end <= e.startMin)
      if (col === -1) {
        col = colEnds.length
        colEnds.push(e.startMin + SNAP_MINUTES)
      } else {
        colEnds[col] = e.startMin + SNAP_MINUTES
      }
      return { ...e, col, cols: 0 }
    })
    for (const p of placed) p.cols = colEnds.length
    result.push(...placed)
    cluster = []
  }

  for (const e of sorted) {
    if (e.startMin >= clusterEnd) {
      flush()
      clusterEnd = e.startMin + SNAP_MINUTES
    } else {
      clusterEnd = Math.max(clusterEnd, e.startMin + SNAP_MINUTES)
    }
    cluster.push(e)
  }
  flush()

  return result
}

import { addDays, format, parseISO, startOfDay, startOfWeek } from "date-fns"
import type { Doc } from "../../convex/_generated/dataModel"

export type CalendarView = "day" | "week" | "month"

export type CalendarEvent = Doc<"events">
export type CalendarDoc = Doc<"calendars">
export type Category = Doc<"categories">
export type Department = Doc<"departments">

/** A timed event: a minute-precision moment. */
export type TimedEvent = CalendarEvent & { time: number }
/** An all-day event: an inclusive "yyyy-MM-dd" span. */
export type AllDayEvent = CalendarEvent & { startDate: string; endDate: string }

export function isAllDay(event: CalendarEvent): event is AllDayEvent {
  return event.startDate !== undefined
}

export function isTimed(event: CalendarEvent): event is TimedEvent {
  return event.time !== undefined
}

/** Grid interactions snap ("magnetically") to five-minute marks; the
 * dialog's time field goes down to the minute. */
export const SNAP_MINUTES = 5
/** Visual footprint of a marker, used to pack side-by-side columns. */
export const MARKER_SPAN_MINUTES = 30
export const MIN_HOUR_HEIGHT = 48
export const DAY_MINUTES = 24 * 60

export const VIEW_DAY_COUNT: Record<Exclude<CalendarView, "month">, number> = {
  day: 1,
  week: 7,
}

// Pastel palette for calendars — soft backgrounds that take dark text.
export const PALETTE = [
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

export function byId<T extends { _id: string }>(
  items: Array<T>
): Map<T["_id"], T> {
  return new Map(items.map((item) => [item._id, item]))
}

export function nextColor(existing: Array<{ color: string }>): string {
  const used = new Set(existing.map((c) => c.color))
  const unused = PALETTE.filter((color) => !used.has(color))
  const pool = unused.length > 0 ? unused : PALETTE
  return pool[Math.floor(Math.random() * pool.length)]
}

// Category badges. New categories draw a random unused emoji; the
// sidebar lets the user swap it for any other.
export const EMOJI_POOL = [
  "🎤",
  "🎬",
  "📸",
  "🎧",
  "🎹",
  "🎸",
  "🥁",
  "🎻",
  "✈️",
  "🚌",
  "🏟️",
  "🎪",
  "📺",
  "📻",
  "🗞️",
  "💄",
  "👗",
  "🩰",
  "🏋️",
  "🧘",
  "🍽️",
  "☕",
  "🎂",
  "🎁",
  "📝",
  "📋",
  "📞",
  "💬",
  "🤝",
  "💼",
  "🧳",
  "🗓️",
  "⭐",
  "🔥",
  "💡",
  "🎯",
  "🏆",
  "🎉",
  "💿",
  "🎫",
]

export const DEFAULT_CATEGORY_EMOJI = "🏷️"

export function nextEmoji(existing: Array<{ emoji?: string }>): string {
  const used = new Set(existing.map((c) => c.emoji))
  const unused = EMOJI_POOL.filter((emoji) => !used.has(emoji))
  const pool = unused.length > 0 ? unused : EMOJI_POOL
  return pool[Math.floor(Math.random() * pool.length)]
}

/** A category's badge; pre-emoji categories get the default tag. */
export function categoryEmoji(category: { emoji?: string }): string {
  return category.emoji ?? DEFAULT_CATEGORY_EMOJI
}

/** The event's display color — always its calendar's. */
export function eventColor(
  event: CalendarEvent,
  calendars: Map<CalendarDoc["_id"], CalendarDoc>
): string {
  const calendar = event.calendarId ? calendars.get(event.calendarId) : null
  return calendar?.color ?? DEFAULT_EVENT_COLOR
}

/** Local-date key ("yyyy-MM-dd") — the storage form of all-day dates. */
export function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

/** Local midnight of a "yyyy-MM-dd" key. */
export function parseDayKey(key: string): Date {
  return parseISO(key)
}

/** When the event starts, as local epoch ms (all-day: its first midnight). */
export function eventStartMs(event: CalendarEvent): number {
  return isAllDay(event) ? parseDayKey(event.startDate).getTime() : event.time!
}

/** The list of days visible for a given anchor date + view. */
export function visibleDays(
  anchor: Date,
  view: Exclude<CalendarView, "month">
): Array<Date> {
  const count = VIEW_DAY_COUNT[view]
  const first =
    view === "week"
      ? startOfWeek(anchor, { weekStartsOn: 0 })
      : startOfDay(anchor)
  return Array.from({ length: count }, (_, i) => addDays(first, i))
}

/** Rounds minutes-into-day to the nearest snap mark, clamped to the day. */
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

/** "Jul 15" or "Jul 15 – 17" or "Jul 30 – Aug 2" for an all-day span. */
export function formatDaySpan(event: AllDayEvent): string {
  const start = parseDayKey(event.startDate)
  const end = parseDayKey(event.endDate)
  if (event.startDate === event.endDate) return format(start, "MMM d")
  const sameMonth =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth()
  return `${format(start, "MMM d")} – ${format(end, sameMonth ? "d" : "MMM d")}`
}

/** Timed events already booked at exactly `time` (to the minute),
 * excluding the event being placed. */
export function conflictsAt<T extends CalendarEvent>(
  events: Array<T>,
  time: number,
  excludeId?: CalendarEvent["_id"]
): Array<T> {
  return events.filter((e) => e.time === time && e._id !== excludeId)
}

/** Whether any of `conflicts` lives on a different calendar than `event` —
 * the cross-calendar overlaps the team asked to have flagged. */
export function hasCrossCalendarConflict(
  event: CalendarEvent,
  conflicts: Array<CalendarEvent>
): boolean {
  return conflicts.some((c) => c.calendarId !== event.calendarId)
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
        colEnds.push(e.startMin + MARKER_SPAN_MINUTES)
      } else {
        colEnds[col] = e.startMin + MARKER_SPAN_MINUTES
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
      clusterEnd = e.startMin + MARKER_SPAN_MINUTES
    } else {
      clusterEnd = Math.max(clusterEnd, e.startMin + MARKER_SPAN_MINUTES)
    }
    cluster.push(e)
  }
  flush()

  return result
}

export type AllDayBar<T> = {
  item: T
  /** first visible column (index into the days row) */
  startCol: number
  /** number of columns covered */
  span: number
  /** vertical slot within the all-day section */
  lane: number
  /** true when the event continues beyond the visible edge */
  startsBefore: boolean
  endsAfter: boolean
}

/**
 * Lay all-day events out as horizontal bars across a row of days,
 * packing overlapping spans into stacked lanes.
 */
export function layoutAllDayBars<T extends AllDayEvent>(
  events: Array<T>,
  days: Array<Date>
): { bars: Array<AllDayBar<T>>; laneCount: number } {
  if (days.length === 0) return { bars: [], laneCount: 0 }
  const firstKey = dayKey(days[0])
  const lastKey = dayKey(days[days.length - 1])
  const keyToCol = new Map(days.map((d, i) => [dayKey(d), i]))

  const visible = events
    .filter((e) => e.startDate <= lastKey && e.endDate >= firstKey)
    .sort(
      (a, b) =>
        a.startDate.localeCompare(b.startDate) ||
        b.endDate.localeCompare(a.endDate)
    )

  // Greedy lane packing: each lane remembers the last column it occupies.
  const laneEnds: Array<number> = []
  const bars = visible.map((item) => {
    const startsBefore = item.startDate < firstKey
    const endsAfter = item.endDate > lastKey
    const startCol = startsBefore ? 0 : (keyToCol.get(item.startDate) ?? 0)
    const endCol = endsAfter
      ? days.length - 1
      : (keyToCol.get(item.endDate) ?? days.length - 1)
    let lane = laneEnds.findIndex((end) => end < startCol)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(endCol)
    } else {
      laneEnds[lane] = endCol
    }
    return {
      item,
      startCol,
      span: endCol - startCol + 1,
      lane,
      startsBefore,
      endsAfter,
    }
  })

  return { bars, laneCount: laneEnds.length }
}

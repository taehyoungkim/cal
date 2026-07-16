import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  // Codes that unlock the app. Stored normalized (trimmed, lowercase);
  // manage rows via the dashboard or the access:setCode mutation.
  accessCodes: defineTable({
    code: v.string(),
  }).index("by_code", ["code"]),
  // Separate calendars (e.g. one per artist). Events belong to at most
  // one; the calendar's color is the event's display color.
  calendars: defineTable({
    name: v.string(),
    color: v.string(),
    // URL-friendly unique handle derived from the name ("/calendar/<slug>").
    // Optional only for rows that predate slugs; new writes always set it.
    slug: v.optional(v.string()),
  })
    .index("by_name", ["name"])
    .index("by_slug", ["slug"]),
  // Event-type tags, badged with an emoji.
  categories: defineTable({
    name: v.string(),
    emoji: v.optional(v.string()),
    // Legacy — categories used to be color-coded; calendars own color now.
    color: v.optional(v.string()),
  }).index("by_name", ["name"]),
  // Teams in charge of events (담당 부서).
  departments: defineTable({
    name: v.string(),
  }).index("by_name", ["name"]),
  // An event is either timed (`time` set) or all-day (`startDate`/`endDate`
  // set) — never both. All-day events may span multiple days.
  events: defineTable({
    title: v.string(),
    // Timed events: a minute-precision moment (epoch ms) — no duration.
    time: v.optional(v.number()),
    // All-day events: inclusive local-date span, "yyyy-MM-dd".
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    details: v.optional(v.string()),
    departmentId: v.optional(v.id("departments")),
    // Legacy free-text department, superseded by departmentId.
    department: v.optional(v.string()),
    calendarId: v.optional(v.id("calendars")),
    categoryId: v.optional(v.id("categories")),
  })
    .index("by_time", ["time"])
    // All-day range queries: endDate >= rangeStart, then filter on startDate.
    .index("by_end_date", ["endDate"])
    .index("by_calendar", ["calendarId"])
    .index("by_category", ["categoryId"])
    .index("by_department", ["departmentId"])
    .searchIndex("search_title", { searchField: "title" }),
})

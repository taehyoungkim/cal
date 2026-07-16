import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import type { MutationCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"

const eventDoc = v.object({
  _id: v.id("events"),
  _creationTime: v.number(),
  title: v.string(),
  time: v.optional(v.number()),
  startDate: v.optional(v.string()),
  endDate: v.optional(v.string()),
  details: v.optional(v.string()),
  departmentId: v.optional(v.id("departments")),
  // Legacy free-text department, superseded by departmentId.
  department: v.optional(v.string()),
  calendarId: v.optional(v.id("calendars")),
  categoryId: v.optional(v.id("categories")),
})

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

/** Rejects events that are neither cleanly timed nor cleanly all-day. */
function validateShape(event: {
  time?: number
  startDate?: string
  endDate?: string
}) {
  const allDay = event.startDate !== undefined || event.endDate !== undefined
  if (allDay) {
    if (
      event.time !== undefined ||
      event.startDate === undefined ||
      event.endDate === undefined
    ) {
      throw new Error("All-day events need startDate and endDate, and no time")
    }
    if (!DATE_KEY.test(event.startDate) || !DATE_KEY.test(event.endDate)) {
      throw new Error("Dates must be yyyy-MM-dd")
    }
    if (event.endDate < event.startDate) {
      throw new Error("endDate must not precede startDate")
    }
  } else if (event.time === undefined) {
    throw new Error("Timed events need a time")
  }
}

export const list = query({
  args: {
    // Timed events: [rangeStart, rangeEnd) in epoch ms.
    rangeStart: v.number(),
    rangeEnd: v.number(),
    // All-day events: inclusive "yyyy-MM-dd" span of the visible days.
    rangeStartDate: v.string(),
    rangeEndDate: v.string(),
  },
  returns: v.array(eventDoc),
  handler: async (ctx, args) => {
    const timed = await ctx.db
      .query("events")
      .withIndex("by_time", (q) =>
        q.gte("time", args.rangeStart).lt("time", args.rangeEnd)
      )
      .collect()
    // Overlap test: the index bounds "ends on/after the range start";
    // "starts on/before its end" is checked here.
    const endingInOrAfterRange = await ctx.db
      .query("events")
      .withIndex("by_end_date", (q) => q.gte("endDate", args.rangeStartDate))
      .collect()
    const allDay = endingInOrAfterRange.filter(
      (e) => e.startDate !== undefined && e.startDate <= args.rangeEndDate
    )
    return [...allDay, ...timed]
  },
})

export const search = query({
  args: { query: v.string() },
  returns: v.array(eventDoc),
  handler: async (ctx, args) => {
    const text = args.query.trim()
    if (text === "") return []
    // Relevance-ordered; the last term matches as a prefix, so this
    // doubles as typeahead.
    return await ctx.db
      .query("events")
      .withSearchIndex("search_title", (q) => q.search("title", text))
      .take(8)
  },
})

export const upcoming = query({
  args: {
    after: v.number(),
    // The client's local "yyyy-MM-dd" for the same moment — all-day events
    // have no timezone, so the caller anchors "today".
    afterDate: v.string(),
  },
  returns: v.array(eventDoc),
  handler: async (ctx, args) => {
    const timed = await ctx.db
      .query("events")
      .withIndex("by_time", (q) => q.gte("time", args.after))
      .take(5)
    const allDay = await ctx.db
      .query("events")
      .withIndex("by_end_date", (q) => q.gte("endDate", args.afterDate))
      .take(5)
    // The client interleaves them into local-time order.
    return [...allDay, ...timed]
  },
})

/** How many events reference each calendar / category / department —
 * shown on the manage page so deletions aren't a surprise. */
export const counts = query({
  args: {},
  returns: v.object({
    calendars: v.record(v.id("calendars"), v.number()),
    categories: v.record(v.id("categories"), v.number()),
    departments: v.record(v.id("departments"), v.number()),
  }),
  handler: async (ctx) => {
    // Bounded sweep — counts saturate past 5000 events, plenty for this app.
    const events = await ctx.db.query("events").take(5000)
    const calendars: Record<string, number> = {}
    const categories: Record<string, number> = {}
    const departments: Record<string, number> = {}
    for (const event of events) {
      if (event.calendarId)
        calendars[event.calendarId] = (calendars[event.calendarId] ?? 0) + 1
      if (event.categoryId)
        categories[event.categoryId] = (categories[event.categoryId] ?? 0) + 1
      if (event.departmentId)
        departments[event.departmentId] =
          (departments[event.departmentId] ?? 0) + 1
    }
    return { calendars, categories, departments }
  },
})

const writableFields = {
  title: v.string(),
  time: v.optional(v.number()),
  startDate: v.optional(v.string()),
  endDate: v.optional(v.string()),
  details: v.optional(v.string()),
  departmentId: v.optional(v.id("departments")),
  calendarId: v.optional(v.id("calendars")),
  categoryId: v.optional(v.id("categories")),
}

async function checkRefs(
  ctx: MutationCtx,
  refs: {
    calendarId?: Id<"calendars"> | null
    categoryId?: Id<"categories"> | null
    departmentId?: Id<"departments"> | null
  }
) {
  // Convex validates the id format but not the row's existence.
  const [calendar, category, department] = await Promise.all([
    refs.calendarId ? ctx.db.get(refs.calendarId) : null,
    refs.categoryId ? ctx.db.get(refs.categoryId) : null,
    refs.departmentId ? ctx.db.get(refs.departmentId) : null,
  ])
  if (refs.calendarId && !calendar) throw new Error("Unknown calendar")
  if (refs.categoryId && !category) throw new Error("Unknown category")
  if (refs.departmentId && !department) throw new Error("Unknown department")
}

export const create = mutation({
  args: writableFields,
  returns: v.id("events"),
  handler: async (ctx, args) => {
    validateShape(args)
    await checkRefs(ctx, args)
    return await ctx.db.insert("events", args)
  },
})

export const update = mutation({
  args: {
    id: v.id("events"),
    title: v.optional(v.string()),
    // null clears a field (switching timed <-> all-day clears the other
    // shape's fields); undefined leaves it untouched.
    time: v.optional(v.union(v.number(), v.null())),
    startDate: v.optional(v.union(v.string(), v.null())),
    endDate: v.optional(v.union(v.string(), v.null())),
    details: v.optional(v.union(v.string(), v.null())),
    departmentId: v.optional(v.union(v.id("departments"), v.null())),
    calendarId: v.optional(v.union(v.id("calendars"), v.null())),
    categoryId: v.optional(v.union(v.id("categories"), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, { id, ...fields }) => {
    const existing = await ctx.db.get(id)
    if (!existing) throw new Error("Unknown event")
    await checkRefs(ctx, fields)
    const patch: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(fields)) {
      // Absent args never reach here (clients strip undefined); null
      // means "clear", and patching to undefined removes the field.
      patch[key] = value ?? undefined
    }
    // Any department edit retires the legacy free-text field.
    if ("departmentId" in fields) patch.department = undefined
    const next = { ...existing, ...patch } as {
      time?: number
      startDate?: string
      endDate?: string
    }
    validateShape(next)
    await ctx.db.patch(id, patch)
    return null
  },
})

export const remove = mutation({
  args: { id: v.id("events") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return null
  },
})

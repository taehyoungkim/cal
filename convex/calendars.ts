import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("calendars"),
      _creationTime: v.number(),
      name: v.string(),
      color: v.string(),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("calendars").withIndex("by_name").take(200)
  },
})

export const create = mutation({
  args: { name: v.string(), color: v.string() },
  returns: v.id("calendars"),
  handler: async (ctx, args) => {
    const name = args.name.trim()
    const existing = await ctx.db
      .query("calendars")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first()
    if (existing) return existing._id
    return await ctx.db.insert("calendars", { name, color: args.color })
  },
})

export const update = mutation({
  args: {
    id: v.id("calendars"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { id, name, color }) => {
    const patch: { name?: string; color?: string } = {}
    if (name !== undefined) {
      const trimmed = name.trim()
      if (!trimmed) throw new Error("Name required")
      patch.name = trimmed
    }
    if (color !== undefined) patch.color = color
    await ctx.db.patch(id, patch)
    return null
  },
})

/** Deletes a calendar. Returns false (and leaves it) if any events still use it. */
export const remove = mutation({
  args: { id: v.id("calendars") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const inUse = await ctx.db
      .query("events")
      .withIndex("by_calendar", (q) => q.eq("calendarId", args.id))
      .first()
    if (inUse) return false
    await ctx.db.delete(args.id)
    return true
  },
})

import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

const eventDoc = v.object({
  _id: v.id("events"),
  _creationTime: v.number(),
  title: v.string(),
  time: v.number(),
  details: v.optional(v.string()),
  categoryId: v.optional(v.id("categories")),
})

export const list = query({
  args: { rangeStart: v.number(), rangeEnd: v.number() },
  returns: v.array(eventDoc),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_time", (q) =>
        q.gte("time", args.rangeStart).lt("time", args.rangeEnd)
      )
      .collect()
  },
})

export const create = mutation({
  args: {
    title: v.string(),
    time: v.number(),
    details: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
  },
  returns: v.id("events"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("events", args)
  },
})

export const update = mutation({
  args: {
    id: v.id("events"),
    title: v.optional(v.string()),
    time: v.optional(v.number()),
    details: v.optional(v.union(v.string(), v.null())),
    categoryId: v.optional(v.union(v.id("categories"), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, { id, details, categoryId, ...fields }) => {
    const patch: Record<string, unknown> = { ...fields }
    // null clears the field; patching to undefined removes it
    if (details !== undefined) patch.details = details ?? undefined
    if (categoryId !== undefined) patch.categoryId = categoryId ?? undefined
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

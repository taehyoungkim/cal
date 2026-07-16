import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("departments"),
      _creationTime: v.number(),
      name: v.string(),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("departments").withIndex("by_name").take(200)
  },
})

export const create = mutation({
  args: { name: v.string() },
  returns: v.id("departments"),
  handler: async (ctx, args) => {
    const name = args.name.trim()
    const existing = await ctx.db
      .query("departments")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first()
    if (existing) return existing._id
    return await ctx.db.insert("departments", { name })
  },
})

export const update = mutation({
  args: { id: v.id("departments"), name: v.string() },
  returns: v.null(),
  handler: async (ctx, { id, name }) => {
    const trimmed = name.trim()
    if (!trimmed) throw new Error("Name required")
    await ctx.db.patch(id, { name: trimmed })
    return null
  },
})

/** Deletes a department. Returns false (and leaves it) if any events still use it. */
export const remove = mutation({
  args: { id: v.id("departments") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const inUse = await ctx.db
      .query("events")
      .withIndex("by_department", (q) => q.eq("departmentId", args.id))
      .first()
    if (inUse) return false
    await ctx.db.delete(args.id)
    return true
  },
})

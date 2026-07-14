import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("categories"),
      _creationTime: v.number(),
      name: v.string(),
      color: v.string(),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("categories").withIndex("by_name").take(200)
  },
})

export const create = mutation({
  args: { name: v.string(), color: v.string() },
  returns: v.id("categories"),
  handler: async (ctx, args) => {
    const name = args.name.trim()
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first()
    if (existing) return existing._id
    return await ctx.db.insert("categories", { name, color: args.color })
  },
})

/** Deletes a category. Returns false (and leaves it) if any events still use it. */
export const remove = mutation({
  args: { id: v.id("categories") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const inUse = await ctx.db
      .query("events")
      .withIndex("by_category", (q) => q.eq("categoryId", args.id))
      .first()
    if (inUse) return false
    await ctx.db.delete(args.id)
    return true
  },
})

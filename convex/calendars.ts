import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import type { MutationCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"

/** Keeps letters/numbers in any script, so "아이유" stays readable. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
}

async function uniqueSlug(
  ctx: MutationCtx,
  name: string,
  excludeId?: Id<"calendars">
): Promise<string> {
  const base = slugify(name) || "calendar"
  let slug = base
  for (let n = 2; ; n++) {
    const existing = await ctx.db
      .query("calendars")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first()
    if (!existing || existing._id === excludeId) return slug
    slug = `${base}-${n}`
  }
}

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("calendars"),
      _creationTime: v.number(),
      name: v.string(),
      color: v.string(),
      slug: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("calendars").withIndex("by_name").take(200)
  },
})

export const create = mutation({
  args: { name: v.string(), color: v.string() },
  returns: v.object({
    id: v.id("calendars"),
    slug: v.string(),
    // false when the name matched an existing calendar, which is
    // returned instead — callers surface that to the user.
    created: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const name = args.name.trim()
    const existing = await ctx.db
      .query("calendars")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first()
    if (existing) {
      // Rows from before slugs existed heal the first time they're reused.
      let slug = existing.slug
      if (!slug) {
        slug = await uniqueSlug(ctx, existing.name, existing._id)
        await ctx.db.patch(existing._id, { slug })
      }
      return { id: existing._id, slug, created: false }
    }
    const slug = await uniqueSlug(ctx, name)
    const id = await ctx.db.insert("calendars", {
      name,
      color: args.color,
      slug,
    })
    return { id, slug, created: true }
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
    const patch: { name?: string; color?: string; slug?: string } = {}
    if (name !== undefined) {
      const trimmed = name.trim()
      if (!trimmed) throw new Error("Name required")
      patch.name = trimmed
      // The URL follows the name; old links go stale, which is fine here.
      patch.slug = await uniqueSlug(ctx, trimmed, id)
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

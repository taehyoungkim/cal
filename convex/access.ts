import { v } from "convex/values"
import { internalMutation, query } from "./_generated/server"

const normalize = (code: string) => code.trim().toLowerCase()

export const verify = query({
  args: { code: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const match = await ctx.db
      .query("accessCodes")
      .withIndex("by_code", (q) => q.eq("code", normalize(args.code)))
      .unique()
    return match !== null
  },
})

/**
 * Adds an access code (idempotent). Not callable from clients — run it
 * from the dashboard or `bunx convex run access:setCode '{"code":"…"}'`.
 */
export const setCode = internalMutation({
  args: { code: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const code = normalize(args.code)
    const existing = await ctx.db
      .query("accessCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique()
    if (!existing) await ctx.db.insert("accessCodes", { code })
    return null
  },
})

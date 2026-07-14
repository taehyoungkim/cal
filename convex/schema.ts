import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  categories: defineTable({
    name: v.string(),
    color: v.string(),
  }).index("by_name", ["name"]),
  events: defineTable({
    title: v.string(),
    // A single point in time (epoch ms) — events have no duration.
    time: v.number(),
    details: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
  })
    .index("by_time", ["time"])
    .index("by_category", ["categoryId"]),
})

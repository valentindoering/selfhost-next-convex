import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  todos: defineTable({
    text: v.string(),
    isCompleted: v.boolean(),
    createdTime: v.optional(v.number()),
  }),
  messages: defineTable({
    role: v.union(v.literal("user"), v.literal("system")),
    content: v.string(),
    createdTime: v.number(),
  }).index("by_createdTime", ["createdTime"]),
  risk_messages: defineTable({
    role: v.union(v.literal("user"), v.literal("system")),
    content: v.string(),
    createdTime: v.number(),
  }).index("by_createdTime", ["createdTime"]),
  realtime_messages: defineTable({
    role: v.union(v.literal("user"), v.literal("system"), v.literal("tool")),
    content: v.string(),
    createdTime: v.number(),
  }).index("by_createdTime", ["createdTime"]),
});

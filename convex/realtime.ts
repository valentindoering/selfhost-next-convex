import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("realtime_messages").withIndex("by_createdTime").order("asc").collect();
  },
});

export const send = mutation({
  args: {
    content: v.string(),
    role: v.optional(v.union(v.literal("user"), v.literal("system"), v.literal("tool"))),
    createdTime: v.optional(v.number()),
    autoReply: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const role = args.role ?? "user";
    const now = args.createdTime ?? Date.now();
    await ctx.db.insert("realtime_messages", {
      role,
      content: args.content,
      createdTime: now,
    });

    // Only auto-reply for user-originated messages when not explicitly disabled
    if (role === "user" && args.autoReply !== false) {
      const reply = generateReply(args.content);
      await ctx.db.insert("realtime_messages", {
        role: "system",
        content: reply,
        createdTime: now + 1,
      });
    }
  },
});

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("realtime_messages").collect();
    for (const m of all) {
      await ctx.db.delete(m._id);
    }
  },
});

function generateReply(userContent: string): string {
  const trimmed = userContent.trim();
  if (!trimmed) return "I'm here in realtime! Ask me anything.";
  if (/hello|hi|hey/i.test(trimmed)) return "Hello from realtime! How can I help you instantly?";
  if (/realtime|live|instant/i.test(trimmed)) return "Yes, this is the realtime chat! Messages appear instantly.";
  if (/todo/i.test(trimmed)) return "You can manage todos on the Todos page, while chatting here in realtime.";
  return `Realtime response to: "${trimmed}"`;
}

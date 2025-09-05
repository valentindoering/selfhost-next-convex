import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("messages").withIndex("by_createdTime").order("asc").collect();
  },
});

export const send = mutation({
  args: { content: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("messages", {
      role: "user",
      content: args.content,
      createdTime: now,
    });

    // Simple system auto-reply
    const reply = generateReply(args.content);
    await ctx.db.insert("messages", {
      role: "system",
      content: reply,
      createdTime: now + 1,
    });
  },
});

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("messages").collect();
    for (const m of all) {
      await ctx.db.delete(m._id);
    }
  },
});

function generateReply(userContent: string): string {
  const trimmed = userContent.trim();
  if (!trimmed) return "I'm here! Ask me anything.";
  if (/hello|hi|hey/i.test(trimmed)) return "Hello! How can I help you today?";
  if (/todo/i.test(trimmed)) return "You can add, toggle, and remove todos on the Todos page.";
  return `You said: "${trimmed}"`;
}



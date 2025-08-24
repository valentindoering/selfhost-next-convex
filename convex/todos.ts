import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Query to get all todos
export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("todos").collect();
  },
});

// Query to get all todos sorted by creation time (newest first)
export const getByCreationTime = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("todos")
      .order("desc")
      .collect();
  },
});

// Mutation to create a new todo
export const create = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    const todoId = await ctx.db.insert("todos", {
      text: args.text,
      isCompleted: false,
      createdTime: Date.now(),
    });
    return todoId;
  },
});

// Mutation to toggle todo completion
export const toggle = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (!todo) {
      throw new Error("Todo not found");
    }
    await ctx.db.patch(args.id, {
      isCompleted: !todo.isCompleted,
    });
  },
});

// Mutation to delete a todo
export const remove = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

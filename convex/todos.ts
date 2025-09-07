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
  args: { 
    text: v.string(),
    needsResearch: v.optional(v.boolean()),
    context: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    console.log("=== TODO CREATE DEBUG ===");
    console.log("Text:", args.text);
    console.log("needsResearch:", args.needsResearch);
    console.log("context:", args.context);
    console.log("========================");
    
    const todoData = {
      text: args.text,
      isCompleted: false,
      createdTime: Date.now(),
      needsResearch: args.needsResearch || false,
      context: args.context,
    };
    
    console.log("About to insert todo with data:", todoData);
    
    const todoId = await ctx.db.insert("todos", todoData);
    
    console.log("Todo created with ID:", todoId);
    console.log("=== END DEBUG ===");
    
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

// Mutation to update todo text
export const update = mutation({
  args: { id: v.id("todos"), text: v.string() },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (!todo) throw new Error("Todo not found");
    await ctx.db.patch(args.id, { text: args.text });
  },
});

// Mutation to explicitly set completion state
export const setCompleted = mutation({
  args: { id: v.id("todos"), isCompleted: v.boolean() },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (!todo) throw new Error("Todo not found");
    await ctx.db.patch(args.id, { isCompleted: args.isCompleted });
  },
});

// Mutation to mark a todo as needing research and set context
export const markForResearch = mutation({
  args: { id: v.id("todos"), needsResearch: v.boolean(), context: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (!todo) throw new Error("Todo not found");
    await ctx.db.patch(args.id, { 
      needsResearch: args.needsResearch,
      context: args.context 
    });
  },
});

// Mutation to save research results for a todo
export const saveResearchResults = mutation({
  args: { id: v.id("todos"), researchResults: v.string() },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (!todo) throw new Error("Todo not found");
    await ctx.db.patch(args.id, { researchResults: args.researchResults });
  },
});

// Query to get todos that need research
export const getTodosNeedingResearch = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("todos")
      .filter((q) => q.eq(q.field("needsResearch"), true))
      .collect();
  },
});

// Mutation to update research data for a todo
export const updateResearchData = mutation({
  args: { id: v.id("todos"), researchData: v.any() },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (!todo) throw new Error("Todo not found");
    await ctx.db.patch(args.id, { 
      researchResults: JSON.stringify(args.researchData)
    });
  },
});

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Action to perform web research for a todo
export const performResearch = action({
  args: {
    todoId: v.id("todos"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("[ACTION performResearch] invoked", {
      todoId: args.todoId,
      query: args.query,
      time: Date.now(),
    });
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      console.log("[ACTION performResearch] calling app API /api/research", { baseUrl, query: args.query, todoId: args.todoId });
      const response = await fetch(`${baseUrl}/api/research`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: args.query, todoId: args.todoId }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "<no body>");
        console.error("[ACTION performResearch] API error", {
          status: response.status,
          statusText: response.statusText,
          errorText,
        });
        throw new Error(`API error: ${response.status}`);
      }

      const researchData = await response.json();
      

      // Update the todo with research data
      console.log("[ACTION performResearch] updating todo with researchData", {
        todoId: args.todoId,
        resultsCount: (researchData as { results?: unknown[] }).results?.length ?? 0,
      });
      await ctx.runMutation(api.todos.updateResearchData, {
        id: args.todoId,
        researchData,
      });
      console.log("[ACTION performResearch] todo updated", { todoId: args.todoId });

      return researchData;
    } catch (error) {
      console.error("[ACTION performResearch] failed", {
        todoId: args.todoId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error("Failed to perform research");
    }
  },
});

// Function to detect if a todo needs research based on keywords
export const detectResearchNeeds = (todoText: string): { needsResearch: boolean; context?: string } => {
  const researchKeywords = [
    "research", "investigate", "look up", "find out", "learn about",
    "understand", "study", "explore", "analyze", "compare",
    "what is", "how to", "why does", "when should", "where can"
  ];

  const lowerText = todoText.toLowerCase();
  
  for (const keyword of researchKeywords) {
    if (lowerText.includes(keyword)) {
      return {
        needsResearch: true,
        context: `Todo contains research keyword: "${keyword}". Full text: "${todoText}"`
      };
    }
  }

  return { needsResearch: false };
};
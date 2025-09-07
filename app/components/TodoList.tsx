"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";

// Function to detect if a todo needs research
const detectResearchNeeds = (todoText: string): { needsResearch: boolean; context?: string } => {
  const researchKeywords = [
    "research", "investigate", "look up", "find out", "learn about",
    "understand", "study", "explore", "analyze", "compare",
    "what is", "how to", "why does", "when should", "where can"
  ];

  const lowerText = todoText.toLowerCase();
  
  console.log("=== RESEARCH DETECTION DEBUG ===");
  console.log("Original text:", todoText);
  console.log("Lowercase text:", lowerText);
  console.log("Keywords to check:", researchKeywords);
  
  for (const keyword of researchKeywords) {
    console.log(`Checking keyword: "${keyword}"`);
    if (lowerText.includes(keyword)) {
      console.log(`✓ MATCH FOUND: "${keyword}"`);
      const result = {
        needsResearch: true,
        context: `Todo contains research keyword: "${keyword}". Full text: "${todoText}"`
      };
      console.log("Returning result:", result);
      console.log("=== END RESEARCH DETECTION DEBUG ===");
      return result;
    } else {
      console.log(`✗ No match for: "${keyword}"`);
    }
  }

  console.log("No research keywords found");
  console.log("=== END RESEARCH DETECTION DEBUG ===");
  return { needsResearch: false };
};

// Function to perform research
const performResearch = async (todoId: string, query: string) => {
  try {
    const response = await fetch('/api/research', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, todoId }),
    });

    if (!response.ok) {
      throw new Error('Research request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Research failed:', error);
    return null;
  }
};

export function TodoList() {
  const todos = useQuery(api.todos.get);
  const createTodo = useMutation(api.todos.create);
  const toggleTodo = useMutation(api.todos.toggle);
  const removeTodo = useMutation(api.todos.remove);
  const updateResearchData = useMutation(api.todos.updateResearchData);

  const [expandedIds, setExpandedIds] = useState<Set<Id<"todos">>>(new Set());
  const [resultsExpandedIds, setResultsExpandedIds] = useState<Set<Id<"todos">>>(new Set());

  const toggleExpanded = (id: Id<"todos">) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleResultsExpanded = (id: Id<"todos">) => {
    setResultsExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatDate = (ts?: number) => {
    if (!ts) return "N/A";
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return String(ts);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const text = formData.get("text") as string;
    
    if (text.trim()) {
      // Check if the todo needs research
      const researchNeeds = detectResearchNeeds(text.trim());
      
      console.log("=== FRONTEND DEBUG ===");
      console.log("Todo text:", text.trim());
      console.log("Research needs:", researchNeeds);
      console.log("=====================");
      
      // Create todo with research parameters
      const todoId = await createTodo({ 
        text: text.trim(),
        needsResearch: researchNeeds.needsResearch,
        context: researchNeeds.context
      });
      
      console.log("Todo created with ID:", todoId);
      
      // If research is needed, perform it automatically
      if (researchNeeds.needsResearch) {
        const researchResults = await performResearch(todoId as unknown as string, text.trim());
        if (researchResults) {
          await updateResearchData({
            id: todoId as Id<"todos">,
            researchData: researchResults,
          });
        }
      }

      form.reset();
    }
  };

  const handleToggle = async (id: Id<"todos">) => {
    await toggleTodo({ id });
  };

  const handleRemove = async (id: Id<"todos">) => {
    await removeTodo({ id });
  };

  if (todos === undefined) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Todos
      </h1>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            name="text"
            placeholder="Add a new todo..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add
          </button>
        </div>
      </form>

      <div className="space-y-2">
        {todos.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No todos yet. Add one above!</p>
        ) : (
          todos.map((todo) => {
            const hasResearch = (todo.researchResults && todo.researchResults.length > 0) ||
                               (todo.researchData && Object.keys(todo.researchData).length > 0);
            const needsResearch = todo.needsResearch && !hasResearch;
            const isExpanded = expandedIds.has(todo._id);
            const isResultsExpanded = resultsExpandedIds.has(todo._id);
            let parsedResearchResults: unknown = undefined;
            if (typeof todo.researchResults === "string") {
              try {
                parsedResearchResults = JSON.parse(todo.researchResults);
              } catch {
                parsedResearchResults = todo.researchResults;
              }
            }
            const hasResults = Boolean(todo.researchResults) || typeof parsedResearchResults !== "undefined";
            const researchObj: any = (todo.researchData && typeof todo.researchData === "object")
              ? todo.researchData
              : (typeof parsedResearchResults === "object" ? parsedResearchResults : null);
            
            return (
              <div
                key={todo._id}
                className={`p-3 border rounded-md ${
                  hasResearch ? "border-blue-300 bg-blue-50" : 
                  needsResearch ? "border-yellow-300 bg-yellow-50" : 
                  "border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggle(todo._id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      todo.isCompleted
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-gray-300 hover:border-green-500"
                    }`}
                  >
                    {todo.isCompleted && "✓"}
                  </button>
                  <span
                    className={`flex-1 ${
                      todo.isCompleted
                        ? "line-through text-gray-500"
                        : "text-gray-800"
                    }`}
                  >
                    {todo.text}
                  </span>

                  {hasResearch && (
                    <button
                      onClick={() => toggleResultsExpanded(todo._id)}
                      aria-expanded={isResultsExpanded}
                      className={`text-sm px-1 ${isResultsExpanded ? "text-blue-800" : "text-blue-600 hover:text-blue-800"}`}
                      title={isResultsExpanded ? "Hide research results" : "Show research results"}
                    >
                      🔍
                    </button>
                  )}
                  {needsResearch && (
                    <span className="text-yellow-600 text-sm" title="Research pending">
                      ⏳
                    </span>
                  )}

                  <button
                    onClick={() => toggleExpanded(todo._id)}
                    aria-expanded={isExpanded}
                    className="text-gray-500 hover:text-gray-700 px-2"
                    title={isExpanded ? "Collapse" : "Expand"}
                  >
                    {isExpanded ? "▴" : "▾"}
                  </button>

                  <button
                    onClick={() => handleRemove(todo._id)}
                    className="text-red-500 hover:text-red-700 px-2"
                  >
                    ✕
                  </button>
                </div>

                {isResultsExpanded && hasResults && (
                  <div className="mt-2 w-full rounded border border-blue-200 bg-blue-50 p-3 text-sm text-gray-700">
                    {researchObj && typeof researchObj === "object" && Array.isArray((researchObj as any).results) ? (
                      <div className="space-y-2">
                        {researchObj.summary && (
                          <div className="mb-1 text-gray-800">{researchObj.summary}</div>
                        )}
                        {(researchObj.results as any[]).map((r, idx) => (
                          <div key={idx} className="rounded border border-blue-100 bg-white p-2">
                            <div className="font-medium text-gray-900 text-sm">{r.title ?? "Untitled"}</div>
                            {r.url && (
                              <a
                                href={r.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline break-all"
                              >
                                {r.url}
                              </a>
                            )}
                            {r.content && (
                              <p className="mt-1 text-xs text-gray-700 whitespace-pre-wrap">{r.content}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <pre className="mt-1 max-h-64 overflow-auto rounded bg-gray-100 p-2 text-xs">
{JSON.stringify(parsedResearchResults ?? todo.researchResults ?? todo.researchData, null, 2)}
                      </pre>
                    )}
                  </div>
                )}

                {isExpanded && (
                  <div className="mt-2 w-full rounded border border-gray-200 bg-white p-3 text-sm text-gray-700">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <div className="text-gray-500">ID</div>
                        <div className="break-all">{String(todo._id)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Created</div>
                        <div>{formatDate(todo.createdTime)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Completed</div>
                        <div>{todo.isCompleted ? "Yes" : "No"}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Needs Research</div>
                        <div>{todo.needsResearch ? "Yes" : "No"}</div>
                      </div>
                      {typeof todo.researchScheduled !== "undefined" && (
                        <div>
                          <div className="text-gray-500">Research Scheduled</div>
                          <div>{todo.researchScheduled ? "Yes" : "No"}</div>
                        </div>
                      )}
                      {todo.context && (
                        <div className="sm:col-span-2">
                          <div className="text-gray-500">Context</div>
                          <div className="whitespace-pre-wrap">{todo.context}</div>
                        </div>
                      )}
                      {todo.researchContext && (
                        <div className="sm:col-span-2">
                          <div className="text-gray-500">Research Context</div>
                          <div className="whitespace-pre-wrap">{todo.researchContext}</div>
                        </div>
                      )}
                      {hasResults && (
                        <div className="sm:col-span-2">
                          <div className="text-gray-500">Research Results</div>
                          <pre className="mt-1 max-h-64 overflow-auto rounded bg-gray-50 p-2 text-xs">
{JSON.stringify(parsedResearchResults ?? todo.researchResults, null, 2)}
                          </pre>
                        </div>
                      )}
                      {typeof todo.researchData !== "undefined" && (
                        <div className="sm:col-span-2">
                          <div className="text-gray-500">Research Data</div>
                          <pre className="mt-1 max-h-64 overflow-auto rounded bg-gray-50 p-2 text-xs">
{JSON.stringify(todo.researchData, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

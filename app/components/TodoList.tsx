"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

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
        console.log("Performing research for todo:", todoId);
        const researchResults = await performResearch(todoId, text.trim());
        if (researchResults) {
          console.log("Research results:", researchResults);
          await updateResearchData({
            id: todoId,
            researchData: researchResults
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
            
            return (
              <div
                key={todo._id}
                className={`flex items-center gap-3 p-3 border rounded-md ${
                  hasResearch ? "border-blue-300 bg-blue-50" : 
                  needsResearch ? "border-yellow-300 bg-yellow-50" : 
                  "border-gray-200"
                }`}
              >
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
                
                {/* Research indicator */}
                {hasResearch && (
                  <span className="text-blue-600 text-sm" title="Research completed">
                    🔍
                  </span>
                )}
                {needsResearch && (
                  <span className="text-yellow-600 text-sm" title="Research pending">
                    ⏳
                  </span>
                )}
                
                <button
                  onClick={() => handleRemove(todo._id)}
                  className="text-red-500 hover:text-red-700 px-2"
                >
                  ✕
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

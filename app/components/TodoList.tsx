"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export function TodoList() {
  const todos = useQuery(api.todos.get);
  const createTodo = useMutation(api.todos.create);
  const toggleTodo = useMutation(api.todos.toggle);
  const removeTodo = useMutation(api.todos.remove);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const text = formData.get("text") as string;
    
    if (text.trim()) {
      await createTodo({ text: text.trim() });
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
        Todo App with Convex - selfhosted
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
          todos.map((todo) => (
            <div
              key={todo._id}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-md"
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
              <button
                onClick={() => handleRemove(todo._id)}
                className="text-red-500 hover:text-red-700 px-2"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

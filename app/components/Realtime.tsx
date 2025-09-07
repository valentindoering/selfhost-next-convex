"use client";
import { useConvex, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { RealtimeAgent, RealtimeSession, tool } from "@openai/agents-realtime";
import { z } from "zod";

export default function Realtime() {
  const messages = useQuery(api.realtime.list);
  const send = useMutation(api.realtime.send);
  const createTodo = useMutation(api.todos.create);
  const removeTodo = useMutation(api.todos.remove);
  const toggleTodo = useMutation(api.todos.toggle);
  const updateTodo = useMutation(api.todos.update);
  const setCompleted = useMutation(api.todos.setCompleted);
  const updateResearchData = useMutation(api.todos.updateResearchData);
  const convex = useConvex();
  const clearAll = useMutation(api.realtime.clearAll);
  const formRef = useRef<HTMLFormElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Local Realtime session state
  const [session, setSession] = useState<RealtimeSession | null>(null);
  const [connected, setConnected] = useState(false);
  const persistedIdsRef = useRef<Set<string>>(new Set());

  const agent = useMemo(() => {
    const addTodoParams = z.object({ 
      text: z.string().min(1).max(200),
      needsResearch: z.boolean().nullable(),
      context: z.string().nullable()
    });
    const addTodoTool = tool<typeof addTodoParams>({
      name: "add_todo",
      description: "Add a todo item to the list. Set needsResearch to true if the todo requires research or investigation, and provide context explaining why research is needed.",
      parameters: addTodoParams,
      needsApproval: false,
      execute: async ({ text, needsResearch, context }) => {
        // Mirror user's spoken/intent into chat for context
        await send({ content: text, role: "user", autoReply: false, createdTime: Date.now() });
        // Create todo directly via Convex mutation with research parameters
        const todoId = await createTodo({ text, needsResearch: needsResearch || undefined, context: context || undefined });
        
        // If research is needed, trigger it automatically
        if (needsResearch) {
          try {
            console.log(`Triggering research for todo: ${todoId}`);
            const response = await fetch('/api/research', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ query: text, todoId }),
            });

            if (response.ok) {
              const researchResults = await response.json();
              console.log('Research results received:', researchResults);
              await updateResearchData({
                id: todoId,
                researchData: researchResults
              });
              await send({ 
                content: `Research completed for "${text}". Found ${researchResults.results.length} results.`,
                role: "system", 
                autoReply: false, 
                createdTime: Date.now() 
              });
            } else {
              console.error('Research failed:', response.statusText);
              await send({ 
                content: `Research failed for "${text}": ${response.statusText}`,
                role: "system", 
                autoReply: false, 
                createdTime: Date.now() 
              });
            }
          } catch (error) {
            console.error('Research error:', error);
            await send({ 
              content: `Research error for "${text}": ${error instanceof Error ? error.message : 'Unknown error'}`,
              role: "system", 
              autoReply: false, 
              createdTime: Date.now() 
            });
          }
        }
        
        const researchNote = needsResearch ? " (research started)" : "";
        return `Added todo: ${text}${researchNote}`;
      },
    });

    const emptyParams = z.object({});
    const listTodosTool = tool<typeof emptyParams>({
      name: "list_todos",
      description: "Fetch current todos",
      parameters: emptyParams,
      needsApproval: false,
      execute: async () => {
        const todos = await convex.query(api.todos.get, {} as any);
        if (!todos || todos.length === 0) return "No todos yet.";
        // Provide IDs so the agent can act on follow-up requests
        const lines = todos
          .map((t: any) => `- ${t._id}: ${t.text} ${t.isCompleted ? "[done]" : "[todo]"}`)
          .join("\n");
        return `Current todos with IDs:\n${lines}`;
      },
    });

    const deleteParams = z.object({ id: z.string() });
    const deleteTodoTool = tool<typeof deleteParams>({
      name: "delete_todo",
      description: "Delete a todo by id",
      parameters: deleteParams,
      needsApproval: false,
      execute: async ({ id }) => {
        // Id comes as string; Convex generated types allow string for runtime
        await removeTodo({ id: id as any });
        return `Deleted todo ${id}`;
      },
    });

    const updateParams = z.object({ id: z.string(), text: z.string().min(1).max(200) });
    const updateTodoTool = tool<typeof updateParams>({
      name: "update_todo",
      description: "Update the text of a todo",
      parameters: updateParams,
      needsApproval: false,
      execute: async ({ id, text }) => {
        await updateTodo({ id: id as any, text });
        return `Updated todo ${id}`;
      },
    });

    const checkParams = z.object({ id: z.string(), done: z.boolean() });
    const checkTodoTool = tool<typeof checkParams>({
      name: "check_todo",
      description: "Mark a todo as completed (or uncompleted if done=false)",
      parameters: checkParams,
      needsApproval: false,
      execute: async ({ id, done }) => {
        await setCompleted({ id: id as any, isCompleted: done });
        return `Updated completion for ${id}`;
      },
    });

    const toggleParams = z.object({ id: z.string() });
    const toggleTodoTool = tool<typeof toggleParams>({
      name: "toggle_todo",
      description: "Toggle a todo's completion state by id",
      parameters: toggleParams,
      needsApproval: false,
      execute: async ({ id }) => {
        await toggleTodo({ id: id as any });
        return `Toggled completion for ${id}`;
      },
    });
    return new RealtimeAgent({
      name: "Assistant",
      instructions: "You can manage todos. Prefer calling list_todos first to retrieve IDs, then use delete_todo/update_todo/check_todo/toggle_todo with those IDs.",
      tools: [addTodoTool, listTodosTool, deleteTodoTool, updateTodoTool, checkTodoTool, toggleTodoTool],
    });
  }, [send, convex, createTodo, removeTodo, toggleTodo, updateTodo, setCompleted]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const content = (formData.get("content") as string) ?? "";
    if (!content.trim()) return;
    if (session && connected) {
      session.sendMessage({
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: content.trim() }],
      });
    }
    // Persist user message in Convex (no auto-reply from simple generator)
    await send({ content: content.trim(), role: "user", autoReply: false, createdTime: Date.now() });
    form.reset();
  };

  async function connectRealtime() {
    if (connected || session) return;
    try {
      const res = await fetch("/api/realtime-token");
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Failed to get realtime token");
      }
      const { token } = await res.json();
      if (!token) {
        throw new Error("Missing token in response");
      }
      const s = new RealtimeSession(agent, {
        config: {
          outputModalities: ["text"],
        },
      });
      // Persist assistant completions into Convex
      const persistAssistantIfNeeded = async () => {
        for (const item of s.history) {
          // Only assistant messages with text/transcript and not yet persisted
          if ((item as any).type === "message" && (item as any).role === "assistant" && (item as any).status === "completed") {
            const id = (item as any).itemId as string;
            if (!persistedIdsRef.current.has(id)) {
              const content = (item as any).content?.find((c: any) => c.type === "output_text")?.text
                || (item as any).content?.find((c: any) => c.type === "output_audio")?.transcript
                || "";
              if (content) {
                persistedIdsRef.current.add(id);
                await send({ content, role: "system", autoReply: false, createdTime: Date.now() });
              }
            }
          }
        }
      };
      s.on("history_updated", persistAssistantIfNeeded);
      s.on("history_added", persistAssistantIfNeeded);
      s.on("transport_event", (event: any) => {
        if (event?.type === "conversation.item.input_audio_transcription.completed") {
          const id = event.item_id as string;
          const transcript = event.transcript as string;
          if (transcript && !persistedIdsRef.current.has(id)) {
            persistedIdsRef.current.add(id);
            // Persist user transcript
            send({ content: transcript, role: "user", autoReply: false, createdTime: Date.now() });
          }
        }
        if (event?.type === "connection_change") {
          setConnected(event.status === "connected");
        }
      });

      await s.connect({ apiKey: token, model: "gpt-realtime" });
      setSession(s);
      setConnected(true);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="min-h-[70vh] max-w-md mx-auto bg-white rounded-lg shadow-md p-4 flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          Realtime
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </div>
        <div className="flex items-center gap-2">
          <button
            title={connected ? "Connected" : "Connect"}
            onClick={() => connectRealtime()}
            className={`px-3 py-1 rounded-md text-white ${connected ? "bg-gray-400 cursor-default" : "bg-green-600 hover:bg-green-700"}`}
            disabled={connected}
          >
            {connected ? "Connected" : "Connect"}
          </button>
        <button
          title="Clear all"
          onClick={() => clearAll({}).catch(() => {})}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Clear all messages"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M9 3.75A.75.75 0 0 1 9.75 3h4.5a.75.75 0 0 1 .75.75V6h4.25a.75.75 0 0 1 0 1.5h-.82l-1.1 11.01A2.25 2.25 0 0 1 15.09 21H8.91a2.25 2.25 0 0 1-2.24-2.49L5.57 7.5h-.82a.75.75 0 0 1 0-1.5H9V3.75ZM7.1 7.5l1.06 10.6a.75.75 0 0 0 .75.68h6.18a.75.75 0 0 0 .75-.68L16.9 7.5H7.1ZM10.5 9.75a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0v-6a.75.75 0 0 1 .75-.75Zm4.5.75a.75.75 0 0 0-1.5 0v6a.75.75 0 0 0 1.5 0v-6Z" clipRule="evenodd" />
          </svg>
        </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {messages === undefined ? (
          <div className="text-gray-500">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="text-gray-500">No messages yet. Start a realtime conversation!</div>
        ) : (
          messages.map((m) => (
            <div key={m._id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`rounded-2xl px-4 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {m.content}
                </div>
                <div className="mt-1 text-[10px] leading-none text-gray-500">
                  {new Date(m.createdTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
      <form ref={formRef} onSubmit={onSubmit} className="mt-3 flex gap-2">
        <input
          name="content"
          placeholder="Type a realtime message"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          Send
        </button>
      </form>
    </div>
  );
}

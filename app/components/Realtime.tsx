"use client";
import { useConvex, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
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
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showChat, setShowChat] = useState(false);
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
        await send({ content: `add_todo(text=${JSON.stringify(text)})`, role: "tool", autoReply: false, createdTime: Date.now() });
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
        const result = `Added todo: ${text}${researchNote}`;
        await send({ content: result, role: "tool", autoReply: false, createdTime: Date.now() });
        return result;
      },
    });

    const emptyParams = z.object({});
    const listTodosTool = tool<typeof emptyParams>({
      name: "list_todos",
      description: "Fetch current todos",
      parameters: emptyParams,
      needsApproval: false,
      execute: async () => {
        await send({ content: `list_todos()`, role: "tool", autoReply: false, createdTime: Date.now() });
        const todos = await convex.query(api.todos.get, {});
        if (!todos || todos.length === 0) return "No todos yet.";
        // Provide IDs so the agent can act on follow-up requests
        const lines = todos
          .map((t: Doc<"todos">) => `- ${t._id}: ${t.text} ${t.isCompleted ? "[done]" : "[todo]"}`)
          .join("\n");
        const result = `Current todos with IDs:\n${lines}`;
        await send({ content: result, role: "tool", autoReply: false, createdTime: Date.now() });
        return result;
      },
    });

    const deleteParams = z.object({ id: z.string() });
    const deleteTodoTool = tool<typeof deleteParams>({
      name: "delete_todo",
      description: "Delete a todo by id",
      parameters: deleteParams,
      needsApproval: false,
      execute: async ({ id }) => {
        await send({ content: `delete_todo(id=${id})`, role: "tool", autoReply: false, createdTime: Date.now() });
        await removeTodo({ id: id as Id<"todos"> });
        const result = `Deleted todo ${id}`;
        await send({ content: result, role: "tool", autoReply: false, createdTime: Date.now() });
        return result;
      },
    });

    const updateParams = z.object({ id: z.string(), text: z.string().min(1).max(200) });
    const updateTodoTool = tool<typeof updateParams>({
      name: "update_todo",
      description: "Update the text of a todo",
      parameters: updateParams,
      needsApproval: false,
      execute: async ({ id, text }) => {
        await send({ content: `update_todo(id=${id}, text=${JSON.stringify(text)})`, role: "tool", autoReply: false, createdTime: Date.now() });
        await updateTodo({ id: id as Id<"todos">, text });
        const result = `Updated todo ${id}`;
        await send({ content: result, role: "tool", autoReply: false, createdTime: Date.now() });
        return result;
      },
    });

    const checkParams = z.object({ id: z.string(), done: z.boolean() });
    const checkTodoTool = tool<typeof checkParams>({
      name: "check_todo",
      description: "Mark a todo as completed (or uncompleted if done=false)",
      parameters: checkParams,
      needsApproval: false,
      execute: async ({ id, done }) => {
        await send({ content: `check_todo(id=${id}, done=${done})`, role: "tool", autoReply: false, createdTime: Date.now() });
        await setCompleted({ id: id as Id<"todos">, isCompleted: done });
        const result = `Updated completion for ${id}`;
        await send({ content: result, role: "tool", autoReply: false, createdTime: Date.now() });
        return result;
      },
    });

    const toggleParams = z.object({ id: z.string() });
    const toggleTodoTool = tool<typeof toggleParams>({
      name: "toggle_todo",
      description: "Toggle a todo's completion state by id",
      parameters: toggleParams,
      needsApproval: false,
      execute: async ({ id }) => {
        await send({ content: `toggle_todo(id=${id})`, role: "tool", autoReply: false, createdTime: Date.now() });
        await toggleTodo({ id: id as Id<"todos"> });
        const result = `Toggled completion for ${id}`;
        await send({ content: result, role: "tool", autoReply: false, createdTime: Date.now() });
        return result;
      },
    });
    return new RealtimeAgent({
      name: "Meeting Action Items Tracker",
      instructions:
        [
          "You are a silent background agent running during a live meeting.",
          "Your job is to capture action items as todos and keep the list up to date.",
          "NEVER speak back, greet, narrate, or produce user-facing text.",
          "Work only by calling tools.",
          "Behavior:",
          "- First call list_todos to get current IDs and states.",
          "- When you hear a new action item, add_todo with a concise, actionable text.",
          "- If a mentioned action matches an existing todo, update_todo to refine wording.",
          "- If an action is confirmed as done, check_todo(done=true). If reopened, check_todo(done=false).",
          "- If a task is explicitly canceled, delete_todo.",
          "- Prefer single-source-of-truth updates (IDs from list_todos).",
          "- Avoid duplicates: compare semantically with existing todos first.",
          "- Keep todos short, imperative, and self-contained (who/what/when if spoken).",
          "- Do not ask for confirmation; act autonomously.",
        ].join("\n"),
      tools: [addTodoTool, listTodosTool, deleteTodoTool, updateTodoTool, checkTodoTool, toggleTodoTool],
    });
  }, [send, convex, createTodo, removeTodo, toggleTodo, updateTodo, setCompleted, updateResearchData]);

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
      setConnecting(true);
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
        const history = Array.isArray(s.history) ? (s.history as unknown[]) : [];
        for (const item of history) {
          if (!item || typeof item !== "object") continue;
          const obj = item as Record<string, unknown>;
          const isAssistantMessage = obj.type === "message" && obj.role === "assistant" && obj.status === "completed";
          const id = typeof obj.itemId === "string" ? obj.itemId : undefined;
          if (!isAssistantMessage || !id) continue;
          if (persistedIdsRef.current.has(id)) continue;
          let content = "";
          const contentArray = Array.isArray(obj.content) ? (obj.content as unknown[]) : [];
          for (const c of contentArray) {
            if (!c || typeof c !== "object") continue;
            const co = c as Record<string, unknown>;
            if (co.type === "output_text" && typeof co.text === "string") { content = co.text; break; }
            if (co.type === "output_audio" && typeof co.transcript === "string") { content = co.transcript; break; }
          }
          if (content) {
            persistedIdsRef.current.add(id);
            await send({ content, role: "system", autoReply: false, createdTime: Date.now() });
          }
        }
      };
      s.on("history_updated", persistAssistantIfNeeded);
      s.on("history_added", persistAssistantIfNeeded);
      s.on("transport_event", (event: unknown) => {
        if (event && typeof event === "object") {
          const ev = event as Record<string, unknown>;
          if (ev.type === "conversation.item.input_audio_transcription.completed") {
            const id = typeof ev.item_id === "string" ? ev.item_id : undefined;
            const transcript = typeof ev.transcript === "string" ? ev.transcript : undefined;
            if (id && transcript && !persistedIdsRef.current.has(id)) {
              persistedIdsRef.current.add(id);
              send({ content: transcript, role: "user", autoReply: false, createdTime: Date.now() });
            }
          }
          if (ev.type === "connection_change") {
            const status = typeof ev.status === "string" ? ev.status : undefined;
            if (status) setConnected(status === "connected");
          }
        }
      });

      await s.connect({ apiKey: token, model: "gpt-realtime" });
      setSession(s);
      setConnected(true);
    } catch (e) {
      console.error(e);
    } finally {
      setConnecting(false);
    }
  }

  async function disconnectRealtime() {
    if (!session || !connected) return;
    try {
      setDisconnecting(true);
      session.close();
      setSession(null);
      setConnected(false);
      persistedIdsRef.current.clear();
    } catch (e) {
      console.error(e);
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-4 flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          Realtime
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        </div>
        <div className="flex items-center gap-2">
          {!connected ? (
            <button
              title="Connect"
              onClick={() => connectRealtime()}
              className={`px-3 py-1 rounded-md text-white ${connecting ? "bg-blue-400 cursor-wait" : "bg-blue-600 hover:bg-blue-700"}`}
              disabled={connecting}
            >
              {connecting ? "Connecting..." : "Connect"}
            </button>
          ) : (
            <button
              title="Disconnect"
              onClick={() => disconnectRealtime()}
              className={`px-3 py-1 rounded-md text-white ${disconnecting ? "bg-gray-400 cursor-wait" : "bg-gray-600 hover:bg-gray-700"}`}
              disabled={disconnecting}
            >
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
          )}
          <button
            title={showChat ? "Hide agent log" : "Show agent log"}
            onClick={() => setShowChat((v) => !v)}
            className="px-3 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {showChat ? "Hide Log" : "Show Log"}
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
      {showChat && (
        <>
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
                      className={`rounded-3xl px-4 py-2 text-sm ${
                        {
                          user: "bg-blue-500 text-white font-bold",
                          system: "text-gray-800",
                          tool: "text-gray-500"
                        }[m.role]
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
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Send
            </button>
          </form>
        </>
      )}
    </div>
  );
}

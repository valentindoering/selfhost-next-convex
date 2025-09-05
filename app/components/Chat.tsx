"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useRef } from "react";

export default function Chat() {
  const messages = useQuery(api.chat.list);
  const send = useMutation(api.chat.send);
  const clearAll = useMutation(api.chat.clearAll);
  const formRef = useRef<HTMLFormElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const content = (formData.get("content") as string) ?? "";
    if (!content.trim()) return;
    await send({ content: content.trim() });
    form.reset();
  };

  return (
    <div className="min-h-[70vh] max-w-md mx-auto bg-white rounded-lg shadow-md p-4 flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xl font-semibold text-gray-800">Chat</div>
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
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {messages === undefined ? (
          <div className="text-gray-500">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="text-gray-500">No messages yet. Say hello!</div>
        ) : (
          messages.map((m) => (
            <div key={m._id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`rounded-2xl px-4 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-blue-500 text-white"
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
          placeholder="Type a message"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Send
        </button>
      </form>
    </div>
  );
}



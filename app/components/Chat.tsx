"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useRef } from "react";

export default function Chat() {
  const messages = useQuery(api.chat.list);
  const send = useMutation(api.chat.send);
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
      <div className="text-xl font-semibold text-gray-800 mb-3">Chat</div>
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



"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SidebarNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
            className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M3.75 6.75A.75.75 0 0 1 4.5 6h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Zm0 5.25a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Zm.75 4.5a.75.75 0 0 0 0 1.5h15a.75.75 0 0 0 0-1.5h-15Z" clipRule="evenodd" />
            </svg>
          </button>
          <Link href="/todos" className="font-semibold text-gray-800">Todo + Chat</Link>
          <div className="w-8" />
        </div>
      </header>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white border-r border-gray-200 shadow-lg transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="px-4 py-3 flex items-center justify-between border-b">
          <span className="font-semibold text-gray-800">Navigation</span>
          <button
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <nav className="p-2">
          <Link
            href="/todos"
            className={`block rounded-md px-3 py-2 text-sm font-medium ${
              pathname === "/todos" ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            Todos
          </Link>
          <Link
            href="/chat"
            className={`block rounded-md px-3 py-2 text-sm font-medium ${
              pathname === "/chat" ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            Chat
          </Link>
          <Link
            href="/risk"
            className={`block rounded-md px-3 py-2 text-sm font-medium ${
              pathname === "/risk" ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            Risk Game
          </Link>
        </nav>
      </aside>
    </>
  );
}



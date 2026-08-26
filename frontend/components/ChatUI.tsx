"use client";

import { useState } from "react";

interface Msg {
  role: "user" | "assistant";
  text: string;
}

/**
 * Role-aware AI assistant shell. For now it echoes a grounded placeholder
 * response and clearly states it will query live backend data in Phase 9/10.
 * It never fabricates electricity status.
 */
export default function ChatUI({
  roleLabel,
  suggestions,
}: {
  roleLabel: string;
  suggestions: string[];
}) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: `Hi — I'm LT-FaultX AI (${roleLabel} mode). I answer using live backend data only. Backend querying is wired in a later phase, so for now I'll acknowledge your question without inventing any status.`,
    },
  ]);
  const [input, setInput] = useState("");

  function send(text: string) {
    const q = text.trim();
    if (!q) return;
    setMessages((m) => [
      ...m,
      { role: "user", text: q },
      {
        role: "assistant",
        text: "Noted. Once connected to the backend, I'll fetch this from live system data rather than guessing. I won't invent electricity, fault, or restoration status.",
      },
    ]);
    setInput("");
  }

  return (
    <div className="card flex h-[60vh] flex-col p-0">
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={[
                "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                m.role === "user"
                  ? "bg-brand-500 text-ink-950"
                  : "border border-brand-500/20 bg-ink-950/50 text-brand-100/80",
              ].join(" ")}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-brand-500/10 p-3">
        <div className="mb-2 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s} onClick={() => send(s)} className="btn-ghost text-xs">
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask LT-FaultX AI…"
            className="flex-1 rounded-lg border border-brand-500/20 bg-ink-950/60 px-3 py-2 text-sm text-brand-50 placeholder:text-brand-100/30 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <button type="submit" className="btn-primary text-sm">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

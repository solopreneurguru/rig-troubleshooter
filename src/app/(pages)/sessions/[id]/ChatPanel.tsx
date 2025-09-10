"use client";
import React from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt?: string;
};

export default function ChatPanel({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function load() {
    setErr(null);
    try {
      const r = await fetch(`/api/chat/${sessionId}`, { cache: "no-store", signal: AbortSignal.timeout(9000) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setMessages(j.messages || []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load chat");
    }
  }

  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/chat/post`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, role: "user", text }),
        signal: AbortSignal.timeout(9000),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setText("");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Failed to send");
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => {
    load();
    const t = setInterval(load, 7000);
    return () => clearInterval(t);
  }, [sessionId]);

  return (
    <div className="h-full flex flex-col border border-neutral-800 rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-neutral-900 border-b border-neutral-800 text-sm font-medium">
        Session Chat
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && <div className="text-xs opacity-70">No messages yet. Start the conversation.</div>}
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <div className="opacity-60 mb-0.5">{m.role === "user" ? "You" : "Assistant"}</div>
            <div className="whitespace-pre-wrap rounded bg-neutral-900 p-2 border border-neutral-800">
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-neutral-800">
        {err && <div className="text-red-400 text-xs mb-1">❌ {err}</div>}
        <div className="flex gap-2">
          <textarea
            className="flex-1 rounded bg-neutral-900 p-2 text-sm"
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe what you see, attach steps, or ask a question…"
          />
          <button
            type="button"
            disabled={busy || !text.trim()}
            onClick={send}
            className="self-end px-3 py-2 rounded bg-emerald-700 text-sm disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send"}
          </button>
        </div>
        <div className="text-[10px] mt-2 opacity-60">
          Safety: never energize or open panels without authorization and PPE. Confirm hazards in the step runner.
        </div>
      </div>
    </div>
  );
}

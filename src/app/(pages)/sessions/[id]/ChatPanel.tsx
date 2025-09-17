"use client";
import React from "react";

import { ChatMessage, listMessages, sendMessage } from '@/lib/chat';

interface Props {
  sessionId: string;
  onMessageCountChange?: (count: number) => void;
  uploadComponent?: React.ReactNode;
}

export default function ChatPanel({ sessionId, onMessageCountChange, uploadComponent }: Props) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // Debug logging and sessionId validation
  React.useEffect(() => {
    onMessageCountChange?.(messages.length);
  }, [messages.length, onMessageCountChange]);

  async function load() {
    setErr(null);
    try {
      const messages = await listMessages(sessionId);
      setMessages(messages);
    } catch (e: any) {
      setErr(e?.message || "Failed to load chat");
      // Show non-blocking error banner
      console.error("Chat history unavailable:", e);
    }
  }

  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      // Send user message
      await sendMessage(sessionId, 'user', text);
      setText("");
      await load();

      // Compose recent messages (limit to last 10 for token economy)
      const recent = [...messages, { role:'user', content:text }].slice(-10).map(m => ({
        role: m.role as 'system'|'user'|'assistant',
        content: m.content
      }));

      try {
        const res = await fetch('/api/ai/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, messages: recent })
        });
        const j = await res.json();
        if (res.ok && j?.ok && j?.content) {
          // append assistant reply to local state
          setMessages(prev => [...prev, { role:'assistant', content: j.content }]);
        } else {
          // non-fatal; UI already displays our saved fallback from the API route
        }
      } catch {
        // swallow: we already saved a fallback server-side
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to send");
      // Show non-blocking error banner
      console.error("Failed to send chat message:", e);
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
      <div className="px-3 py-2 bg-yellow-900/20 border-b border-yellow-700/30 text-xs text-yellow-200">
        ⚠️ <strong>Safety:</strong> Never energize equipment or open panels without proper authorization, LOTO procedures, and PPE. Always confirm hazards in the step runner.
      </div>
      {err && (
        <div className="px-3 py-2 bg-red-900/20 border-b border-red-700/30 text-xs text-red-200">
          ⚠️ Chat history unavailable (server error). Continue and we'll store messages when back online.
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && <div className="text-xs opacity-70">No messages yet. Start the conversation.</div>}
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <div className="opacity-60 mb-0.5">{m.role === "user" ? "You" : "Assistant"}</div>
            <div className="whitespace-pre-wrap rounded bg-neutral-900 p-2 border border-neutral-800">
              {m.content}
            </div>
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-neutral-800">
        {err && <div className="text-red-400 text-xs mb-1">❌ {err}</div>}
        {!sessionId && <div className="text-red-400 text-xs mb-1">❌ No session id</div>}
        <div className="flex gap-2">
          <textarea
            className="flex-1 rounded bg-neutral-900 p-2 text-sm"
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe what you see, attach steps, or ask a question…"
          />
          <div className="flex flex-col gap-2">
            {uploadComponent}
            <button
              type="button"
              disabled={busy || !text.trim() || !sessionId}
              onClick={send}
              className="self-end px-3 py-2 rounded bg-emerald-700 text-sm disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
        <div className="text-[10px] mt-2 opacity-60">
          Safety: never energize or open panels without authorization and PPE. Confirm hazards in the step runner.
        </div>
      </div>
    </div>
  );
}

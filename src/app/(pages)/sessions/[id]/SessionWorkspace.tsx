"use client";
import { useState, useCallback, useEffect, useRef } from "react";

// helper to persist an outgoing message (safe if API missing)
async function persistOutgoingMessage(sessionId: string, msg: { role: string; text: string; docMeta?: any }) {
  try {
    await fetch(`/api/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    });
  } catch {}
}

// helper to load messages and hydrate UI if addMessage exists
async function hydrateMessages(sessionId: string, addMessage?: (m: any) => void) {
  try {
    const res = await fetch(`/api/sessions/${sessionId}/messages?limit=50`, { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (data?.ok && Array.isArray(data.items) && addMessage) {
      data.items.forEach((m: any) => addMessage({ role: m.role || "assistant", text: m.text || "" }));
    }
  } catch {}
}
import ChatBubble from "./ChatBubble";
import DocsPanel from "./DocsPanel";
import ReportComposer from "./ReportComposer";
import UploadFromChat from "./UploadFromChat";
import "./ChatMessageList.css";

function TypingDots() {
  return (
    <div className="typing">
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
    </div>
  );
}

interface Props {
  sessionId: string;
  equipmentId?: string;
}

export default function SessionWorkspace({ sessionId, equipmentId }: Props) {
  const [showDocs, setShowDocs] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [reportDraft, setReportDraft] = useState<any>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  
  // Initialize from server data once when sessionId changes
  useEffect(() => {
    const initial = (sessionData?.messages ?? [])
      .map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        text: m.text ?? m.content ?? "",
      }))
      .filter((m: any) => m.text && m.text.trim().length > 0);
    setMessages(initial);
  }, [sessionId]); // IMPORTANT: only sessionId dependency

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => { scrollToBottom(); });

  // Load session data for equipment context
  const loadSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load session");
      }
      setSessionData(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load session");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Load and hydrate messages
  useEffect(() => {
    if (sessionId) hydrateMessages(sessionId, (m: any) => {
      setMessages(prev => [...prev, { role: m.role || "assistant", text: m.text || "" }]);
    });
  }, [sessionId]);

  const handleFinishSession = useCallback(async () => {
    try {
      const res = await fetch("/api/reports/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to compose report");
      }

      setReportDraft(data.draft);
      setShowReport(true);
    } catch (e: any) {
      alert(e?.message || "Failed to compose report");
    }
  }, [sessionId]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;

    // Optimistic user bubble
    setMessages(prev => [...prev, { role: "user", text }]);
    setDraft("");
    setIsTyping(true);

    try {
      const r = await fetch(`/api/sessions/${sessionId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });

      let replyText = "";
      try {
        const data = await r.json();
        // Be defensive about the shape
        replyText =
          typeof data === "string" ? data :
          data?.reply ?? data?.text ?? data?.message ?? "";
      } catch {
        // If not JSON (unexpected), read as text
        replyText = await r.text();
      }
      replyText = (replyText || "").toString().trim();

      // Append assistant bubble (even if empty, but show something helpful)
      setMessages(prev => [
        ...prev,
        { role: "assistant", text: replyText || "Hmm, I didn't get a response. Try again?" },
      ]);

      // (Optional) fire-and-forget transcript append; do not await
      if (sessionId && replyText) {
        fetch(`/api/chats/${sessionId}/append-text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ who: "ASSISTANT", text: replyText }),
        }).catch(() => {});
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", text: "Network error while sending. Please try again." },
      ]);
    } finally {
      setIsTyping(false);
      scrollToBottom();
    }
  }, [sessionId, draft]);

  // Helper to either append text or auto-send
  const insertOrSend = useCallback((snippet: string) => {
    if (isTyping) return; // locked while streaming/sending
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      // empty box: insert + auto-send
      setDraft(snippet);
      // wait for state flush: schedule send on next tick
      setTimeout(() => handleSend(), 0);
    } else {
      // append into the input without sending
      setDraft(prev => (prev.endsWith(" ") || prev.length === 0) ? prev + snippet : prev + " " + snippet);
    }
  }, [draft, isTyping, handleSend]);

  return (
    <div className="h-[calc(100vh-112px)] flex">
      {/* Left: chat column */}
      <section className="flex-1 flex flex-col border-r border-neutral-900">
        {/* Top Bar */}
        <div className="flex flex-col px-4 py-2 border-b border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDocs(!showDocs)}
                className="lg:hidden px-2 py-1 text-sm text-neutral-400 hover:text-neutral-300"
              >
                {showDocs ? "Hide" : "Show"} Docs
              </button>
            </div>
            <button
              onClick={handleFinishSession}
              disabled={messages.length === 0}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 text-sm"
            >
              Finish Session
            </button>
          </div>

          {/* Equipment context */}
          {sessionData?.session?.equipment && (
            <div className="mt-1 mb-3 text-sm text-gray-300 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-neutral-800/70">
                {sessionData.session.equipment.name || "Unnamed Equipment"}
              </span>
              {sessionData.session.equipment.type && <span>• {sessionData.session.equipment.type}</span>}
              {sessionData.session.equipment.serial && <span>• S/N {sessionData.session.equipment.serial}</span>}
              {sessionData.session.equipment.id && (
                <a
                  className="underline decoration-dotted hover:opacity-80"
                  href={`https://airtable.com/${process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID}/${process.env.NEXT_PUBLIC_TABLE_EQUIPINSTANCES}?records=${sessionData.session.equipment.id}`}
                  target="_blank" rel="noreferrer"
                >
                  open in Airtable
                </a>
              )}
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col relative">
          {/* Messages */}
          <div id="chat-scroll" className="flex-1 overflow-y-auto px-4 pt-4 pb-28">
            {messages.length === 0 ? (
              <div className="mt-6 text-sm text-neutral-500">
                No messages yet. Start the conversation.
              </div>
            ) : (
              messages.map((m, i) => (
                <ChatBubble key={i} role={m.role} text={m.text} />
              ))
            )}
            {isTyping && (
              <div className="text-xs text-neutral-500 px-1 mt-1">Assistant is typing…</div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="sticky bottom-0 inset-x-0 border-t border-neutral-800/60 bg-neutral-950/85 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/75"
          >
            <div className="px-4 py-3 space-y-2">
              {/* Quick checks */}
              <div className="flex flex-wrap gap-2 text-xs text-neutral-400">
                <span className="opacity-80">Quick checks (optional)</span>
                <button type="button" className="chip" onClick={() => setDraft(prev => prev + (prev ? "\n" : "") + "Check current mode")}>Check current mode</button>
                <button type="button" className="chip" onClick={() => setDraft(prev => prev + (prev ? "\n" : "") + "Read commanded vs actual RPM")}>Read commanded vs actual RPM</button>
                <button type="button" className="chip" onClick={() => setDraft(prev => prev + (prev ? "\n" : "") + "List recent parameter changes")}>List recent parameter changes</button>
                <button type="button" className="chip" onClick={() => setDraft(prev => prev + (prev ? "\n" : "") + "Upload PLC snapshot")}>Upload PLC snapshot</button>
              </div>

              {/* Composer row */}
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Describe what you see, attach steps, or ask a question…"
                  rows={1}
                  className="w-full max-h-40 min-h-[44px] resize-y rounded-xl bg-neutral-900 border border-neutral-800 focus:border-blue-600/60 focus:outline-none px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || isTyping}
                  className="rounded-xl px-4 py-2 text-sm bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-sm"
                >
                  {isTyping ? "Sending…" : "Send"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Report Composer (shown after Finish clicked) */}
        {showReport && reportDraft && (
          <div className="border-t border-neutral-800">
            <ReportComposer
              sessionId={sessionId}
              draft={reportDraft}
              onClose={() => setShowReport(false)}
            />
          </div>
        )}
      </section>

      {/* Right Rail */}
      <div
        className={`
          w-80 border-l border-neutral-800 bg-neutral-900
          ${showDocs ? "block" : "hidden"}
          lg:block
        `}
      >
        <DocsPanel sessionId={sessionId} equipmentId={equipmentId} />
      </div>
    </div>
  );
}
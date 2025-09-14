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
import ChatPanel from "./ChatPanel";
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
    <div className="flex h-full">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
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

        {/* Chat Panel */}
        <div className="flex-1 min-h-0 relative">
          <ChatPanel
            sessionId={sessionId}
            uploadComponent={
              <UploadFromChat
                equipmentId={equipmentId}
                onUploaded={(docId, meta) => {
                  // Handle uploaded file - you can add it to the chat or update UI
                  console.log("File uploaded:", docId, meta);
                }}
              />
            }
          />

          {/* Input Area */}
          <div className="border-t border-neutral-800 p-4">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex gap-2 items-end mb-4"
            >
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Describe what you see, attach steps, or ask a question…"
                className="w-full resize-y min-h-[44px] rounded bg-neutral-900 px-3 py-2"
                disabled={isTyping}
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-500 disabled:opacity-50 text-sm whitespace-nowrap"
                disabled={!draft.trim() || isTyping}
              >
                {isTyping ? "Sending…" : "Send"}
              </button>
            </form>

            {/* Quick Actions */}
            {showSuggestions && (
              <>
                <div className="text-xs text-neutral-500 mb-1">Quick checks (optional)</div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {[
                    "Check current mode",
                    "Read commanded vs actual RPM",
                    "List recent parameter changes"
                  ].map((s) => (
                    <button
                      key={s}
                      className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:hover:bg-neutral-800"
                      onClick={() => insertOrSend(s)}
                      disabled={isTyping}
                    >
                      {s}
                    </button>
                  ))}
                  <button
                    className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:hover:bg-neutral-800"
                    onClick={() => {/* open upload flow */}}
                    disabled={isTyping}
                  >
                    Upload PLC snapshot
                  </button>
                </div>
              </>
            )}

            {isTyping && (
              <div className="p-2 rounded bg-neutral-900 w-fit text-gray-300">
                <TypingDots />
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
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
      </div>

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
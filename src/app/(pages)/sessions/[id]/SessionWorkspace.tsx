"use client";
import { useEffect, useRef, useState, useCallback } from "react";

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

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

async function safeFetchJSON(url: string, init?: RequestInit, attempts = 2, timeoutMs = 15000) {
  for (let i = 0; i < attempts; i++) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(to);
      // Surface non-2xx as errors with JSON body if possible
      const ct = r.headers.get("content-type") || "";
      const payload = ct.includes("application/json") ? await r.json() : await r.text();
      if (!r.ok) {
        throw new Error(typeof payload === "string" ? payload : payload?.error || r.statusText);
      }
      return payload;
    } catch (err) {
      clearTimeout(to);
      if (i === attempts - 1) throw err;
      await sleep(600 * (i + 1)); // simple backoff: 600ms, 1200ms
    }
  }
}

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
  type MsgStatus = "sending" | "sent" | "failed";
  type Msg = {
    id: string;
    role: "user" | "assistant" | "system";
    text: string;
    status?: MsgStatus;
    canRetry?: boolean;
  };
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const sendingRef = useRef(false);
  // sentinel element at the bottom of the chat for smooth auto-scroll
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // single, canonical auto-scroll helper
  const scrollToEnd = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [scrollToEnd, messages.length]);
  
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
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: m.role || "assistant",
        text: m.text || "",
        status: "sent"
      }]);
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

  type LocalMsgInput = {
    role: Msg["role"];
    text: string;
    status?: Msg["status"];
    canRetry?: boolean;
  };

  const addLocalMessage = useCallback((msg: LocalMsgInput) => {
    // Construct a fully-typed Msg before updating state
    const m: Msg = {
      id: crypto.randomUUID(),
      role: msg.role,
      text: msg.text,
      status: msg.status,      // must be "sending" | "sent" | "failed" | undefined
      canRetry: msg.canRetry,
    };
    setMessages(prev => [...prev, m]);
  }, []);

  async function actuallySend(text: string) {
    const userText = text.trim();
    if (!userText || sendingRef.current) return;
    sendingRef.current = true;
    setIsTyping(true);
    addLocalMessage({ role: "user", text: userText, status: "sent" });
    // fire-and-forget append for user
    if (sessionId) fetch(`/api/chats/${sessionId}/append-text`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ who: "USER", text: userText })
    }).catch(()=>{});
    setDraft("");

    try {
      const r = await fetch(`/api/sessions/${sessionId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: userText,
          rigName: sessionData?.session?.rig?.name,
          equipmentName: sessionData?.session?.equipment?.name
        }),
      });
      let reply = "";
      if (r.ok) {
        const j: any = await r.json();
        reply = j?.reply || j?.text || j?.message || "";
      }
      const assistantText = reply?.trim() ||
        "Got it. Share any readings, alarms, or recent changes and we'll dig in.";
      addLocalMessage({ role: "assistant", text: assistantText, status: "sent" });
      if (sessionId) fetch(`/api/chats/${sessionId}/append-text`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ who: "ASSISTANT", text: assistantText })
      }).catch(()=>{});
    } catch {
      addLocalMessage({
        role: "assistant",
        text: "Network hiccup contacting the assistant. Tap 'Retry' or send again.",
        status: "failed", canRetry: true
      });
    } finally {
      sendingRef.current = false;
      setIsTyping(false);
      scrollToEnd();
    }
  }

  async function resendFailed(id: string) {
    const item = messages.find(m => m.id === id);
    if (!item) return;
    // mark as sending
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status: "sending" } : m));
    // attempt the send again using the same text
    await actuallySend(item.text); // retry sending the message
  }

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text || isTyping) return;
    setDraft("");
    actuallySend(text);
  }, [draft, isTyping]);

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
          <div className="flex flex-col px-4 pt-4 pb-28 gap-2 overflow-y-auto min-h-[40vh]">
            {messages.length === 0 ? (
              <div className="mt-6 text-sm text-neutral-500">No messages yet. Start the conversation.</div>
            ) : (
              messages.map((m) => (
                <ChatBubble
                  key={m.id}
                  role={m.role}
                  text={m.text}
                  status={m.status}
                  onRetry={m.status === "failed" && m.role === "user" ? () => resendFailed(m.id) : undefined}
                />
              ))
            )}
            {isTyping && (
              <div className="text-xs text-neutral-500 px-1 mt-1">Assistant is typing…</div>
            )}
            {/* after messages.map(...) */}
            <div ref={chatEndRef} />
          </div>

          {/* Quick checks */}
          <div className="sticky bottom-[72px] left-0 right-0 flex flex-wrap gap-2 text-xs text-neutral-400 px-3 py-2 bg-black/60 backdrop-blur border-t border-neutral-800">
            <span className="opacity-80">Quick checks (optional)</span>
            <button type="button" className="chip" onClick={() => setDraft(prev => prev + (prev ? "\n" : "") + "Check current mode")}>Check current mode</button>
            <button type="button" className="chip" onClick={() => setDraft(prev => prev + (prev ? "\n" : "") + "Read commanded vs actual RPM")}>Read commanded vs actual RPM</button>
            <button type="button" className="chip" onClick={() => setDraft(prev => prev + (prev ? "\n" : "") + "List recent parameter changes")}>List recent parameter changes</button>
            <button type="button" className="chip" onClick={() => setDraft(prev => prev + (prev ? "\n" : "") + "Upload PLC snapshot")}>Upload PLC snapshot</button>
          </div>

          {/* Composer */}
          <form
            className="sticky bottom-0 left-0 right-0 flex items-end gap-2 bg-black/60 backdrop-blur px-3 py-3 border-t border-neutral-800"
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="Describe what you see, attach steps, or ask a question…"
              className="flex-1 resize-none rounded-xl bg-neutral-900 text-neutral-100 border border-neutral-700 px-3 py-2 leading-6 min-h-[40px] max-h-[160px] outline-none focus:border-neutral-500"
            />
            <button
              type="submit"
              disabled={!draft.trim() || isTyping}
              className="inline-flex items-center justify-center rounded-xl px-4 h-[40px] bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-500 transition"
            >
              Send
            </button>
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
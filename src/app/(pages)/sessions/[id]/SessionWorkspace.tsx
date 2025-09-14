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
  const [messageCount, setMessageCount] = useState(0);
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assistantThinking, setAssistantThinking] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [input, setInput] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const sendingRef = useRef(false);
  
  // Derived state for send button
  const attachmentCount = 0; // TODO: integrate with your upload component if needed
  const canSend = input.trim().length > 0 || attachmentCount > 0;

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
    if (sessionId) hydrateMessages(sessionId, (m: any) => setMessageCount(prev => prev + 1));
  }, [sessionId]);

  const handleMessageCountChange = useCallback((count: number) => {
    setMessageCount(count);
  }, []);

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

  // Helper to either append text or auto-send
  const insertOrSend = useCallback((snippet: string) => {
    if (isSending) return; // locked while streaming/sending
    const trimmed = input.trim();
    if (trimmed.length === 0) {
      // empty box: insert + auto-send
      setInput(snippet);
      // wait for state flush: schedule send on next tick
      setTimeout(() => handleSend(snippet), 0);
    } else {
      // append into the input without sending
      setInput(prev => (prev.endsWith(" ") || prev.length === 0) ? prev + snippet : prev + " " + snippet);
    }
  }, [input, isSending]);

  const handleSend = useCallback(async (forcedText?: string) => {
    const text = (forcedText ?? input).trim();
    if (!text || isSending || sendingRef.current) return;
    
    setIsSending(true);
    sendingRef.current = true;

    // Add user message and persist
    const userMessage = { role: "user", text };
    setMessageCount(prev => prev + 1);
    await persistOutgoingMessage(sessionId, userMessage);

    // Append user message to chat text
    if (sessionId) {
      fetch(`/api/chats/${sessionId}/append-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", text }),
      }).catch(() => {}); // fire-and-forget
    }

    setShowSuggestions(false);
    setAssistantThinking(true);
    scrollToBottom();

    try {
      const resp = await fetch("/api/chat/stub-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          equipmentId: sessionData?.session?.equipment?.id || null,
          text
        })
      });
      
      // small delay for natural feel
      await new Promise(res => setTimeout(res, 350));
      
      // Append assistant message to chat text (fire-and-forget)
      try {
        const data = await resp.json().catch(() => ({}));
        const assistantText =
          typeof data === "string" ? data :
          data?.reply ?? data?.text ?? data?.message ?? "";

        if (sessionId && assistantText) {
          fetch(`/api/chats/${sessionId}/append-text`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "assistant", text: assistantText }),
          }).catch(() => {});
        }
      } catch {
        // Non-fatal: don't block UI on transcript persistence
      }
      
      setMessageCount(prev => prev + 1);
      setInput(""); // clear on success
    } catch {
      setMessageCount(prev => prev + 1);
      console.error("send failed");
    } finally {
      setAssistantThinking(false);
      setIsSending(false);
      scrollToBottom();
      sendingRef.current = false;
    }
  }, [sessionId, sessionData?.session?.equipment?.id, input]);

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
              disabled={messageCount === 0}
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
            onMessageCountChange={handleMessageCountChange}
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
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex gap-2 mb-4">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-neutral-800 rounded p-2 text-sm resize-none"
                rows={1}
                disabled={isSending}
              />
              <button
                onClick={() => handleSend()}
                disabled={!canSend || isSending}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-500 disabled:opacity-50 text-sm whitespace-nowrap"
              >
                Send
              </button>
            </div>

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
                      disabled={isSending}
                    >
                      {s}
                    </button>
                  ))}
                  <button
                    className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:hover:bg-neutral-800"
                    onClick={() => {/* open upload flow */}}
                    disabled={isSending}
                  >
                    Upload PLC snapshot
                  </button>
                </div>
              </>
            )}

            {assistantThinking && (
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
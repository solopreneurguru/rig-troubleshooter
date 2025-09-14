"use client";
import { useState, useCallback, useEffect, useRef } from "react";
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
  const chatEndRef = useRef<HTMLDivElement | null>(null);

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

  const onSend = useCallback(async (text: string) => {
    if (!text?.trim()) return;

    // Add user message
    const userMessage = { role: "user", text };
    setMessageCount(prev => prev + 1);

    setShowSuggestions(false);
    setAssistantThinking(true);
    scrollToBottom();

    try {
      const r = await fetch("/api/chat/stub-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          equipmentId: sessionData?.session?.equipment?.id || null,
          text
        })
      });
      const j = await r.json().catch(() => null);
      // small delay for natural feel
      await new Promise(res => setTimeout(res, 350));
      if (j?.ok && j.reply) {
        setMessageCount(prev => prev + 1);
      } else {
        setMessageCount(prev => prev + 1);
      }
    } catch {
      setMessageCount(prev => prev + 1);
    } finally {
      setAssistantThinking(false);
      scrollToBottom();
    }
  }, [sessionId, sessionData?.session?.equipment?.id]);

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

          {/* Suggestions and Typing Indicator */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {showSuggestions && (
              <div className="flex flex-wrap gap-2 mb-2">
                {[
                  "Check current mode",
                  "Read commanded vs actual RPM",
                  "List recent parameter changes",
                  "Upload PLC snapshot"
                ].map((s) => (
                  <button
                    key={s}
                    className="text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700"
                    onClick={() => onSend(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
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
"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ChatPanel from "./ChatPanel";
import DocsPanel from "./DocsPanel";
import ReportComposer from "./ReportComposer";
import UploadFromChat from "./UploadFromChat";

interface Props {
  sessionId: string;
  equipmentId?: string;
}

export default function SessionWorkspace({ sessionId, equipmentId }: Props) {
  const [showDocs, setShowDocs] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [reportDraft, setReportDraft] = useState<any>(null);
  const [messageCount, setMessageCount] = useState(0);

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

  return (
    <div className="flex h-full">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800">
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

        {/* Chat Panel */}
        <div className="flex-1 min-h-0">
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
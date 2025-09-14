"use client";
import { useState, useCallback } from "react";

interface ReportDraft {
  title: string;
  status: string;
  summary: string;
  parts: string[];
  docIds: string[];
}

interface Props {
  sessionId: string;
  draft: ReportDraft;
  onClose?: () => void;
}

export default function ReportComposer({ sessionId, draft: initialDraft, onClose }: Props) {
  const [draft, setDraft] = useState<ReportDraft>(initialDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    setError(null);
    setSaving(true);

    try {
      const res = await fetch("/api/reports/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          draft,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to save report");
      }

      setPdfUrl(data.pdfUrl);
    } catch (e: any) {
      setError(e?.message || "Failed to save report");
    } finally {
      setSaving(false);
    }
  }, [sessionId, draft]);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Session Report</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-300"
          >
            ✕
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Title</label>
          <input
            type="text"
            value={draft.title}
            onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-1">Status</label>
          <select
            value={draft.status}
            onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2"
          >
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Needs Parts">Needs Parts</option>
            <option value="Escalated">Escalated</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-1">Summary</label>
          <textarea
            value={draft.summary}
            onChange={e => setDraft(d => ({ ...d, summary: e.target.value }))}
            rows={4}
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-1">Parts</label>
          <div className="space-y-2">
            {draft.parts.map((part, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={part}
                  onChange={e => {
                    const newParts = [...draft.parts];
                    newParts[i] = e.target.value;
                    setDraft(d => ({ ...d, parts: newParts }));
                  }}
                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-3 py-1"
                />
                <button
                  onClick={() => {
                    const newParts = draft.parts.filter((_, j) => j !== i);
                    setDraft(d => ({ ...d, parts: newParts }));
                  }}
                  className="px-2 py-1 text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => setDraft(d => ({ ...d, parts: [...d.parts, ""] }))}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              + Add Part
            </button>
          </div>
        </div>

        {draft.docIds.length > 0 && (
          <div>
            <label className="block text-sm text-neutral-400 mb-1">
              Attached Documents
            </label>
            <div className="text-sm text-neutral-500">
              {draft.docIds.length} document(s) will be included in the report
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Report"}
          </button>

          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-neutral-700 text-white rounded-lg hover:bg-neutral-600"
            >
              Open PDF
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

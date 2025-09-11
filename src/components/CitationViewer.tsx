"use client";
import { useState, useEffect } from "react";
import { Citation, EnhancedCitation, resolveCitationMeta, docHref } from "@/lib/citations";

type CitationViewerProps = {
  citations: Citation[];
  isOpen: boolean;
  onClose: () => void;
};

export default function CitationViewer({ citations, isOpen, onClose }: CitationViewerProps) {
  const [enhancedCitations, setEnhancedCitations] = useState<EnhancedCitation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && citations.length > 0) {
      setLoading(true);
      Promise.all(citations.map(resolveCitationMeta))
        .then(setEnhancedCitations)
        .catch(() => {
          // Fallback to basic citations
          setEnhancedCitations(citations.map(c => ({ ...c, resolved: false })));
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, citations]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-neutral-100">Why - Supporting Documentation</h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {loading && (
          <div className="text-center py-4 text-neutral-400">
            Loading citation details...
          </div>
        )}

        {!loading && enhancedCitations.length === 0 && (
          <div className="text-center py-4 text-neutral-400">
            No citations available for this step.
          </div>
        )}

        <div className="space-y-4">
          {enhancedCitations.map((citation, index) => (
            <div key={index} className="border border-neutral-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    citation.kind === "PLC" ? "bg-green-900/30 text-green-200" :
                    citation.kind === "Electrical" ? "bg-blue-900/30 text-blue-200" :
                    citation.kind === "Hydraulic" ? "bg-red-900/30 text-red-200" :
                    "bg-gray-900/30 text-gray-200"
                  }`}>
                    {citation.kind || "Manual"}
                  </span>
                  {citation.type === "doc" && citation.page && (
                    <span className="text-xs text-neutral-400">Page {citation.page}</span>
                  )}
                </div>
                {citation.resolved === false && (
                  <span className="text-xs text-yellow-400">Metadata unavailable</span>
                )}
              </div>

              <div className="mb-2">
                <h4 className="font-medium text-neutral-200">
                  {citation.type === "doc" && citation.title}
                  {citation.type === "plc" && `PLC Tag: ${citation.tag}`}
                  {citation.type === "tp" && `Test Point: ${citation.label}`}
                </h4>
              </div>

              {citation.snippet && (
                <div className="mb-3">
                  <p className="text-sm text-neutral-300 italic">
                    "{citation.snippet}"
                  </p>
                </div>
              )}

              {citation.type === "doc" && citation.url && (
                <div>
                  <a
                    href={docHref(citation)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Open Document ↗
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-neutral-700">
          <p className="text-xs text-neutral-400">
            Citations provide context and supporting documentation for troubleshooting steps. 
            Always verify information with current equipment manuals and safety procedures.
          </p>
        </div>
      </div>
    </div>
  );
}

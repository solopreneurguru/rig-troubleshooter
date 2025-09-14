"use client";
import { useState, useEffect } from "react";

interface Doc {
  id: string;
  title: string;
  type: string;
  url: string;
}

interface Props {
  sessionId: string;
  equipmentId?: string;
}

export default function DocsPanel({ sessionId, equipmentId }: Props) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    let mounted = true;
    async function loadDocs() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/documents/by-equipment/${equipmentId || "none"}`);
        const data = await res.json();

        if (!mounted) return;

        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "Failed to load documents");
        }

        setDocs(data.documents || []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load documents");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDocs();
    return () => { mounted = false; };
  }, [equipmentId]);

  const filteredDocs = filter === "all" 
    ? docs 
    : docs.filter(d => d.type.toLowerCase() === filter.toLowerCase());

  const docTypes = ["all", ...new Set(docs.map(d => d.type.toLowerCase()))];

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-neutral-800">
        <h2 className="text-lg font-semibold mb-3">Documents</h2>
        
        {/* Type Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {docTypes.map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`
                px-2 py-1 rounded text-sm whitespace-nowrap
                ${filter === type
                  ? "bg-blue-600 text-white"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                }
              `}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-sm text-neutral-400">Loading documents...</div>
        ) : error ? (
          <div className="text-sm text-red-400">{error}</div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-sm text-neutral-400">
            {docs.length === 0
              ? "No documents found"
              : "No documents match the selected filter"
            }
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocs.map(doc => (
              <a
                key={doc.id}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-neutral-800 rounded-lg hover:bg-neutral-700"
              >
                <div className="text-sm font-medium">{doc.title}</div>
                <div className="text-xs text-neutral-400 mt-1">{doc.type}</div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
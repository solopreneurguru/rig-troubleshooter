"use client";
import React from "react";
import { useEffect, useState } from "react";

type Document = {
  id: string;
  title: string;
  type: string;
  url: string;
  createdAt: string | null;
};

function formatRelativeTime(date: string | null) {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 30) return d.toLocaleDateString();
  if (days > 0) return `${days}d ago`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return `${hours}h ago`;
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

export default function DocsPanel({ equipmentId }: { equipmentId: string }) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedType, setSelectedType] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!equipmentId) return;
    loadDocs();
  }, [equipmentId, selectedType, searchQuery]);

  async function loadDocs() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        rec: equipmentId,
        limit: "50",
      });
      if (selectedType !== "All") {
        params.append("type", selectedType);
      }
      if (searchQuery.trim()) {
        params.append("q", searchQuery.trim());
      }

      const res = await fetch(`/api/documents/by-equipment?${params}`);
      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error || "Failed to load documents");
      }

      setDocs(data.items || []);
      // Extract unique types for filter dropdown
      const uniqueTypes = Array.from(
        new Set(data.items.map((d: Document) => d.type))
      ).filter(Boolean);
      setTypes(uniqueTypes);
    } catch (err: any) {
      setError(err.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  if (!equipmentId) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Select equipment to see documents
      </div>
    );
  }

  return (
    <div className="border border-neutral-800 rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-neutral-900 border-b border-neutral-800 text-sm font-medium flex items-center justify-between">
        <span>Documents</span>
        <span className="text-xs text-neutral-500">{docs.length} found</span>
      </div>

      {/* Filters */}
      <div className="p-2 border-b border-neutral-800 bg-black/20 flex gap-2">
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-2 py-1 text-sm rounded bg-black/30 border border-neutral-700"
        >
          <option value="All">All Types</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search titles..."
          className="flex-1 px-2 py-1 text-sm rounded bg-black/30 border border-neutral-700"
        />
      </div>

      {/* Loading/Error States */}
      {loading && (
        <div className="p-4 text-sm text-neutral-500">Loading...</div>
      )}
      {error && (
        <div className="p-4 text-sm text-red-500">{error}</div>
      )}

      {/* Document List */}
      {!loading && !error && docs.length === 0 && (
        <div className="p-4 text-sm text-neutral-500">
          No documents found
          {searchQuery && " matching search"}
          {selectedType !== "All" && ` of type "${selectedType}"`}
        </div>
      )}

      {!loading && !error && docs.length > 0 && (
        <div className="divide-y divide-neutral-800">
          {docs.map((doc) => (
            <div key={doc.id} className="p-3 hover:bg-neutral-900/50">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300 hover:underline truncate block"
                  >
                    {doc.title}
                  </a>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                      {doc.type}
                    </span>
                    {doc.createdAt && (
                      <span className="text-xs text-neutral-500">
                        {formatRelativeTime(doc.createdAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

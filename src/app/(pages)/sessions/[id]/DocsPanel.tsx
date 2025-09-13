"use client";

import * as React from "react";

type Doc = {
  id: string;
  title: string;
  url: string;
  type?: string | null;
  createdAt?: string | null;
};

function formatRelativeTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export default function DocsPanel({ equipmentId }: { equipmentId: string }) {
  const [docs, setDocs] = React.useState<Doc[]>([]);
  const [types, setTypes] = React.useState<string[]>([]);
  const [selectedType, setSelectedType] = React.useState<string>("All");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>("");

  React.useEffect(() => {
    if (!equipmentId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const url = new URL("/api/documents/by-equipment", window.location.origin);
        url.searchParams.set("rec", equipmentId);
        url.searchParams.set("limit", "200");

        const res = await fetch(url.toString());
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `HTTP ${res.status}`);
        }
        const data = await res.json();

        // Normalize items into our Doc shape
        const items: Doc[] = (data?.items ?? []).map((d: any) => ({
          id: String(d?.id ?? ""),
          title: String(d?.title ?? "Untitled"),
          url: String(d?.url ?? "#"),
          type: typeof d?.type === "string" ? d.type : null,
          createdAt: typeof d?.createdAt === "string" ? d.createdAt : null,
        }));

        if (cancelled) return;
        setDocs(items);

        // Build a safe, strictly-typed string[] of unique types
        const uniqueTypes = Array.from(
          new Set(
            items
              .map((d) => (typeof d.type === "string" ? d.type.trim() : ""))
              .filter((t): t is string => t.length > 0)
          )
        );
        setTypes(uniqueTypes);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load documents");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [equipmentId]);

  const filtered = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return docs.filter((d) => {
      const typeOk = selectedType === "All" || (d.type ?? "") === selectedType;
      const textOk = q === "" || d.title.toLowerCase().includes(q);
      return typeOk && textOk;
    });
  }, [docs, selectedType, searchQuery]);

  return (
    <div className="flex flex-col gap-3 p-3 border-l border-neutral-800 min-w-[320px] max-w-[420px]">
      <div className="flex items-center gap-2">
        <select
          className="px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-sm"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          <option value="All">All Types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          className="flex-1 px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-sm"
          placeholder="Search titles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading && <div className="text-xs text-neutral-400">Loading…</div>}
      {error && (
        <div className="text-xs text-red-400 border border-red-700/50 rounded p-2">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {filtered.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between gap-2 px-2 py-1 rounded border border-neutral-800 hover:bg-neutral-900"
          >
            <div className="min-w-0">
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-emerald-400 hover:underline truncate block"
                title={doc.title}
              >
                {doc.title}
              </a>
              <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                {doc.type && (
                  <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-200">
                    {doc.type}
                  </span>
                )}
                {doc.createdAt && <span>{formatRelativeTime(doc.createdAt)}</span>}
              </div>
            </div>
          </div>
        ))}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-xs text-neutral-500">No documents found.</div>
        )}
      </div>
    </div>
  );
}
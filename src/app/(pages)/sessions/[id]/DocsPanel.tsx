"use client";

import * as React from "react";

type Doc = { id: string; title: string; type?: string; url?: string; createdAt?: string };

export default function DocsPanel({ equipmentId }: { equipmentId: string }) {
  const [docs, setDocs] = React.useState<Doc[]>([]);
  const [types, setTypes] = React.useState<string[]>([]);
  const [selectedType, setSelectedType] = React.useState<string>("All");
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let aborted = false;
    (async () => {
      if (!equipmentId?.startsWith("rec")) {
        setError("No equipment selected.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({ rec: equipmentId, limit: "50" });
        if (selectedType && selectedType !== "All") params.set("type", selectedType);
        if (q) params.set("q", q);

        const res = await fetch(`/api/documents/by-equipment?${params.toString()}`);
        const data = await res.json();

        if (aborted) return;
        if (!res.ok || !data?.ok) {
          setError(data?.error || `Failed to load (HTTP ${res.status})`);
          setDocs([]);
          setTypes([]);
          return;
        }

        const items: Doc[] = Array.isArray(data.items) ? data.items : [];
        setDocs(items);

        const unique = Array.from(
          new Set(items.map(d => (d?.type ?? "")).filter(Boolean))
        ) as string[];
        setTypes(unique);
      } catch (e: any) {
        if (!aborted) setError(e?.message || "Failed to load documents");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [equipmentId, selectedType, q]);

  return (
    <div className="p-3 space-y-2">
      <div className="flex gap-2">
        <select value={selectedType} onChange={e => setSelectedType(e.target.value)}
          className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm">
          <option>All</option>
          {types.map(t => <option key={t}>{t}</option>)}
        </select>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search titles…"
          className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm" />
      </div>

      {loading && <div className="text-xs text-neutral-500">Loading…</div>}
      {error && <div className="text-xs text-red-400">{error}</div>}

      <div className="space-y-2">
        {docs.map(d => (
          <div key={d.id} className="flex items-center justify-between gap-2">
            <a className="text-sm hover:underline" href={d.url} target="_blank" rel="noreferrer">
              {d.title || "(Untitled)"}
            </a>
            <div className="flex items-center gap-2">
              {d.type ? <span className="text-[11px] px-1.5 py-0.5 rounded bg-neutral-800">{d.type}</span> : null}
              {d.createdAt ? <span className="text-[11px] text-neutral-500">{new Date(d.createdAt).toLocaleDateString()}</span> : null}
            </div>
          </div>
        ))}
        {!loading && !error && docs.length === 0 && (
          <div className="text-xs text-neutral-500">No documents for this equipment.</div>
        )}
      </div>
    </div>
  );
}
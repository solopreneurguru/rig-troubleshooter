"use client";
import { useEffect, useState } from "react";
import type { Citation } from "@/lib/citations";
import { docHref } from "@/lib/citations";

type Props = { citations: Citation[]; equipmentId?: string };

export default function CitationsPanel({ citations, equipmentId }: Props) {
  const [resolved, setResolved] = useState<Citation[]>(citations);

  useEffect(() => {
    let aborted = false;
    async function resolveDocs() {
      const next: Citation[] = [];
      for (const c of citations) {
        if (c.type === "doc" && !c.url && c.title) {
          try {
            const q = new URLSearchParams({ title: c.title });
            if (equipmentId) q.set("equipmentId", equipmentId);
            const r = await fetch(`/api/documents/lookup?${q}`);
            const j = await r.json();
            if (!aborted && j?.ok && j?.found) {
              next.push({ ...c, url: j.blobUrl });
              continue;
            }
          } catch {}
        }
        next.push(c);
      }
      if (!aborted) setResolved(next);
    }
    resolveDocs();
    return () => { aborted = true; };
  }, [JSON.stringify(citations), equipmentId]);

  if (!resolved?.length) return null;

  return (
    <aside className="w-full md:w-72 lg:w-80 p-3 border-l border-neutral-800 overflow-y-auto">
      <h3 className="text-sm font-semibold mb-2">Citations</h3>
      <ul className="space-y-2 text-sm">
        {resolved.map((c, i) => {
          if (c.type === "doc") {
            const href = docHref(c);
            return (
              <li key={i} className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-neutral-800">DOC</span>
                <a className="underline hover:no-underline" href={href || "#"} target="_blank" rel="noreferrer">
                  {c.title}{c.page ? ` p.${c.page}` : ""}
                </a>
              </li>
            );
          }
          if (c.type === "plc") {
            return (
              <li key={i} className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-neutral-800">PLC</span>
                <span>{c.tag}</span>
              </li>
            );
          }
          return (
            <li key={i} className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-neutral-800">TP</span>
              <span>{c.label}</span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

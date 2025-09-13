"use client";

import { useRef, useState } from "react";

export default function UploadInChat({
  sessionId,
  rigEquipmentId,
  onUploaded,
}: {
  sessionId: string;
  rigEquipmentId?: string;
  onUploaded?: (doc: { id: string; title?: string; type?: string }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!rigEquipmentId) {
      setErr("Select equipment first");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      // 1) upload to blob (reuse existing blob util if present; otherwise, simple POST to /api/blob)
      // For now we'll use the same upload as your /upload page uses:
      const fd = new FormData();
      fd.append("file", file);
      const blobRes = await fetch("/api/blobs/upload", { method: "POST", body: fd });
      const blobJson = await blobRes.json();
      if (!blobJson?.ok || !blobJson?.url) throw new Error("blob upload failed");

      // 2) create document (autoClassify)
      const res = await fetch("/api/documents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: blobJson.url,
          filename: file.name,
          mime: file.type,
          size: file.size,
          sessionId,
          rigEquipmentId,
          autoClassify: true,
        }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "create failed");
      onUploaded?.({ id: json.id, title: json.title, type: json.type });
    } catch (e: any) {
      setErr(e?.message || "upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-sm"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {busy ? "Uploading…" : "Attach"}
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={onPick}
        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt,.csv,.xls,.xlsx,.json,.zip,.mp4,.mov,.avi,.ppt,.pptx,.dwg,.dxf"
      />
      {err && <div className="text-xs text-red-400">{err}</div>}
    </div>
  );
}

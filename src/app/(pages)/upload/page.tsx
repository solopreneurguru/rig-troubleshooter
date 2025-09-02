"use client";
import { useEffect, useState } from "react";

export default function UploadPage() {
  const [status, setStatus] = useState<string>("");
  const [url, setUrl] = useState<string>("");
  const [docId, setDocId] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("Uploading...");
    setUrl("");
    setDocId("");

    const form = new FormData(e.currentTarget);
    const file = form.get("file") as File | null;
    if (!file) { setStatus("Please choose a file."); return; }

    try {
      const res = await fetch("/api/blob/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!json.ok) { setStatus(`Error: ${json.error || "upload failed"}`); return; }
      setUrl(json.blob?.url || "");
      setDocId(json.documentId || "");
      setStatus(json.warning ? `Uploaded with warning: ${json.warning}` : "Upload complete.");
    } catch {
      setStatus("Upload failed.");
    }
  }

  return (
    <main className="p-6 max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Upload a Document</h1>
      <p className="text-sm opacity-80">PDF/JPG/PNG/WEBP · ≤20MB</p>

      <form onSubmit={onSubmit} className="space-y-3">
        <input type="file" name="file" accept=".pdf,image/*" className="block w-full border rounded p-2" required />
        <input type="text" name="title" placeholder="Title (e.g., Electrical Schematic P-34)" className="block w-full border rounded p-2" />
        <select name="doctype" className="block w-full border rounded p-2">
          <option value="">DocType (optional)</option>
          <option>Electrical</option>
          <option>Hydraulic</option>
          <option>Manual</option>
          <option>PLC</option>
          <option>Photo</option>
          <option>Other</option>
        </select>
        <input type="text" name="rigName" placeholder="Rig Name to link (optional, exact match)" className="block w-full border rounded p-2" />
        <input type="text" name="filename" placeholder="Optional filename override" className="block w-full border rounded p-2" />
        <textarea name="notes" placeholder="Notes (optional)" className="block w-full border rounded p-2" rows={3} />
        <button type="submit" className="px-4 py-2 rounded bg-black text-white">Upload</button>
      </form>

      {status && <p className="text-sm">{status}</p>}
      {url && (
        <p className="text-sm">
          File URL: <a href={url} target="_blank" className="text-blue-600 underline">{url}</a>
        </p>
      )}
      {docId && <p className="text-sm">Airtable Document ID: <code>{docId}</code></p>}
    </main>
  );
}

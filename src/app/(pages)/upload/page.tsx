"use client";

import { useState } from "react";

export default function UploadPage() {
  const [status, setStatus] = useState<string>("");
  const [url, setUrl] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("Uploading...");
    setUrl("");

    const form = new FormData(e.currentTarget);
    const file = form.get("file") as File | null;
    if (!file) {
      setStatus("Please choose a file.");
      return;
    }

    try {
      const res = await fetch("/api/blob/upload", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!json.ok) {
        setStatus(`Error: ${json.error || "upload failed"}`);
        return;
      }
      setUrl(json.blob?.url || "");
      setStatus("Upload complete.");
    } catch (err: any) {
      setStatus("Upload failed.");
    }
  }

  return (
    <main className="p-6 max-w-xl">
      <h1 className="text-2xl font-bold">Upload a PDF or Image</h1>
      <p className="text-sm opacity-80 mt-1">
        MVP limit ~20MB. Types: PDF, JPG, PNG, WEBP.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input
          type="file"
          name="file"
          accept=".pdf,image/*"
          className="block w-full border rounded p-2"
          required
        />
        <input
          type="text"
          name="filename"
          placeholder="Optional filename"
          className="block w-full border rounded p-2"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded bg-black text-white"
        >
          Upload
        </button>
      </form>

      {status && <p className="mt-3 text-sm">{status}</p>}
      {url && (
        <p className="mt-2">
          File URL:{" "}
          <a href={url} target="_blank" className="text-blue-600 underline">
            {url}
          </a>
        </p>
      )}
    </main>
  );
}

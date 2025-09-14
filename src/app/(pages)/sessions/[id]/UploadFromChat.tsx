"use client";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface Props {
  onUploaded?: (docId: string, meta: { title: string; type: string; url: string }) => void;
  equipmentId?: string;
  disabled?: boolean;
}

export default function UploadFromChat({ onUploaded, equipmentId, disabled }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    const file = acceptedFiles[0]; // Handle one at a time for now

    setUploading(true);
    setError(null);

    try {
      // 1. Get upload URL
      const urlRes = await fetch("/api/blob/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, type: file.type }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok || !urlData?.ok || !urlData?.url) {
        throw new Error(urlData?.error || "Failed to get upload URL");
      }

      // 2. Upload the file
      const uploadRes = await fetch(urlData.url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) {
        throw new Error(`Upload failed: ${uploadRes.status}`);
      }

      // 3. Create document record
      const docRes = await fetch("/api/documents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: file.name,
          blobUrl: urlData.url.split("?")[0], // Strip query params
          mimeType: file.type,
          sizeBytes: file.size,
          equipmentId: equipmentId || undefined,
          docType: guessDocType(file.name, file.type),
        }),
      });
      const docData = await docRes.json();
      if (!docRes.ok || !docData?.ok || !docData?.id) {
        throw new Error(docData?.error || "Failed to create document record");
      }

      // Success - notify parent
      onUploaded?.(docData.id, {
        title: file.name,
        type: guessDocType(file.name, file.type),
        url: urlData.url.split("?")[0],
      });
    } catch (e: any) {
      console.error("Upload failed:", e);
      setError(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [equipmentId, onUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: disabled || uploading,
    multiple: false,
  });

  return (
    <div className="relative">
      <div
        {...getRootProps()}
        className={`
          inline-flex items-center justify-center rounded-lg
          px-3 py-1.5 text-sm font-medium
          ${disabled || uploading
            ? "opacity-50 cursor-not-allowed"
            : isDragActive
            ? "bg-blue-600 text-white"
            : "bg-neutral-800 hover:bg-neutral-700 text-neutral-100"
          }
        `}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <span className="flex items-center">
            <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Uploading...
          </span>
        ) : isDragActive ? (
          "Drop here"
        ) : (
          "Attach file"
        )}
      </div>
      {error && (
        <div className="absolute top-full left-0 mt-1 text-xs text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}

function guessDocType(filename: string, mimeType: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const type = mimeType.toLowerCase();

  if (type.includes("image/")) return "Photo";
  if (type.includes("pdf")) return "Manual";
  if (ext === "dwg" || ext === "dxf") return "Drawing";
  if (ext === "csv" || ext === "xlsx" || ext === "xls") return "Data";
  if (type.includes("text/")) return "Notes";

  return "Other";
}

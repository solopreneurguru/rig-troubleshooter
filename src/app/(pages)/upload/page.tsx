"use client";
import React, { useState, useEffect } from "react";

type RigEquipment = {
  id: string;
  name: string;
  equipmentType: string;
};

const DOC_TYPES = [
  "Electrical",
  "Hydraulic", 
  "Manual",
  "PLC",
  "Photo"
];

export default function UploadPage() {
  const [equipment, setEquipment] = useState<RigEquipment[]>([]);
  const [selectedRig, setSelectedRig] = useState("");
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("Manual");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEquipment();
  }, []);

  async function loadEquipment() {
    try {
      const response = await fetch("/api/equipment/instances");
      const data = await response.json();
      if (data.ok) {
        setEquipment(data.items);
      } else {
        console.error("Equipment load error:", data.error);
        setError("Failed to load equipment");
      }
    } catch (err) {
      setError("Network error loading equipment");
    }
  }

  async function handleUpload() {
    if (!selectedRig || !title || !file) {
      setError("Please fill in all required fields");
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      // Step 1: Upload file to Vercel Blob
      const formData = new FormData();
      formData.append("file", file);
      formData.append("rigEquipmentId", selectedRig);
      formData.append("title", title);
      formData.append("docType", docType);

      const blobResponse = await fetch("/api/blob/upload", {
        method: "POST",
        body: formData
      });

      const blobResult = await blobResponse.json();
      if (!blobResult.ok) {
        throw new Error(blobResult.error || "Blob upload failed");
      }

      // Step 2: Create document record in Airtable
      const docResponse = await fetch("/api/documents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rigEquipmentId: selectedRig,
          title,
          docType,
          url: blobResult.url,
          size: blobResult.size,
          contentType: blobResult.contentType
        })
      });

      const docResult = await docResponse.json();
      if (!docResult.ok) {
        throw new Error(docResult.error || "Document creation failed");
      }

      // Success!
      setResult({
        blobUrl: blobResult.url,
        documentId: docResult.documentId,
        title: docResult.title,
        docType: docResult.docType,
        size: blobResult.size,
        contentType: blobResult.contentType
      });

      // Reset form
      setTitle("");
      setFile(null);
      setSelectedRig("");

    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Upload Document</h1>
      
      <div className="space-y-4">
        {/* Rig Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Equipment *
          </label>
          <select
            value={selectedRig}
            onChange={(e) => setSelectedRig(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
            disabled={uploading}
          >
            <option value="">Select equipment...</option>
            {equipment.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Document Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter document title"
            disabled={uploading}
          />
        </div>

        {/* Document Type */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Document Type
          </label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
            disabled={uploading}
          >
            {DOC_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium mb-2">
            File *
          </label>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            disabled={uploading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Supported formats: PDF, PNG, JPG. Maximum size: 25MB.
          </p>
        </div>

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={uploading || !selectedRig || !title || !file}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {uploading ? "Uploading..." : "Upload Document"}
        </button>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Success Display */}
        {result && (
          <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            <h3 className="font-medium mb-2">Upload Successful!</h3>
            <div className="text-sm space-y-1">
              <div><strong>Document ID:</strong> {result.documentId}</div>
              <div><strong>Title:</strong> {result.title}</div>
              <div><strong>Type:</strong> {result.docType}</div>
              <div><strong>Size:</strong> {Math.round(result.size / 1024)} KB</div>
              <div>
                <strong>File:</strong>{" "}
                <a 
                  href={result.blobUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Open Document ↗
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Info Note */}
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded text-sm">
          <strong>Note:</strong> Large files are stored in Blob storage; only metadata is saved in Airtable.
          Documents will be linked to the selected rig equipment for easy access during troubleshooting sessions.
        </div>
      </div>
    </div>
  );
}
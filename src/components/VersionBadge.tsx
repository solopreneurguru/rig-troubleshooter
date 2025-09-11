"use client";
import React, { useState, useEffect } from "react";

export default function VersionBadge() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Simple fetch on mount and every 60s
  useEffect(() => {
    const fetchVersion = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/diag/version");
        const result = await response.json();
        if (result?.ok) {
          setData(result);
        }
      } catch (error) {
        console.warn("Version fetch failed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVersion();
    const interval = setInterval(fetchVersion, 60000); // 60s
    return () => clearInterval(interval);
  }, []);

  if (!data?.ok) return null;

  const short = (data.commit ?? "local").slice(0, 7);
  const region = data.region ?? "local";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      // Simple toast - could be enhanced with a proper toast system
      const toast = document.createElement('div');
      toast.textContent = 'Version copied to clipboard';
      toast.style.cssText = 'position:fixed;top:20px;right:20px;background:#10b981;color:white;padding:8px 16px;border-radius:6px;z-index:9999;font-size:12px;';
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 2000);
    } catch (error) {
      console.warn("Clipboard copy failed:", error);
    }
  };

  return (
    <button
      onClick={copyToClipboard}
      title="Click to copy version info"
      className="text-xs opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
      disabled={loading}
    >
      {loading ? "..." : `v: ${short} · ${region}`}
    </button>
  );
}


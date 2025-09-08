"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface SessionCreateFormProps {
  rigId?: string;
  equipmentId?: string;
}

export default function SessionCreateForm({ 
  rigId, 
  equipmentId 
}: SessionCreateFormProps) {
  const router = useRouter();
  const [problem, setProblem] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [status, setStatus] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!problem.trim()) {
      setError("Please describe the problem.");
      return;
    }
    
    // 25s timeout guard
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 25000);

    setSubmitting(true);
    setStatus("Posting…");
    try {
      const res = await fetch("/api/sessions/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ 
          problem,
          rigId: rigId || undefined,
          equipmentId: equipmentId || undefined
        }),
        signal: ctrl.signal,
      });
      const json = await res.json().catch(() => ({}));
      console.log("create-session", res.status, json);
      
      if (!res.ok || !json?.ok) {
        const errorMsg = res.status === 504 ? "Create failed: upstream timeout" : (json?.error || `Create failed (${res.status})`);
        setError(errorMsg);
        setStatus("❌ Create failed: " + errorMsg);
        setSubmitting(false);
        clearTimeout(t);
        return;
      }
      
      setStatus(`Created ${json.id}`);
      clearTimeout(t);
      router.push(json.redirect || `/sessions/${json.id}`);
    } catch (err:any) {
      clearTimeout(t);
      const msg = err?.name === "AbortError" ? "Request timed out (25s). Try again." : (err?.message || "Network error.");
      setError(msg);
      setStatus("❌ Create failed: " + msg);
      setSubmitting(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3">
      <label className="block text-sm text-neutral-400" htmlFor="problem">Problem Description *</label>
      <textarea
        id="problem"
        name="problem"
        value={problem}
        onChange={(e)=>setProblem(e.target.value)}
        placeholder="Describe your issue and equipment in detail..."
        className="w-full min-h-[120px] rounded border border-neutral-700 bg-neutral-900 p-3"
        required
      />
      {error ? <div className="text-red-400 text-sm border border-red-700 rounded p-2 bg-red-950/25">{error}</div> : null}
      <div className="text-xs text-neutral-400">{status}</div>
      <button type="submit" disabled={submitting} className="px-4 py-2 rounded bg-blue-600 disabled:opacity-60">
        {submitting ? "Creating…" : "Create Session"}
      </button>
    </form>
  );
}

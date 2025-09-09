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
    
    setSubmitting(true);
    setError(null);
    setStatus('Posting…');
    try {
      const res = await fetch('/api/sessions/create', {
        method:'POST',
        headers:{'content-type':'application/json'},
        body: JSON.stringify({ problem: problem.trim(), equipId: equipmentId || undefined, rigId: rigId || undefined }),
        signal: AbortSignal.timeout(9000)
      });
      const j = await res.json().catch(()=>null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || `HTTP ${res.status}`);
      setStatus(`Created ${j.id}`);
      window.location.href = j.redirect || `/sessions/${encodeURIComponent(j.id)}`;
    } catch (e:any) {
      const msg = e?.message?.includes('timeout') ? 'Request timed out (9s). Try again.' : (e?.message || 'Failed');
      setError(msg);
      setStatus(msg);
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

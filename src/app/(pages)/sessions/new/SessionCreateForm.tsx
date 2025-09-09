"use client";
import React from "react";
import { useRouter } from "next/navigation";

export default function SessionCreateForm() {
  const router = useRouter();
  const [problem, setProblem] = React.useState("");
  const [equipmentId, setEquipmentId] = React.useState<string | undefined>();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setStatus("Posting…");
    setBusy(true);
    try {
      const res = await fetch("/api/sessions/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ problem, equipmentId }),
        signal: AbortSignal.timeout(9000),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        setErr(j?.error || `HTTP ${res.status}`);
        setStatus("");
        setBusy(false);
        return;
      }
      setStatus(`Created ${j.id}`);
      // hard nav to guarantee route hydration after create
      window.location.href = j.redirect || `/sessions/${j.id}`;
    } catch (e: any) {
      setErr(e?.message?.includes("deadline") ? "Request timed out (9s). Try again." : (e?.message || "Network error"));
      setStatus("");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block text-sm opacity-75">Problem Description *</label>
      <textarea
        className="w-full rounded bg-neutral-900 p-3"
        value={problem}
        onChange={(e) => setProblem(e.target.value)}
        placeholder="Describe your issue and equipment in detail…"
        required
        minLength={3}
      />
      {/* equipment picker wiring remains the same; it only needs to set equipmentId */}
      <div className="text-xs opacity-70">{status}</div>
      {err && <div className="text-red-400 text-sm">❌ {err}</div>}
      <button
        type="submit"
        disabled={busy}
        className="px-3 py-2 rounded bg-emerald-700 disabled:opacity-60"
      >
        {busy ? "Creating…" : "Create Session"}
      </button>
    </form>
  );
}
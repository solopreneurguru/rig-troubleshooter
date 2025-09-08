"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SessionCreateForm() {
  const router = useRouter();
  const [rigId, setRigId] = useState<string|undefined>();
  const [equipmentId, setEquipmentId] = useState<string|undefined>();
  const [problem, setProblem] = useState("");
  const [overrideKey, setOverrideKey] = useState<string|undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [status, setStatus] = useState<string>("");

  // Global safety net: log ANY native submit bubbling up
  useEffect(() => {
    const onSubmit = (ev: SubmitEvent) => {
      // If this fires, a native submit slipped through
      console.warn("NATIVE SUBMIT CAPTURED", ev.target);
      setStatus("⚠️ Native submit captured. Using client handler.");
      ev.preventDefault();
    };
    document.addEventListener("submit", onSubmit, true); // capture phase
    return () => document.removeEventListener("submit", onSubmit, true);
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!problem.trim()) {
      setError("Please describe the problem.");
      return;
    }
    setSubmitting(true);
    setStatus("Posting…");
    try {
      const res = await fetch("/api/sessions/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rigId, equipmentId, problem, overrideRulePackKey: overrideKey }),
      });
      const json = await res.json().catch(() => ({}));
      console.log("create-session", res.status, json); // dev aid
      if (!res.ok || !json?.ok) {
        setError(json?.error || `Create failed (${res.status})`);
        setStatus("❌ " + (json?.error || `Create failed (${res.status})`));
        setSubmitting(false);
        return;
      }
      setStatus(`✅ Created ${json.id}`);
      router.push(json.redirect || `/sessions/${json.id}`);
    } catch (err:any) {
      setError(err?.message || "Network error.");
      setStatus("❌ " + (err?.message || "Network error"));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" id="session-create-form">
      {/* Hook these up to your existing pickers (call setRigId/setEquipmentId from those pickers) */}
      {/* PROBLEM field (controlled) */}
      <label className="block text-sm text-neutral-400">Problem Description *</label>
      <textarea
        id="problem"
        name="problem"
        value={problem}
        onChange={(e) => setProblem(e.target.value)}
        placeholder="Describe your issue and equipment in detail..."
        className="w-full min-h-[120px] rounded border border-neutral-700 bg-neutral-900 p-3"
        autoComplete="off"
        required
      />

      {/* Inline error */}
      {error ? (
        <div className="text-red-400 text-sm border border-red-700 rounded p-2 bg-red-950/25">{error}</div>
      ) : null}

      {/* Visible status line */}
      <div id="create-status" className="text-xs text-neutral-400">{status}</div>

      <button
        type="submit"
        id="create-session-btn"
        disabled={submitting}
        className="px-4 py-2 rounded bg-blue-600 disabled:opacity-60"
      >
        {submitting ? "Creating…" : "Create Session"}
      </button>
    </form>
  );
}

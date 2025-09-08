"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  defaultRigId?: string;
  defaultEquipmentId?: string;
  defaultRulePackKey?: string;
};

export default function SessionCreateForm({ defaultRigId, defaultEquipmentId, defaultRulePackKey }: Props) {
  const router = useRouter();
  const [rigId, setRigId] = useState<string | undefined>(defaultRigId);
  const [equipmentId, setEquipmentId] = useState<string | undefined>(defaultEquipmentId);
  const [problem, setProblem] = useState("");
  const [overrideKey, setOverrideKey] = useState<string | undefined>(defaultRulePackKey);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!problem.trim()) {
      setError("Please describe the problem.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/sessions/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rigId,
          equipmentId,
          problem,
          overrideRulePackKey: overrideKey,
        }),
      });
      const json = await res.json().catch(() => ({}));
      // Dev diagnostic:
      console.log("create-session", res.status, json);
      if (!res.ok || !json?.ok) {
        setError(json?.error || `Create failed (${res.status})`);
        setSubmitting(false);
        return;
      }
      router.push(json.redirect || `/sessions/${json.id}`);
    } catch (err: any) {
      setError(err?.message || "Network error.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {/* Replace these stubs with your existing pickers if you already render them elsewhere and use setters */}
      {/* Rig & Equipment pickers in your UI should call setRigId/setEquipmentId with selected Airtable record IDs */}

      {/* Problem input (bind to state) */}
      <textarea
        aria-label="Problem Description"
        value={problem}
        onChange={(e) => setProblem(e.target.value)}
        placeholder="Describe your issue and equipment in detail..."
        className="w-full min-h-[120px] rounded border border-neutral-700 bg-neutral-900 p-3"
      />

      {/* Inline error */}
      {error ? (
        <div className="text-red-400 text-sm border border-red-700 rounded p-2 bg-red-950/25">
          {error}
        </div>
      ) : null}

      <button
        id="create-session-btn"
        type="submit"
        disabled={submitting /* only disabled while posting */}
        className="px-4 py-2 rounded bg-blue-600 disabled:opacity-60"
        title={submitting ? "Submitting…" : "Create Session"}
      >
        {submitting ? "Creating…" : "Create Session"}
      </button>
    </form>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewSessionPage() {
  const [rigName, setRigName] = useState("");
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function createSession() {
    setBusy(true);
    const res = await fetch("/api/sessions/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `Session ${Date.now()}`, rigName, problem }),
    });
    const json = await res.json();
    setBusy(false);
    if (json.ok) router.push(`/sessions/${json.id}`);
    else alert(json.error || "Failed to create session");
  }

  return (
    <main className="p-6 max-w-xl space-y-3">
      <h1 className="text-2xl font-bold">Start a New Session</h1>
      <input 
        className="w-full border rounded p-2" 
        placeholder="Rig Name (exact, optional)" 
        value={rigName} 
        onChange={e => setRigName(e.target.value)} 
      />
      <textarea 
        className="w-full border rounded p-2" 
        rows={4} 
        placeholder="Problem description" 
        value={problem} 
        onChange={e => setProblem(e.target.value)} 
      />
      <button 
        onClick={createSession} 
        disabled={busy} 
        className="px-4 py-2 rounded bg-black text-white"
      >
        {busy ? "Creating..." : "Create Session"}
      </button>
    </main>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewSessionPage() {
  const [rigName, setRigName] = useState("");
  const [problem, setProblem] = useState("");
  const [packs, setPacks] = useState<any[]>([]);
  const [rpKey, setRpKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/rulepacks/list");
        const j = await r.json();
        if (j.ok) setPacks(j.packs || []);
      } catch (e) {
        console.log("Failed to load rule packs:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function createSession() {
    if (!rpKey) {
      alert("Please select a Rule Pack");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/sessions/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `Session ${Date.now()}`, rigName, problem, rulePackKey: rpKey }),
    });
    const json = await res.json();
    setBusy(false);
    if (json.ok) router.push(`/sessions/${json.id}`);
    else alert(json.error || "Failed to create session");
  }

  return (
    <main className="p-6 max-w-xl space-y-3">
      <h1 className="text-2xl font-bold">Start a New Session</h1>
      <input className="w-full border rounded p-2" placeholder="Rig Name (optional)" value={rigName} onChange={e=>setRigName(e.target.value)} />
      <textarea className="w-full border rounded p-2" rows={3} placeholder="Problem description" value={problem} onChange={e=>setProblem(e.target.value)} />
      
      {loading ? (
        <div className="text-center py-4">Loading Rule Packs...</div>
      ) : (
        <select className="w-full border rounded p-2" value={rpKey} onChange={e=>setRpKey(e.target.value)}>
          <option value="">Select a RulePack…</option>
          {packs.map((p:any) => <option key={p.id} value={p.Key}>{p.Key} ({p.EquipmentType || "Any"})</option>)}
        </select>
      )}
      
      <button onClick={createSession} disabled={busy || !rpKey} className="px-4 py-2 rounded bg-black text-white">
        {busy ? "Creating..." : "Create Session"}
      </button>
    </main>
  );
}

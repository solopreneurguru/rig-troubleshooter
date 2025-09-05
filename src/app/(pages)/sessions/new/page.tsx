"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface EquipmentType {
  id: string;
  Name: string;
  Description?: string;
}

interface EquipmentInstance {
  id: string;
  Name: string;
  SerialNumber?: string;
  EquipmentType?: string[];
  Rig?: string[];
}

interface Rig {
  id: string;
  Name: string;
  Type?: string;
}

export default function NewSessionPage() {
  const [rigName, setRigName] = useState("");
  const [problem, setProblem] = useState("");
  const [packs, setPacks] = useState<any[]>([]);
  const [rpKey, setRpKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [overrideHint, setOverrideHint] = useState("");
  
  // New state for equipment selection
  const [showRigModal, setShowRigModal] = useState(false);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [selectedRig, setSelectedRig] = useState<Rig | null>(null);
  const [selectedEquipmentInstance, setSelectedEquipmentInstance] = useState<EquipmentInstance | null>(null);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [equipmentInstances, setEquipmentInstances] = useState<EquipmentInstance[]>([]);
  const [rigs, setRigs] = useState<Rig[]>([]);
  
  // New equipment instance creation
  const [newEquipmentName, setNewEquipmentName] = useState("");
  const [newEquipmentSerial, setNewEquipmentSerial] = useState("");
  const [newEquipmentType, setNewEquipmentType] = useState("");
  const [newEquipmentPLCProject, setNewEquipmentPLCProject] = useState("");
  
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        // Load rule packs (all packs for now, will filter by type when needed)
        const r = await fetch("/api/rulepacks/list");
        const j = await r.json();
        if (j.ok) setPacks(j.packs || []);
        
        // Load equipment types
        const etRes = await fetch("/api/equipment/types");
        const etData = await etRes.json();
        if (etData.ok) setEquipmentTypes(etData.types || []);
        
        // Load rigs
        const rigsRes = await fetch("/api/rigs/list");
        const rigsData = await rigsRes.json();
        if (rigsData.ok) setRigs(rigsData.rigs || []);
        
        // Load equipment instances
        const eiRes = await fetch("/api/equipment/instances");
        const eiData = await eiRes.json();
        if (eiData.ok) setEquipmentInstances(eiData.instances || []);
        
      } catch (e) {
        console.log("Failed to load data:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load filtered packs when equipment instance changes
  useEffect(() => {
    if (selectedEquipmentInstance?.EquipmentType?.[0]) {
      (async () => {
        try {
          const equipmentType = selectedEquipmentInstance.EquipmentType![0];
          const r = await fetch(`/api/rulepacks/list?type=${encodeURIComponent(equipmentType)}`);
          const j = await r.json();
          if (j.ok) {
            // Only show .v2 packs
            const v2Packs = j.packs.filter((pack: any) => pack.Key?.endsWith('.v2'));
            setPacks(v2Packs);
          }
        } catch (e) {
          console.log("Failed to load filtered packs:", e);
        }
      })();
    }
  }, [selectedEquipmentInstance]);

  async function handleManualPackSelection() {
    if (!rpKey || !problem.trim()) {
      alert("Please select a rule pack and describe your issue");
      return;
    }
    
    setBusy(true);
    try {
      // Create session first
      const res = await fetch("/api/sessions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          rigName: selectedRig?.Name || rigName, 
          problem, 
          rulePackKey: rpKey,
          equipmentInstanceId: selectedEquipmentInstance?.id
        }),
      });
      
      const json = await res.json();
      if (!json.ok) {
        alert(json.error || "Failed to create session");
        setBusy(false);
        return;
      }
      
      const sessionId = json.sessionId;
      
      // Update session with the selected pack
      const updRes = await fetch("/api/sessions/update", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ sessionId, fields: {
          RulePackKey: rpKey
        }})
      });
      const upd = await updRes.json().catch(() => null);
      
      if (!updRes.ok || !upd?.ok) {
        alert(`Failed to set RulePackKey: ${upd?.error || 'Unknown error'}`);
        setBusy(false);
        return;
      }

      // Navigate to session
      router.push(`/sessions/${sessionId}`);
    } catch (e) {
      alert("Failed to create session: " + e);
    } finally {
      setBusy(false);
    }
  }

  async function createSession() {
    if (!problem.trim()) {
      alert("Please describe your issue");
      return;
    }
    
    setBusy(true);
    try {
      // 1) Create session first (existing endpoint)
      const res = await fetch("/api/sessions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          rigName: selectedRig?.Name || rigName, 
          problem, 
          rulePackKey: rpKey,
          equipmentInstanceId: selectedEquipmentInstance?.id
          // DO NOT include Title - it's computed by Airtable formula
        }),
      });
      
      const json = await res.json();
      if (!json.ok) {
        alert(json.error || "Failed to create session");
        setBusy(false);
        return;
      }
      
      const sessionId = json.sessionId;
      
      // 2) Call Symptom Router with equipment type hint
      const equipmentTypeHint = selectedEquipmentInstance?.EquipmentType?.[0];
      const intakeRes = await fetch("/api/intake/message", { 
        method:"POST", 
        headers:{ "Content-Type":"application/json" }, 
        body: JSON.stringify({ 
          sessionId, 
          text: problem,
          equipmentTypeHint 
        }) 
      });
      const intake = await intakeRes.json().catch(() => null);

      // If intake.packKey falsy → open Advanced + hint and **return** (don't push).
      if (!intake?.packKey) {
        setShowAdvanced(true);
        setOverrideHint("I couldn't auto-select a rule pack. Please pick one.");
        setBusy(false);
        return; // DO NOT push to /sessions/[id]; return early
      }

      // If truthy → call /api/sessions/update with { RulePackKey: packKey, FailureMode } and read JSON.
      const updRes = await fetch("/api/sessions/update", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ sessionId, fields: {
          RulePackKey: intake.packKey,
          FailureMode: intake.failureMode ?? undefined
        }})
      });
      const upd = await updRes.json().catch(() => null);
      
      // If !ok → alert and keep Advanced open; **return**.
      if (!updRes.ok || !upd?.ok) {
        alert(`Failed to set RulePackKey: ${upd?.error || 'Unknown error'}`);
        setShowAdvanced(true);
        setOverrideHint("Failed to set rule pack. Please try again.");
        setBusy(false);
        return;
      }

      // Else → router.push(`/sessions/${sessionId}`);
      router.push(`/sessions/${sessionId}`);
    } catch (e) {
      alert("Failed to create session: " + e);
    } finally {
      setBusy(false);
    }
  }
  
  async function createEquipmentInstance() {
    if (!newEquipmentName.trim()) {
      alert("Please enter equipment name");
      return;
    }
    
    try {
      const res = await fetch("/api/equipment/instances/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newEquipmentName,
          serial: newEquipmentSerial || undefined,
          typeId: newEquipmentType || undefined,
          rigId: selectedRig ? selectedRig.id : undefined,
          plcDocId: newEquipmentPLCProject || undefined
        }),
      });
      
      const json = await res.json();
      if (res.ok && json.ok) {
        setSelectedEquipmentInstance({ id: json.equipmentId, Name: newEquipmentName, SerialNumber: newEquipmentSerial });
        setShowEquipmentModal(false);
        setNewEquipmentName("");
        setNewEquipmentSerial("");
        setNewEquipmentType("");
        setNewEquipmentPLCProject("");
      } else {
        alert("Failed to create equipment: " + (json.error || res.statusText));
      }
    } catch (e) {
      alert("Failed to create equipment instance: " + e);
    }
  }

  return (
    <main className="p-6 max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Start a New Session</h1>
      
      {/* Rig Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Rig</label>
        <div className="flex gap-2">
          <input 
            className="bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md px-3 py-2 flex-1" 
            placeholder="Rig Name (optional)" 
            value={selectedRig?.Name || rigName} 
            onChange={e=>setRigName(e.target.value)} 
            disabled={selectedRig !== null}
          />
          <button 
            onClick={() => setShowRigModal(true)}
            className="px-3 py-2 border rounded text-sm"
          >
            Select Rig
          </button>
        </div>
        {selectedRig && (
          <div className="text-sm text-zinc-400">
            Selected: {selectedRig.Name} {selectedRig.Type && `(${selectedRig.Type})`}
            <button 
              onClick={() => setSelectedRig(null)}
              className="ml-2 text-red-400 underline"
            >
              Clear
            </button>
          </div>
        )}
      </div>
      
      {/* Equipment Instance Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Equipment Instance</label>
        <div className="flex gap-2">
          <input 
            className="bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md px-3 py-2 flex-1" 
            placeholder="Equipment Instance" 
            value={selectedEquipmentInstance?.Name || ""} 
            disabled={true}
          />
          <button 
            onClick={() => setShowEquipmentModal(true)}
            className="px-3 py-2 border rounded text-sm"
          >
            Select/Create Equipment
          </button>
        </div>
        {selectedEquipmentInstance && (
          <div className="text-sm text-zinc-400">
            Selected: {selectedEquipmentInstance.Name} 
            {selectedEquipmentInstance.SerialNumber && ` (S/N: ${selectedEquipmentInstance.SerialNumber})`}
            <button 
              onClick={() => setSelectedEquipmentInstance(null)}
              className="ml-2 text-red-400 underline"
            >
              Clear
            </button>
          </div>
        )}
      </div>
      
      {/* Problem Description */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Problem Description *</label>
        <textarea 
          className="bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md px-3 py-2 w-full" 
          rows={4} 
          placeholder="Describe your issue and equipment in detail..." 
          value={problem} 
          onChange={e=>setProblem(e.target.value)} 
        />
      </div>
      
      {/* Advanced Rule Pack Selection */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="block text-sm font-medium">Rule Pack Selection</label>
          <button 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-blue-600 underline"
          >
            {showAdvanced ? "Hide Advanced" : "Advanced → Override pack"}
          </button>
        </div>
        {showAdvanced && (
          <div className="bg-zinc-900 text-zinc-100 border border-zinc-800 rounded-2xl p-3">
            {loading ? (
              <div className="text-center py-4">Loading Rule Packs...</div>
            ) : (
              <select className="bg-zinc-900 text-zinc-100 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md px-3 py-2 w-full" value={rpKey} onChange={e=>setRpKey(e.target.value)}>
                <option value="">Auto-select from problem description</option>
                {packs.filter((p:any) => p.Key?.endsWith('.v2')).map((p:any) => 
                  <option key={p.id} value={p.Key}>{p.Key} ({p.EquipmentType || "Any"})</option>
                )}
              </select>
            )}
            <div className="text-xs text-zinc-400 mt-2">
              Leave empty to auto-select based on problem description and equipment type.
            </div>
            {overrideHint && (
              <div className="text-xs text-orange-600 mt-2 font-medium">
                {overrideHint}
              </div>
            )}
            {rpKey && (
              <button
                onClick={handleManualPackSelection}
                disabled={busy}
                className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
              >
                {busy ? "Processing..." : "Use Selected Pack"}
              </button>
            )}
          </div>
        )}
        {!showAdvanced && (
          <div className="text-sm text-zinc-400">
            Rule pack will be auto-selected from problem description
          </div>
        )}
      </div>
      
      <button 
        onClick={createSession} 
        disabled={busy || !problem.trim()} 
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? "Creating..." : "Create Session"}
      </button>
      
      {/* Rig Selection Modal */}
      {showRigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 text-zinc-100 border border-zinc-800 shadow-xl rounded-2xl p-6 max-w-md w-full max-h-96 overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Select Rig</h3>
            <div className="space-y-2">
              {rigs.map((rig) => (
                <button
                  key={rig.id}
                  onClick={() => {
                    setSelectedRig(rig);
                    setShowRigModal(false);
                  }}
                  className="w-full text-left p-2 border border-zinc-700 rounded hover:bg-zinc-800 text-zinc-100"
                >
                  <div className="font-medium">{rig.Name}</div>
                  {rig.Type && <div className="text-sm text-zinc-400">{rig.Type}</div>}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowRigModal(false)}
              className="mt-4 px-4 py-2 border border-zinc-700 rounded bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Equipment Instance Modal */}
      {showEquipmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 text-zinc-100 border border-zinc-800 shadow-xl rounded-2xl p-6 max-w-md w-full max-h-96 overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Select or Create Equipment Instance</h3>
            
            {/* Existing Equipment Instances */}
            <div className="mb-4">
              <h4 className="font-medium mb-2">Existing Equipment:</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {equipmentInstances.map((instance) => (
                  <button
                    key={instance.id}
                    onClick={() => {
                      setSelectedEquipmentInstance(instance);
                      setShowEquipmentModal(false);
                    }}
                    className="w-full text-left p-2 border border-zinc-700 rounded hover:bg-zinc-800 text-zinc-100"
                  >
                    <div className="font-medium">{instance.Name}</div>
                    {instance.SerialNumber && <div className="text-sm text-zinc-400">S/N: {instance.SerialNumber}</div>}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Create New Equipment Instance */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Create New Equipment:</h4>
              <div className="space-y-2">
                <input
                  className="bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md px-3 py-2 w-full"
                  placeholder="Equipment Name *"
                  value={newEquipmentName}
                  onChange={e => setNewEquipmentName(e.target.value)}
                />
                <input
                  className="bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md px-3 py-2 w-full"
                  placeholder="Serial Number (optional)"
                  value={newEquipmentSerial}
                  onChange={e => setNewEquipmentSerial(e.target.value)}
                />
                <select
                  className="bg-zinc-900 text-zinc-100 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md px-3 py-2 w-full"
                  value={newEquipmentType}
                  onChange={e => setNewEquipmentType(e.target.value)}
                >
                  <option value="">Select Equipment Type (optional)</option>
                  {equipmentTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.Name}</option>
                  ))}
                </select>
                <input
                  className="bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md px-3 py-2 w-full"
                  placeholder="PLC Project Doc Link (optional)"
                  value={newEquipmentPLCProject}
                  onChange={e => setNewEquipmentPLCProject(e.target.value)}
                />
                <button
                  onClick={createEquipmentInstance}
                  disabled={!newEquipmentName.trim()}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                >
                  Create Equipment
                </button>
              </div>
            </div>
            
            <button 
              onClick={() => setShowEquipmentModal(false)}
              className="mt-4 px-4 py-2 border border-zinc-700 rounded bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

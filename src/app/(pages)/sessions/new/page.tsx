"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SessionCreateForm from "./SessionCreateForm";
import DebugPanel from "./DebugPanel";

type RigRow = { id: string; name: string };

function RigPickerModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (rig: RigRow) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [rigs, setRigs] = useState<RigRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchRigs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const ctrl = new AbortController();
      const timeoutId = setTimeout(() => ctrl.abort(), 9000);
      const response = await fetch("/api/rigs/list", { signal: ctrl.signal });
      clearTimeout(timeoutId);
      const data = await response.json().catch(() => ({}));
      
      if (!response.ok || !data?.ok) {
        const errorMsg = response.status === 504 ? "Unable to load rigs (timeout)" : (data?.error || `HTTP ${response.status}`);
        throw new Error(errorMsg);
      }
      
      const rigList = Array.isArray(data.rigs) ? data.rigs : [];
      setRigs(rigList);
    } catch (e: any) {
      const errorMsg = e.name === 'AbortError' 
        ? "Unable to load rigs (timeout)" 
        : (e.message || String(e));
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    fetchRigs();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-[520px] max-w-[92vw] rounded-2xl bg-neutral-900 p-6 shadow-xl">
        <div className="text-lg font-semibold mb-3">Select Rig</div>

        {loading && <div className="text-sm text-neutral-300">Loading rigs…</div>}

        {!loading && error && (
          <div className="text-xs text-red-400">
            {error}. 
            <button 
              onClick={() => fetchRigs()}
              className="ml-1 px-1 py-0.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && rigs.length === 0 && (
          <div className="text-sm text-neutral-300">
            No rigs found. Create one in Airtable or continue without selecting a rig.
          </div>
        )}

        {!loading && !error && rigs.length > 0 && (
          <div className="mt-2 max-h-[300px] overflow-auto space-y-2">
            {rigs.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  onPick(r);
                  onClose();
                }}
                className="w-full rounded-lg bg-neutral-800 hover:bg-neutral-700 px-3 py-2 text-left"
              >
                {r.name}
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [packs, setPacks] = useState<any[]>([]);
  const [rpKey, setRpKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [overrideHint, setOverrideHint] = useState("");
  
  // New state for equipment selection
  const [showRigModal, setShowRigModal] = useState(false);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [selectedEquipmentInstance, setSelectedEquipmentInstance] = useState<EquipmentInstance | null>(null);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [equipmentInstances, setEquipmentInstances] = useState<EquipmentInstance[]>([]);
  
  // Additional state for rig/equipment selection
  const [selectedRigId, setSelectedRigId] = useState<string>("");
  const [selectedRigName, setSelectedRigName] = useState<string>("");
  const [selectedTypeName, setSelectedTypeName] = useState<string>("");
  
  // New equipment instance creation
  const [newEquipmentName, setNewEquipmentName] = useState("");
  const [newEquipmentSerial, setNewEquipmentSerial] = useState("");
  const [newEquipmentType, setNewEquipmentType] = useState("");
  const [newEquipmentPLCProject, setNewEquipmentPLCProject] = useState("");
  const [equipmentCreateError, setEquipmentCreateError] = useState<string|null>(null);
  const [equipmentCreating, setEquipmentCreating] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        // Load equipment types
        const etRes = await fetch("/api/equipment/types");
        const etData = await etRes.json();
        if (etData.ok) setEquipmentTypes(etData.types || []);
        
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
  // DISABLED: Rule pack loading deferred until after session creation
  // useEffect(() => {
  //   if (selectedEquipmentInstance?.EquipmentType?.[0]) {
  //     (async () => {
  //       try {
  //         const equipmentType = selectedEquipmentInstance.EquipmentType![0];
  //         const r = await fetch(`/api/rulepacks/list?type=${encodeURIComponent(equipmentType)}`);
  //         const j = await r.json();
  //         if (j.ok) {
  //           // Only show .v2 packs
  //           const v2Packs = j.packs.filter((pack: any) => pack.key?.endsWith('.v2'));
  //           setPacks(v2Packs);
  //         }
  //       } catch (e) {
  //         console.log("Failed to load filtered packs:", e);
  //       }
  //     })();
  //   }
  // }, [selectedEquipmentInstance]);

  async function handleManualPackSelection() {
    if (!rpKey) {
      alert("Please select a rule pack");
      return;
    }
    
    // When user clicks "Use Selected Pack", do NOT call update yet; just store the selected key in state
    setRpKey(rpKey);
    setShowAdvanced(false);
    setOverrideHint("");
  }

  
  async function createEquipmentInstance() {
    if (!newEquipmentName.trim()) {
      setEquipmentCreateError("Please enter equipment name");
      return;
    }
    
    setEquipmentCreating(true);
    setEquipmentCreateError(null);
    
    try {
      const body = { 
        name: newEquipmentName, 
        rigId: selectedRigId || undefined,
        rigName: selectedRigName || undefined,
        typeName: selectedTypeName || undefined,
        serial: newEquipmentSerial || undefined,
        plcDocUrl: newEquipmentPLCProject || undefined
      };
      
      const ctrl = new AbortController();
      const timeoutId = setTimeout(() => ctrl.abort(), 10000);
      const res = await fetch("/api/equipment/instances/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(timeoutId);
      
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        const errorMsg = res.status === 504 ? "Equipment creation timed out" : (json?.error || `HTTP ${res.status}`);
        throw new Error(errorMsg);
      }
      
      // Success — reflect selection in parent state
      setSelectedEquipmentInstance({ id: json.id, Name: json.name || newEquipmentName, SerialNumber: newEquipmentSerial });
      setEquipmentCreating(false);
      // Close modal
      setShowEquipmentModal(false);
      setNewEquipmentName("");
      setNewEquipmentSerial("");
      setNewEquipmentType("");
      setNewEquipmentPLCProject("");
    } catch (e: any) {
      const errorMsg = e.name === 'AbortError' 
        ? "Equipment creation timed out" 
        : (e?.message || "Network error");
      setEquipmentCreateError(errorMsg);
      setEquipmentCreating(false);
    }
  }

  return (
    <main className="p-6 max-w-2xl space-y-4" role="group">
      <h1 className="text-2xl font-bold">Start a New Session</h1>
      
      {/* Rig Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Rig</label>
        <div className="flex gap-2">
          <input 
            className="bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md px-3 py-2 flex-1" 
            placeholder="Rig Name (optional)" 
            value={rigName} 
            onChange={e=>setRigName(e.target.value)} 
          />
          <button 
            type="button"
            onClick={() => setShowRigModal(true)}
            className="px-3 py-2 border rounded text-sm"
          >
            Select Rig
          </button>
        </div>
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
            type="button"
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
              type="button"
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
        <SessionCreateForm 
          rigId={selectedRigId}
          equipmentId={selectedEquipmentInstance?.id}
        />
      </div>
      
      {/* Advanced Rule Pack Selection */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="block text-sm font-medium">Rule Pack Selection</label>
          <button 
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-blue-600 underline"
          >
            {showAdvanced ? "Hide Advanced" : "Advanced → Override pack"}
          </button>
        </div>
        {showAdvanced && (
          <div className="bg-zinc-900 text-zinc-100 border border-zinc-800 rounded-2xl p-3">
            <div className="text-center py-4 text-zinc-400">
              Rule pack selection will be available after creating the session.
            </div>
            <div className="text-xs text-zinc-400 mt-2">
              Rule packs will be auto-selected based on problem description and equipment type after session creation.
            </div>
          </div>
        )}
        {!showAdvanced && (
          <div className="text-sm text-zinc-400">
            Rule pack will be auto-selected from problem description
          </div>
        )}
      </div>
      
      
      {/* Rig Selection Modal */}
      <RigPickerModal
        open={showRigModal}
        onClose={() => setShowRigModal(false)}
        onPick={(rig) => {
          setRigName(rig.name);
          setSelectedRigId(rig.id);
          setSelectedRigName(rig.name);
        }}
      />
      
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
                  onChange={e => {
                    setNewEquipmentType(e.target.value);
                    const selectedType = equipmentTypes.find(t => t.id === e.target.value);
                    setSelectedTypeName(selectedType?.Name || "");
                  }}
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
                  type="button"
                  onClick={createEquipmentInstance}
                  disabled={equipmentCreating || !newEquipmentName.trim()}
                  className="w-full px-3 py-1 rounded bg-blue-600 disabled:opacity-60"
                >
                  {equipmentCreating ? "Creating…" : "Create"}
                </button>
                {equipmentCreateError ? <div className="text-red-400 text-xs mt-1">{equipmentCreateError}</div> : null}
              </div>
            </div>
            
            <button 
              type="button"
              onClick={() => setShowEquipmentModal(false)}
              className="mt-4 px-4 py-2 border border-zinc-700 rounded bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Debug Panel - only show if NEXT_PUBLIC_DEBUG is set */}
      {process.env.NEXT_PUBLIC_DEBUG === '1' && <DebugPanel />}
    </main>
  );
}

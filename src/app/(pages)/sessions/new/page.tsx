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
  
  // Equipment loading state
  const [equipLoading, setEquipLoading] = useState(true);
  const [equipError, setEquipError] = useState<string | null>(null);
  const [equipItems, setEquipItems] = useState<{id:string; name:string}[]>([]);
  const [manualRecId, setManualRecId] = useState("");
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");
  
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
  
  // Helpers for equipment ID validation
  const validRec = (v: string) => /^rec[a-zA-Z0-9]{14,}$/.test(v.trim());
  const effectiveEquipmentId = validRec(manualRecId) ? manualRecId.trim() : (selectedEquipmentId || "");
  const canSubmit = !!(effectiveEquipmentId || newEquipmentName.trim().length > 0);
  
  const router = useRouter();

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        // Load equipment types
        const etRes = await fetch("/api/equipment/types");
        const etData = await etRes.json();
        if (!aborted && etData.ok) setEquipmentTypes(etData.types || []);
        
        // Load equipment instances
        setEquipLoading(true);
        const res = await fetch('/api/equipment/instances');
        const data = await res.json();
        if (!aborted) {
          if (data?.ok && Array.isArray(data.items)) {
            setEquipItems(data.items);
            setEquipError(null);
          } else {
            setEquipError(data?.error || 'Failed to load equipment');
          }
        }
      } catch (e: any) {
        if (!aborted) {
          console.log("Failed to load data:", e);
          setEquipError(e?.message || 'Failed to load equipment');
        }
      } finally {
        if (!aborted) {
          setLoading(false);
          setEquipLoading(false);
        }
      }
    })();
    return () => { aborted = true; };
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
    const resolvedEquipmentId =
      manualRecId?.startsWith('rec') ? manualRecId :
      selectedEquipmentId?.startsWith('rec') ? selectedEquipmentId :
      '';

    setEquipmentCreating(true);
    setEquipmentCreateError(null);

    try {
      if (resolvedEquipmentId) {
        // Use the existing record id directly
        setSelectedEquipmentInstance({
          id: resolvedEquipmentId,
          Name: equipItems.find(it => it.id === resolvedEquipmentId)?.name || resolvedEquipmentId
        });
        setShowEquipmentModal(false);
        return;
      }

      if (!newEquipmentName.trim()) {
        setEquipmentCreateError("Please enter equipment name");
        return;
      }

      // Create new equipment via REST route
      const res = await fetch("/api/equipment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newEquipmentName.trim(),
          serial: newEquipmentSerial || undefined,
          typeId: newEquipmentType || undefined,
          note: newEquipmentPLCProject || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || data?.body || "Airtable create failed");
      }

      // Success — reflect selection in parent state
      setSelectedEquipmentInstance({
        id: data.id,
        Name: newEquipmentName.trim(),
        SerialNumber: newEquipmentSerial
      });

      // Close modal and reset form
      setShowEquipmentModal(false);
      setNewEquipmentName("");
      setNewEquipmentSerial("");
      setNewEquipmentType("");
      setNewEquipmentPLCProject("");
    } catch (e: any) {
      setEquipmentCreateError(e?.message || "Failed to create equipment");
    } finally {
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
            
            {/* Existing Equipment */}
            <div className="mb-4">
              <label className="text-xs mb-1 block">Existing Equipment:</label>
              <select
                className="w-full rounded bg-neutral-900 border border-neutral-700 p-2"
                value={selectedEquipmentId}
                onChange={(e) => setSelectedEquipmentId(e.target.value)}
              >
                <option value="">Select...</option>
                {equipItems.map(it => (
                  <option key={it.id} value={it.id}>{it.name}</option>
                ))}
              </select>
              {equipLoading && <div className="text-xs text-neutral-500 mt-1">Loading…</div>}
              {equipError && <div className="text-xs text-red-400 mt-1">{equipError}</div>}
            </div>

            {/* Manual Record ID */}
            <div className="mt-3 mb-4">
              <label className="text-xs mb-1 block">Or paste Equipment Record ID (starts with rec)</label>
              <input
                className="w-full rounded bg-neutral-900 border border-neutral-700 p-2"
                placeholder="recXXXXXXXXXXXXXX"
                value={manualRecId}
                onChange={(e) => setManualRecId(e.target.value.trim())}
              />
              <div className="text-[11px] text-neutral-500 mt-1">
                If provided, this will override the selection above.
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
                  onClick={async () => {
                    if (!canSubmit || equipmentCreating) return;
                    setEquipmentCreating(true);
                    try {
                      // Prefer existing/manual id; else create new equipment first.
                      let equipId = effectiveEquipmentId;

                      if (!equipId) {
                        // Create-new path
                        const resp = await fetch("/api/equipment/instances", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            name: newEquipmentName.trim(),
                            serial: newEquipmentSerial || undefined,
                            type: newEquipmentType || undefined,
                            plcDocUrl: newEquipmentPLCProject || undefined,
                          }),
                        });
                        const data = await resp.json();
                        if (!resp.ok || !data?.id) throw new Error(data?.error || "Failed to create equipment");
                        equipId = data.id as string;
                      }

                      // Now create the session linked to equipId
                      const DEFAULT_PROBLEM = "New troubleshooting session";
                      const payload = {
                        equipmentId: equipId,
                        problem: DEFAULT_PROBLEM,
                      };

                      const sResp = await fetch("/api/sessions/create", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                      });

                      const sData = await sResp.json().catch(() => ({}));

                      if (!sResp.ok || !sData?.ok) {
                        // Show the real server message to help diagnose
                        const msg =
                          sData?.error ||
                          sData?.body ||
                          `Failed to create session (${sResp.status})`;
                        alert(msg);
                        return;
                      }

                      // Navigate to the new session page
                      const id = sData.id as string;
                      window.location.href = `/sessions/${id}`;
                    } catch (err: any) {
                      alert(err?.message || "Failed to create session");
                    } finally {
                      setEquipmentCreating(false);
                    }
                  }}
                  disabled={!canSubmit || equipmentCreating}
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

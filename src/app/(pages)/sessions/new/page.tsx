"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SessionCreateForm from "./SessionCreateForm";

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
    <main className="p-6 max-w-2xl space-y-4" role="group">
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
            type="button"
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
              type="button"
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
        <SessionCreateForm />
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
              type="button"
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
                  type="button"
                  onClick={createEquipmentInstance}
                  disabled={!newEquipmentName.trim()}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                >
                  Create Equipment
                </button>
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
    </main>
  );
}

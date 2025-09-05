"use client";
import { useState } from "react";

export default function V2StepCard({ sessionId, nodeKey, node, onSubmitted }:{
  sessionId: string; 
  nodeKey: string; 
  node: any; 
  onSubmitted: ()=>void;
}) {
  const [value, setValue] = useState<number | undefined>();
  const [pass, setPass] = useState<boolean | undefined>();
  const [confirm, setConfirm] = useState(false);

  async function submit() {
    const payload:any = {};
    if (node.type === "measure") { 
      payload.value = value; 
      payload.unit = node.unit; 
    }
    if (node.type !== "measure") { 
      payload.pass = pass === true; 
    }
    if (node.type === "safetyGate") { 
      payload.confirm = confirm; 
    }
    
    const r = await fetch("/api/plan/v2/submit", { 
      method:"POST", 
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ sessionId, nodeKey, payload })
    });
    const j = await r.json();
    if (j.ok) onSubmitted();
  }

  return (
    <div className="rounded-2xl p-4 shadow">
      <div className="font-semibold mb-2">{node.instruction}</div>
      {node.citation && <div className="text-xs opacity-70 mb-3">{node.citation}</div>}
      
      {node.type === "measure" && (
        <div className="space-y-2">
          <input 
            type="number" 
            className="border rounded p-2 w-full" 
            placeholder={`Enter ${node.unit ?? ""}`} 
            value={value ?? ""} 
            onChange={e=>setValue(e.currentTarget.value ? Number(e.currentTarget.value) : undefined)} 
          />
          <div className="text-xs opacity-70">
            {node.expect != null ? `Expect ${node.expect} ± ${node.tolerance ?? 0} ${node.unit ?? ""}` :
             node.min != null ? `Min ${node.min} ${node.unit ?? ""}${node.max != null ? `, Max ${node.max}`:""}` : ""}
          </div>
        </div>
      )}
      
      {node.type !== "measure" && node.type !== "done" && node.type !== "note" && node.type !== "safetyGate" && (
        <div className="flex gap-2">
          <button 
            className={`border rounded px-3 py-2 ${pass === true ? 'bg-green-100 border-green-300' : ''}`}
            onClick={()=>setPass(true)}
          >
            Pass
          </button>
          <button 
            className={`border rounded px-3 py-2 ${pass === false ? 'bg-red-100 border-red-300' : ''}`}
            onClick={()=>setPass(false)}
          >
            Fail
          </button>
        </div>
      )}
      
      {node.type === "safetyGate" && (
        <label className="flex items-center gap-2 my-2">
          <input 
            type="checkbox" 
            checked={confirm} 
            onChange={e=>setConfirm(e.currentTarget.checked)} 
          />
          <span>I confirm LOTO/PPE and it's safe to proceed.</span>
        </label>
      )}
      
      <div className="mt-3">
        <button 
          className="bg-black text-white rounded px-4 py-2" 
          onClick={submit} 
          disabled={node.type === "safetyGate" && !confirm}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

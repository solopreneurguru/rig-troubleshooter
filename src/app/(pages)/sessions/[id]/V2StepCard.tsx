"use client";
import { useState } from "react";
import { Citations } from "@/components/Citations";
import { PlcReadCard } from "@/components/PlcReadCard";
import { PhotoCard } from "@/components/PhotoCard";
import { uploadToBlob } from "@/lib/upload";
import { normalizeCitations } from "@/lib/citations";

export default function V2StepCard({ sessionId, nodeKey, node, onSubmitted }:{
  sessionId: string; 
  nodeKey: string; 
  node: any; 
  onSubmitted: ()=>void;
}) {
  const [value, setValue] = useState<number | undefined>();
  const [yesNo, setYesNo] = useState<boolean | undefined>();
  const [confirmed, setConfirmed] = useState(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | undefined>();

  async function submit() {
    let payload: any = { sessionId, stepId: node.id, kind: node.type || node.kind };
    
    if (node.type === "measure" || node.kind === "measure") { 
      payload.value = value; 
    } else if (node.type === "ask" || node.kind === "ask") {
      payload.value = yesNo;
    } else if (node.type === "safetyGate") {
      payload.value = { confirmed: true };
    } else if (node.kind === "plc_read") {
      payload.plcResult = value;
    } else if (node.kind === "photo") {
      payload.photoUrl = uploadedPhotoUrl;
    }
    
    const r = await fetch("/api/plan/v2/submit", { 
      method:"POST", 
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if (j.ok) onSubmitted();
  }

  // SafetyGate rendering
  if (node.type === "safetyGate") {
    const citations = normalizeCitations(node.citations ?? node.citation);
    return (
      <div className="rounded-lg border border-red-700 bg-red-900/20 p-4 text-red-100">
        <div className="font-semibold mb-1">Safety Confirmation Required</div>
        {node.hazardNote && <div className="text-sm opacity-80 mb-2">{node.hazardNote}</div>}
        <div className="mb-3">{node.text}</div>
        {citations?.length ? (
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {citations.map((c, i) => (
              <span key={i} className="px-2 py-0.5 rounded border border-neutral-700">
                {c.type === "doc" ? `Doc${c.page ? ` p.${c.page}` : ""}` : c.type === "plc" ? `PLC ${c.tag}` : `TP ${c.label}`}
              </span>
            ))}
          </div>
        ) : null}
        <label className="flex items-center gap-2 my-2">
          <input type="checkbox" className="h-4 w-4" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
          <span>I confirm LOTO/PPE per procedure and it is safe to proceed.</span>
        </label>
        <button
          disabled={!confirmed}
          className={"mt-2 rounded px-3 py-1 " + (!confirmed ? "bg-zinc-700 text-zinc-400" : "bg-red-600 hover:bg-red-500 text-white")}
          onClick={submit}
        >
          Continue
        </button>
      </div>
    );
  }

  // Measure rendering with branching info
  if (node.type === "measure") {
    const citations = normalizeCitations(node.citations ?? node.citation);
    return (
      <div className="rounded-lg border border-blue-700 bg-blue-900/20 p-4 text-blue-100">
        <div className="font-semibold mb-1">Measurement</div>
        <div className="mb-2">{node.text}</div>
        {node.okIf && (
          <div className="text-xs opacity-80 mb-2">
            OK if {node.okIf.op} {node.okIf.value} {node.unit || ""}
          </div>
        )}
        {citations?.length ? (
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {citations.map((c, i) => (
              <span key={i} className="px-2 py-0.5 rounded border border-neutral-700">
                {c.type === "doc" ? `Doc${c.page ? ` p.${c.page}` : ""}` : c.type === "plc" ? `PLC ${c.tag}` : `TP ${c.label}`}
              </span>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="w-40 rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-white"
            value={value ?? ""}
            onChange={e => setValue(e.target.value ? Number(e.target.value) : undefined)}
            placeholder={`Enter value${node.unit ? ` in ${node.unit}` : ""}`}
          />
          <button
            className="rounded bg-blue-600 hover:bg-blue-500 px-3 py-1 text-white"
            onClick={submit}
            disabled={value === undefined}
          >
            Submit
          </button>
        </div>
      </div>
    );
  }

  // Handle new step kinds (V2Step)
  if (node.kind === "plc_read") {
    return (
      <div>
        <Citations items={node.citations} />
        <PlcReadCard 
          step={node} 
          onSubmit={(payload) => {
            setValue(payload.plcResult as any);
            submit();
          }}
        />
      </div>
    );
  }

  if (node.kind === "photo") {
    return (
      <div>
        <Citations items={node.citations} />
        <PhotoCard 
          step={node} 
          uploadedUrl={uploadedPhotoUrl}
          onSubmit={(payload) => {
            setUploadedPhotoUrl(payload.photoUrl);
            submit();
          }}
        />
      </div>
    );
  }

  if (node.kind === "info") {
    const citations = normalizeCitations(node.citations ?? node.citation);
    return (
      <div className="rounded-2xl p-4 shadow">
        <div className="font-semibold mb-2">Information</div>
        <div className="mb-3">{node.markdown || node.text}</div>
        <Citations items={node.citations} />
        {citations?.length ? (
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {citations.map((c, i) => (
              <span key={i} className="px-2 py-0.5 rounded border border-neutral-700">
                {c.type === "doc" ? `Doc${c.page ? ` p.${c.page}` : ""}` : c.type === "plc" ? `PLC ${c.tag}` : `TP ${c.label}`}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-3">
          <button 
            className="bg-black text-white rounded px-4 py-2" 
            onClick={submit}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Default rendering for legacy info, ask, end
  const citations = normalizeCitations(node.citations ?? node.citation);
  return (
    <div className="rounded-2xl p-4 shadow">
      <div className="font-semibold mb-2">Active Step</div>
      <div className="mb-3">{node.text}</div>
      <Citations items={node.citations} />
      {citations?.length ? (
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {citations.map((c, i) => (
            <span key={i} className="px-2 py-0.5 rounded border border-neutral-700">
              {c.type === "doc" ? `Doc${c.page ? ` p.${c.page}` : ""}` : c.type === "plc" ? `PLC ${c.tag}` : `TP ${c.label}`}
            </span>
          ))}
        </div>
      ) : null}
      
      {node.type === "ask" && (
        <div className="flex gap-2">
          <button 
            className={`border rounded px-3 py-2 ${yesNo === true ? 'bg-green-100 border-green-300 text-green-800' : 'bg-neutral-900 text-neutral-100 border-neutral-700'}`}
            onClick={()=>setYesNo(true)}
          >
            Yes
          </button>
          <button 
            className={`border rounded px-3 py-2 ${yesNo === false ? 'bg-red-100 border-red-300 text-red-800' : 'bg-neutral-900 text-neutral-100 border-neutral-700'}`}
            onClick={()=>setYesNo(false)}
          >
            No
          </button>
        </div>
      )}
      
      <div className="mt-3">
        <button 
          className="bg-black text-white rounded px-4 py-2" 
          onClick={submit} 
          disabled={
            (node.type === "ask" && yesNo === undefined)
          }
        >
          Continue
        </button>
      </div>
    </div>
  );
}

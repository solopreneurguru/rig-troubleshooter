"use client";
import React, { useState } from "react";
import { Citations } from "@/components/Citations";
import { PlcReadCard } from "@/components/PlcReadCard";
import { PhotoCard } from "@/components/PhotoCard";
import CitationBadge from "@/components/CitationBadge";
import CitationViewer from "@/components/CitationViewer";
import SafetyConfirmModal from "@/components/SafetyConfirmModal";
import ReadingHistoryCard from "@/components/ReadingHistoryCard";
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
  const [citationViewerOpen, setCitationViewerOpen] = useState(false);
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const [safetyStatus, setSafetyStatus] = useState<any>(null);
  const [reading, setReading] = useState<number | undefined>();
  const [readingNote, setReadingNote] = useState("");
  const [lastReading, setLastReading] = useState<any>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // Check safety status on component mount
  React.useEffect(() => {
    if (node?.requiresSafetyGate && sessionId && node?.id) {
      checkSafetyStatus();
    }
  }, [sessionId, node?.id, node?.requiresSafetyGate]);

  async function checkSafetyStatus() {
    try {
      const response = await fetch(`/api/safety/status?sessionId=${sessionId}&stepId=${node.id}`);
      const data = await response.json();
      if (data.ok) {
        setSafetyStatus(data);
        setSafetyConfirmed(data.confirmed);
      }
    } catch (error) {
      console.error("Failed to check safety status:", error);
    }
  }

  async function handleSafetyConfirm(confirmedBy: string, checklist: string[]) {
    try {
      const response = await fetch("/api/safety/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          stepId: node.id,
          confirmedBy,
          checklist
        })
      });
      
      const data = await response.json();
      if (data.ok) {
        setSafetyConfirmed(true);
        setSafetyStatus(data);
        setSafetyModalOpen(false);
      } else {
        throw new Error(data.error || "Safety confirmation failed");
      }
    } catch (error) {
      console.error("Safety confirmation error:", error);
      alert("Failed to confirm safety. Please try again.");
    }
  }

  // Render citation row component
  const CitationRow = ({ citations }: { citations: any[] }) => {
    if (!citations?.length) {
      return (
        <div className="mt-2 text-xs text-neutral-500">
          No citations yet.
        </div>
      );
    }

    return (
      <div className="mt-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-400">Why:</span>
          <div className="flex flex-wrap gap-1">
            {citations.map((citation, index) => (
              <CitationBadge
                key={index}
                citation={citation}
                onClick={() => setCitationViewerOpen(true)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render safety gate bar
  const SafetyGateBar = () => {
    if (!node?.requiresSafetyGate) return null;

    if (safetyConfirmed && safetyStatus) {
      return (
        <div className="mt-2 p-2 bg-green-900/20 border border-green-700/50 rounded text-green-200 text-xs">
          ✓ Safety confirmed by {safetyStatus.by} at {new Date(safetyStatus.at).toLocaleString()}
          {safetyStatus.checklist?.length > 0 && (
            <div className="mt-1 text-green-300">
              Checklist: {safetyStatus.checklist.join(', ')}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="mt-2 p-3 bg-red-900/20 border border-red-700 rounded">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-red-100">⚠️ Safety Confirmation Required</div>
            <div className="text-xs text-red-200 mt-1">
              This step requires safety confirmation before proceeding
            </div>
          </div>
          <button
            onClick={() => setSafetyModalOpen(true)}
            className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-sm rounded"
          >
            Confirm Safety
          </button>
        </div>
      </div>
    );
  };

  // Check if step can be submitted (safety gate check)
  const canSubmit = !node?.requiresSafetyGate || safetyConfirmed;

  async function submitMeasure() {
    if (!canSubmit) {
      alert("Please confirm safety before proceeding");
      return;
    }
    
    if (reading === undefined) {
      alert("Please enter a reading value");
      return;
    }

    try {
      const response = await fetch("/api/plan/v2/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          stepId: node.id,
          reading: {
            value: reading,
            unit: node.measure?.unit,
            note: readingNote
          }
        })
      });

      const result = await response.json();
      if (result.ok) {
        setLastReading(result.reading);
        // Show success message
        const passFailText = result.pass ? "PASS" : "FAIL";
        alert(`Recorded ${result.reading.value} ${result.reading.unit} → ${passFailText}`);
        
        // Navigate to next step or complete
        if (result.nextStepId) {
          onSubmitted(); // This will refresh to get the next step
        } else {
          onSubmitted(); // Complete the workflow
        }
      } else {
        throw new Error(result.error || "Submit failed");
      }
    } catch (error) {
      console.error("Measure submit error:", error);
      alert("Failed to record reading. Please try again.");
    }
  }

  async function submit() {
    if (!canSubmit) {
      alert("Please confirm safety before proceeding");
      return;
    }
    
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
      <>
      <div className="rounded-lg border border-red-700 bg-red-900/20 p-4 text-red-100">
        <div className="font-semibold mb-1">Safety Confirmation Required</div>
        {node.hazardNote && <div className="text-sm opacity-80 mb-2">{node.hazardNote}</div>}
        <div className="mb-3">{node.text}</div>
        <CitationRow citations={citations} />
        <SafetyGateBar />
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
      <CitationViewer
        citations={citations}
        isOpen={citationViewerOpen}
        onClose={() => setCitationViewerOpen(false)}
      />
      </>
    );
  }

  // Measure rendering with branching info
  if (node.type === "measure") {
    const citations = normalizeCitations(node.citations ?? node.citation);
    return (
      <>
      <div className="rounded-lg border border-blue-700 bg-blue-900/20 p-4 text-blue-100">
        <div className="font-semibold mb-1">Measurement</div>
        <div className="mb-2">{node.text}</div>
        {node.okIf && (
          <div className="text-xs opacity-80 mb-2">
            OK if {node.okIf.op} {node.okIf.value} {node.unit || ""}
          </div>
        )}
        <CitationRow citations={citations} />
        <SafetyGateBar />
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="w-40 rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-white"
            value={value ?? ""}
            onChange={e => setValue(e.target.value ? Number(e.target.value) : undefined)}
            placeholder={`Enter value${node.unit ? ` in ${node.unit}` : ""}`}
          />
          <button
            className="rounded bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:text-gray-400 px-3 py-1 text-white"
            onClick={submit}
            disabled={value === undefined || !canSubmit}
          >
            Submit
          </button>
        </div>
      </div>
      <CitationViewer
        citations={citations}
        isOpen={citationViewerOpen}
        onClose={() => setCitationViewerOpen(false)}
      />
      </>
    );
  }

  // Handle V2 measure steps with new spec system
  if (node.kind === "measure" && node.measure) {
    const citations = normalizeCitations(node.citations ?? node.citation);
    return (
      <>
      <div className="rounded-lg border border-blue-700 bg-blue-900/20 p-4 text-blue-100">
        <div className="font-semibold mb-1">Measurement</div>
        <div className="mb-2">{node.instruction || node.text}</div>
        
        {node.measure.points && (
          <div className="text-sm opacity-80 mb-2">
            <strong>Points:</strong> {node.measure.points}
          </div>
        )}
        
        <div className="text-sm opacity-80 mb-3">
          <strong>Expect:</strong> {node.measure.expect}
        </div>
        
        <CitationRow citations={citations} />
        <SafetyGateBar />
        
        {lastReading && (
          <div className={`mt-2 p-2 rounded text-xs ${lastReading.pass ? 'bg-green-900/20 border border-green-700/50 text-green-200' : 'bg-red-900/20 border border-red-700/50 text-red-200'}`}>
            Last reading: {lastReading.value} {lastReading.unit} → <strong>{lastReading.pass ? 'PASS' : 'FAIL'}</strong>
            <div className="mt-1 opacity-80">Spec: {lastReading.spec}</div>
          </div>
        )}
        
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="any"
              className="w-32 rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-white"
              value={reading ?? ""}
              onChange={e => setReading(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Enter value"
            />
            <span className="text-sm opacity-70">{node.measure.unit}</span>
          </div>
          
          <input
            type="text"
            className="w-full rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-white text-sm"
            value={readingNote}
            onChange={e => setReadingNote(e.target.value)}
            placeholder="Optional note"
          />
          
          <button
            className="rounded bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:text-gray-400 px-4 py-2 text-white"
            onClick={submitMeasure}
            disabled={reading === undefined || !canSubmit}
          >
            Record Reading
          </button>
        </div>
        
        {/* History Section */}
        <div className="mt-3 border-t border-neutral-700 pt-3">
          <button
            onClick={() => setHistoryExpanded(!historyExpanded)}
            className="flex items-center gap-2 text-sm text-neutral-300 hover:text-neutral-100"
          >
            <span>{historyExpanded ? '▼' : '▶'}</span>
            History
          </button>
          
          {historyExpanded && (
            <div className="mt-2">
              <ReadingHistoryCard
                sessionId={sessionId}
                stepId={node.id}
                stepUnit={node.measure.unit}
              />
            </div>
          )}
        </div>
      </div>
      
      <CitationViewer
        citations={citations}
        isOpen={citationViewerOpen}
        onClose={() => setCitationViewerOpen(false)}
      />
      
      <SafetyConfirmModal
        isOpen={safetyModalOpen}
        onClose={() => setSafetyModalOpen(false)}
        onConfirm={handleSafetyConfirm}
        checklist={node?.safetyChecklist || []}
        stepInstruction={node?.instruction || node?.text}
      />
      </>
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
      <>
      <div className="rounded-2xl p-4 shadow">
        <div className="font-semibold mb-2">Information</div>
        <div className="mb-3">{node.markdown || node.text}</div>
        <Citations items={node.citations} />
        <CitationRow citations={citations} />
        <SafetyGateBar />
        <div className="mt-3">
          <button 
            className="bg-black text-white disabled:bg-gray-600 disabled:text-gray-400 rounded px-4 py-2" 
            onClick={submit}
            disabled={!canSubmit}
          >
            Continue
          </button>
        </div>
      </div>
      <CitationViewer
        citations={citations}
        isOpen={citationViewerOpen}
        onClose={() => setCitationViewerOpen(false)}
      />
      </>
    );
  }

  // Default rendering for legacy info, ask, end
  const citations = normalizeCitations(node.citations ?? node.citation);
  return (
    <>
    <div className="rounded-2xl p-4 shadow">
      <div className="font-semibold mb-2">Active Step</div>
      <div className="mb-3">{node.text}</div>
      <Citations items={node.citations} />
      <CitationRow citations={citations} />
      <SafetyGateBar />
      
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
          className="bg-black text-white disabled:bg-gray-600 disabled:text-gray-400 rounded px-4 py-2" 
          onClick={submit} 
          disabled={
            (node.type === "ask" && yesNo === undefined) || !canSubmit
          }
        >
          Continue
        </button>
      </div>
    </div>

    <CitationViewer
      citations={citations}
      isOpen={citationViewerOpen}
      onClose={() => setCitationViewerOpen(false)}
    />
    
    <SafetyConfirmModal
      isOpen={safetyModalOpen}
      onClose={() => setSafetyModalOpen(false)}
      onConfirm={handleSafetyConfirm}
      checklist={node?.safetyChecklist || []}
      stepInstruction={node?.instruction || node?.text}
    />
  </>
  );
}

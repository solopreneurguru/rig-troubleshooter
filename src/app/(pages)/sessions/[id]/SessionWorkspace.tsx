"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FINDING_OUTCOMES, SESSIONS_RULEPACK_FIELD } from "@/lib/airtable";
import { loadRightRailData } from "@/lib/air-find";
import { isV2Pack } from "@/lib/rulepacks";
import V2StepCard from "./V2StepCard";
import { normalizeCitations } from "@/lib/citations";
import CitationsPanel from "@/components/CitationsPanel";
import ChatPanel from "./ChatPanel";
import ErrorBoundary from "@/components/ErrorBoundary";
import DocsPanel from "./DocsPanel";
import React from "react";

type Step = { 
  key: string; 
  instruction: string; 
  expect?: string; 
  citation?: string; 
  unit?: string;
  hazardNote?: string;
  requireConfirm?: boolean;
};

type Tech = {
  id: string;
  name: string;
  email: string;
};

export default function SessionWorkspace({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const debugSafety = searchParams.get('debug') === 'safety';
  
  // Server-side redirect handles undefined sessionId
  
  const [actionId, setActionId] = useState<string>("");
  const [step, setStep] = useState<Step | null>(null);
  const [order, setOrder] = useState<number>(1);
  const [value, setValue] = useState<string>("");
  const [pass, setPass] = useState<boolean>(true);
  const [status, setStatus] = useState<string>("");
  const [safetyConfirmed, setSafetyConfirmed] = useState<boolean>(false);
  const [hazardNote, setHazardNote] = useState<string>("");
  const [tech, setTech] = useState<Tech | null>(null);
  const [fTitle, setFTitle] = useState("");
  const [fOutcome, setFOutcome] = useState("Resolved");
  const [fSummary, setFSummary] = useState("");
  const [fParts, setFParts] = useState("");
  const [reportURL, setReportURL] = useState("");
  
  // V2 state
  const [isV2, setIsV2] = useState<boolean>(false);
  const [v2NodeKey, setV2NodeKey] = useState<string>("");
  const [v2Node, setV2Node] = useState<any>(null);
  const [systemMessagePosted, setSystemMessagePosted] = useState<boolean>(false);
  const [rulePackKey, setRulePackKey] = useState<string>("");
  
  // Rule pack selection state
  const [packs, setPacks] = useState<Array<{key:string; isV2:boolean; equipmentTypeName?:string}>>([]);
  const [pendingPack, setPendingPack] = useState<string>("");
  
  // Fallback UI state
  const [showAll, setShowAll] = useState(false);
  const [allV2, setAllV2] = useState<any[]|null>(null);
  const [attachId, setAttachId] = useState<string>("");
  
  // Right rail state
  const [rr, setRR] = useState<{signals:any[]; testpoints:any[]; similar:any[]}>({signals:[],testpoints:[],similar:[]});
  const [equipmentId, setEquipmentId] = React.useState<string | null>(null);

  // 1) Try URL ?rec=… first (if you want to allow deep-links)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const rec = params.get("rec");
    if (rec && rec.startsWith("rec")) setEquipmentId(rec);
  }, []);

  // 2) If still missing, ask the new API for this session's equipment id
  React.useEffect(() => {
    if (equipmentId) return;
    let aborted = false;
    (async () => {
      try {
        const res = await fetch(`/api/sessions/equipment?id=${encodeURIComponent(sessionId)}`);
        const data = await res.json();
        if (!aborted && data?.ok && data?.equipmentId?.startsWith("rec")) {
          setEquipmentId(data.equipmentId);
        }
      } catch {}
    })();
    return () => { aborted = true; };
  }, [sessionId, equipmentId]);

  useEffect(() => {
    // Load tech from localStorage
    const savedTech = localStorage.getItem("tech");
    if (savedTech) {
      try {
        setTech(JSON.parse(savedTech));
      } catch (e) {
        localStorage.removeItem("tech");
      }
    }

    const init = async () => {
      // First, check if this is a v2 session
      setStatus("Checking session type...");
      const sessionRes = await fetch(`/api/sessions/${sessionId}`);
      const sessionData = await sessionRes.json();
      const rulePackKeySeen = sessionData?.session?.[SESSIONS_RULEPACK_FIELD];
      setRulePackKey(rulePackKeySeen || "");
      
      // Add console.log for verification
      console.log({ sessionId, rulePackKeySeen });
      
      // Check if there are zero actions and post system message
      const actionsRes = await fetch(`/api/sessions/${sessionId}`);
      const actionsData = await actionsRes.json();
      const actionCount = actionsData?.actions?.length || 0;
      
      if (actionCount === 0) {
        await postSystemMessage(sessionData);
      }
      
      if (rulePackKeySeen?.endsWith(".v2")) {
        setIsV2(true);
        setStatus("Loading v2 step...");
        
        const res = await fetch(`/api/plan/v2/next?sessionId=${sessionId}`);
        const json = await res.json();
        if (json.ok) {
          if (json.done) {
            setV2NodeKey("");
            setV2Node(null);
            setStatus("Plan complete.");
          } else {
            setV2NodeKey(json.step.id);
            setV2Node(json.step);
            setStatus("");
          }
        } else {
          setStatus(json.error || "Failed to fetch v2 step");
        }
      } else if (rulePackKeySeen) {
        // V1 session
        setIsV2(false);
        setStatus("Fetching first step...");
        const res = await fetch("/api/plan/next", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            sessionId, 
            order: 1,
            debug: debugSafety ? 'safety' : undefined
          }),
        });
        const json = await res.json();
        if (json.ok) { 
          setActionId(json.actionId); 
          setStep(json.step); 
          setOrder(json.order); 
          setStatus(""); 
        } else {
          setStatus(json.error || "Failed to fetch first step");
        }
      } else {
        // No rule pack set - show selection control
        setIsV2(false);
        setStatus("No rule pack selected. Please select one below.");
      }
    };
    init();
  }, [sessionId, debugSafety]);

  // Load v2 packs when RulePackKey is missing
  useEffect(() => {
    if (!rulePackKey) {
      fetch("/api/rulepacks/list", { cache: "no-store" })
        .then(r => r.json())
        .then(d => { if (d?.ok) setPacks(d.items || []); })
        .catch(() => setPacks([]));
    }
  }, [rulePackKey]);

  // Load right-rail data
  useEffect(() => {
    // fetch session to get EquipmentInstance + FailureMode (adapt to your data flow)
    (async () => {
      try {
        const s = await fetch(`/api/sessions/${sessionId}`).then(r=>r.json());
        const equipId = s?.session?.EquipmentInstance?.[0];
        const failureMode = s?.session?.FailureMode;
        const data = await loadRightRailData({ equipmentId: equipId, failureMode });
        setRR(data);
      } catch (e) {
        console.log("Failed to load right-rail data:", e);
      }
    })();
  }, [sessionId]);

  async function submit() {
    if (!step) return;
    if (step.requireConfirm && !safetyConfirmed) {
      alert("Please confirm safety before proceeding");
      return;
    }
    setStatus("Submitting reading...");
    const res = await fetch("/api/plan/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, actionId, stepKey: step.key, value, pass, unit: step.unit, order }),
    });
    const json = await res.json();
    if (json.ok && !json.done) {
      setActionId(json.actionId);
      setStep(json.step);
      setOrder(json.order);
      setValue("");
      setPass(true);
      setSafetyConfirmed(false);
      setHazardNote("");
      setStatus("");
    } else if (json.ok && json.done) {
      setStatus("Plan complete. You can close the session or escalate.");
      setStep(null);
    } else {
      setStatus(json.error || "Submit failed");
    }
  }

  async function confirmHazard() {
    if (!tech || !actionId) return;
    
    setStatus("Confirming safety...");
    try {
      const res = await fetch("/api/actions/confirm-hazard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId, hazardNote, techId: tech.id }),
      });
      
      const json = await res.json();
      if (json.ok) {
        setSafetyConfirmed(true);
        setStatus("Safety confirmed. You can now proceed.");
      } else {
        setStatus("Confirmation failed: " + json.error);
      }
    } catch (e) {
      setStatus("Confirmation failed: " + e);
    }
  }

  async function saveFinding() {
    setStatus("Saving finding & generating report...");
    const res = await fetch("/api/findings/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, title: fTitle || `Finding ${Date.now()}`, outcome: fOutcome, summary: fSummary, parts: fParts }),
    });
    const json = await res.json();
    if (json.ok) {
      setStatus("Finding saved.");
      if (json.reportUrl) setReportURL(json.reportUrl);
    } else {
      setStatus(json.error || "Failed to save finding.");
    }
  }

  async function handleV2Submitted() {
    // Refresh the page to get the next step
    router.refresh();
  }

  async function postSystemMessage(sessionData: any) {
    if (systemMessagePosted) return;
    
    try {
      const equipmentName = sessionData?.session?.EquipmentInstance?.[0] ? 
        await fetch(`/api/equipment/instances/${sessionData.session.EquipmentInstance[0]}`)
          .then(r => r.json())
          .then(data => data.instance?.Name || "Unknown Equipment")
          .catch(() => "Unknown Equipment") : "Unknown Equipment";
      
      const failureMode = sessionData?.session?.FailureMode || "Unknown Issue";
      
      const message = `I interpreted this as ${equipmentName} / ${failureMode}. I'll start with document intake then first checks.`;
      
      await fetch("/api/intake/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          sessionId, 
          text: message,
          isSystem: true 
        })
      });
      
      setSystemMessagePosted(true);
    } catch (e) {
      console.log("Failed to post system message:", e);
    }
  }

  async function attachPack() {
    if (!pendingPack || !sessionId) return;
    const r = await fetch("/api/sessions/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sessionId, patch: { RulePackKey: pendingPack } })
    });
    const j = await r.json();
    if (j?.ok) location.reload();
    else alert(j?.error || "Failed to attach pack");
  }

  return (
    <div className="grid grid-cols-12 gap-4 p-6">
      {/* TOP: Session Header with Report Link */}
      <div className="col-span-12 flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Session: {sessionId}</h1>
        {sessionId ? (
          <a
            href={`/api/report/${sessionId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors"
            title="Generate and open PDF report in new tab"
          >
            📄 Open Report (PDF)
          </a>
        ) : (
          <button
            disabled
            className="inline-flex items-center gap-2 px-3 py-1 bg-gray-600 text-gray-400 text-sm rounded cursor-not-allowed"
            title="Session not ready"
          >
            📄 Open Report (PDF)
          </button>
        )}
      </div>
      
      {/* LEFT: Chat Panel */}
      <div className="col-span-3">
        <ErrorBoundary>
          <ChatPanel sessionId={sessionId} />
        </ErrorBoundary>
      </div>
      {/* CENTER: Main Content */}
      <div className="col-span-6 space-y-4">
        
        {/* Inline v2 pack picker */}
        {!rulePackKey && (
          <div className="mb-4 rounded-md border border-yellow-700 bg-yellow-900/30 p-3 text-yellow-100">
            <div className="font-semibold">Select Rule Pack (.v2)</div>
            <div className="text-sm opacity-80 mb-2">No rule pack selected. Pick a v2 pack below.</div>
            {!packs || packs.filter(isV2Pack).length === 0 ? (
              <div className="rounded p-3 bg-amber-900/30 border border-amber-800">
                <div className="mb-2 text-amber-200">No v2 packs found for this equipment.</div>
                <div className="text-xs mb-3 opacity-80">
                  Tip: this can happen if EQUIPINSTANCES_TYPE_FIELD isn't set. You can still attach any active v2 pack below.
                </div>
                {!showAll ? (
                  <button type="button" className="px-3 py-1 rounded bg-neutral-700" onClick={async () => {
                    setShowAll(true);
                    try {
                      const res = await fetch("/api/rulepacks/all-v2"); // see Step 3
                      const json = await res.json();
                      setAllV2(json?.packs ?? []);
                    } catch {}
                  }}>
                    Show all v2 packs
                  </button>
                ) : (
                  <div className="flex gap-2 items-center">
                    <select className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1"
                      value={attachId} onChange={(e)=>setAttachId(e.target.value)}>
                      <option value="">— choose a v2 pack —</option>
                      {(allV2 ?? []).map((p)=>(
                        <option key={p.id} value={p.fields?.Key || p.Key}>
                          {p.fields?.Key || p.Key}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="px-3 py-1 rounded bg-blue-600 disabled:opacity-60"
                      disabled={!attachId}
                      onClick={async ()=>{
                        const resp = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/rulepack`, {
                          method:"POST", headers:{ "content-type":"application/json" },
                          body: JSON.stringify({ key: attachId })
                        });
                        const j = await resp.json().catch(()=> ({}));
                        if (resp.ok && j?.ok) { window.location.reload(); } // re-hydrate step runner
                      }}>
                      Attach
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <select
                  className="min-w-[360px] rounded border border-zinc-600 bg-zinc-900 px-2 py-1"
                  value={pendingPack}
                  onChange={e => setPendingPack(e.target.value)}
                >
                  <option value="">— choose a v2 pack —</option>
                  {packs.filter(isV2Pack).map(p => (
                    <option key={p.key} value={p.key}>{p.key}</option>
                  ))}
                </select>
                <button className="rounded bg-blue-600 hover:bg-blue-500 px-3 py-1 text-white" onClick={attachPack}>
                  Attach
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Safety Banner - Always visible when action requires confirmation */}
        {step?.requireConfirm && (
          <div className="rounded-lg border border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-200 dark:text-amber-900 px-4 py-3">
            <strong className="font-medium">⚠️ Safety Confirmation Required:</strong> This action requires safety confirmation before proceeding.
          </div>
        )}
        
        {debugSafety && (
          <div className="rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm">
            <strong>🔧 Debug Mode:</strong> Showing safety gate step directly
          </div>
        )}
        
        {/* V2 Session Render */}
        {isV2 && v2Node ? (
          <ErrorBoundary>
            <V2StepCard 
              sessionId={sessionId}
              nodeKey={v2NodeKey}
              node={v2Node}
              onSubmitted={handleV2Submitted}
            />
          </ErrorBoundary>
        ) : !isV2 && step ? (
        <div className="rounded-xl border p-4 space-y-2">
          <div className="text-sm opacity-70">Step key: {step.key} • Order {order}</div>
          <p className="text-base">{step.instruction}</p>
          {step.expect && <p className="text-sm opacity-80"><strong>Expect:</strong> {step.expect}</p>}
          {step.citation && <p className="text-xs opacity-60"><strong>Why:</strong> {step.citation}</p>}
          {(() => {
            const citations = normalizeCitations(step.citation);
            return citations?.length ? (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {citations.map((c, i) => (
                  <span key={i} className="px-2 py-0.5 rounded border border-neutral-700">
                    {c.type === "doc" ? `Doc${c.page ? ` p.${c.page}` : ""}` : c.type === "plc" ? `PLC ${c.tag}` : `TP ${c.label}`}
                  </span>
                ))}
              </div>
            ) : null;
          })()}
          
          {step.hazardNote && (
            <div className="rounded-lg border border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-200 dark:text-amber-900 px-4 py-3">
              <strong className="font-medium">⚠️ Safety Warning:</strong> {step.hazardNote}
            </div>
          )}
          
          <div className="space-y-2 pt-2">
            <div className="flex gap-2">
              <input 
                className="flex-1 border rounded p-2 bg-neutral-900 text-neutral-100 border-neutral-700 placeholder:text-neutral-400" 
                placeholder="Enter reading/value" 
                value={value} 
                onChange={e => setValue(e.target.value)} 
              />
              {step.unit && (
                <span className="px-3 py-2 bg-gray-100 border rounded text-sm flex items-center">
                  {step.unit}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <label>
                <input 
                  type="radio" 
                  name="pf" 
                  checked={pass} 
                  onChange={() => setPass(true)} 
                /> Pass
              </label>
              <label>
                <input 
                  type="radio" 
                  name="pf" 
                  checked={!pass} 
                  onChange={() => setPass(false)} 
                /> Fail
              </label>
            </div>
            
            {step.requireConfirm && !tech && (
              <div className="rounded-lg border border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-200 dark:text-amber-900 px-4 py-3">
                <strong className="font-medium">⚠️ Safety Confirmation Required:</strong> Sign in as a technician to proceed.
              </div>
            )}
            
            {step.requireConfirm && tech && !safetyConfirmed && (
              <div className="space-y-3 p-3 border border-blue-200 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium">Safety Confirmation Required</div>
                <label className="flex items-center gap-2 text-sm">
                  <input 
                    type="checkbox" 
                    checked={safetyConfirmed} 
                    onChange={e => setSafetyConfirmed(e.target.checked)} 
                  />
                  I have applied LOTO/PPE and controls are safe
                </label>
                <textarea
                  className="w-full border rounded p-2 text-sm bg-neutral-900 text-neutral-100 border-neutral-700 placeholder:text-neutral-400"
                  placeholder="Additional safety notes (optional)"
                  rows={2}
                  value={hazardNote}
                  onChange={e => setHazardNote(e.target.value)}
                />
                <button
                  onClick={confirmHazard}
                  disabled={!safetyConfirmed}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded disabled:opacity-50"
                >
                  Confirm Safety
                </button>
              </div>
            )}
            
            {step.requireConfirm && tech && safetyConfirmed && (
              <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm">
                <strong>✅ Safety Confirmed:</strong> {tech.name} has confirmed safety procedures.
              </div>
            )}
            
            <button 
              onClick={submit} 
              disabled={step.requireConfirm && !safetyConfirmed}
              className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
        ) : (
          <div className="rounded-xl border p-4">
            No active step. {status || "Start a new session or refresh."}
          </div>
        )}
      {(!step && !v2Node) && (
        <div className="rounded-xl border p-4 space-y-2">
          <h2 className="font-semibold">Create Finding & Report</h2>
          <input 
            className="w-full border rounded p-2 bg-neutral-900 text-neutral-100 border-neutral-700 placeholder:text-neutral-400" 
            placeholder="Finding title" 
            value={fTitle} 
            onChange={e => setFTitle(e.target.value)} 
          />
          <select 
            className="w-full border rounded p-2 bg-neutral-900 text-neutral-100 border-neutral-700" 
            value={fOutcome} 
            onChange={e => setFOutcome(e.target.value)}
          >
            {FINDING_OUTCOMES.map(outcome => (
              <option key={outcome} value={outcome}>{outcome}</option>
            ))}
          </select>
          <textarea 
            className="w-full border rounded p-2 bg-neutral-900 text-neutral-100 border-neutral-700 placeholder:text-neutral-400" 
            placeholder="Summary" 
            rows={3} 
            value={fSummary} 
            onChange={e => setFSummary(e.target.value)} 
          />
          <textarea 
            className="w-full border rounded p-2 bg-neutral-900 text-neutral-100 border-neutral-700 placeholder:text-neutral-400" 
            placeholder="Parts needed (optional)" 
            rows={3} 
            value={fParts} 
            onChange={e => setFParts(e.target.value)} 
          />
          <button 
            onClick={saveFinding} 
            className="px-4 py-2 rounded bg-black text-white"
          >
            Save finding & generate PDF
          </button>
          {reportURL && (
            <p className="text-sm">
              Report: <a className="text-blue-600 underline" href={reportURL} target="_blank" rel="noopener noreferrer">{reportURL}</a>
            </p>
          )}
        </div>
      )}
      {status && <p className="text-sm">{status}</p>}
        <div className="mt-6 rounded-xl border border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-200 dark:text-amber-900 px-4 py-3">
          <strong className="font-medium">Safety First:</strong> Follow LOTO and OEM procedures. Do not energize/override interlocks unless authorized and safe.
        </div>
      </div>
      
      {/* RIGHT: Citations & Data */}
      <aside className="col-span-3 space-y-4">
        {/* Citations Panel */}
        {(() => {
          const currentCitations = isV2 && v2Node 
            ? normalizeCitations(v2Node.citations ?? v2Node.citation)
            : !isV2 && step 
            ? normalizeCitations(step.citation)
            : [];
          const equipmentId = rr.testpoints.length > 0 ? rr.testpoints[0].fields.Equipment?.[0] : undefined;
          return <CitationsPanel citations={currentCitations} equipmentId={equipmentId} />;
        })()}

        <div className="space-y-4">
          <div className="text-sm font-semibold">Docs / Test Points</div>
          {equipmentId ? (
            <DocsPanel equipmentId={equipmentId} />
          ) : (
            <div className="p-4 text-xs text-gray-500">
              Select equipment (or open a session that has Equipment linked) to see documents.
            </div>
          )}
        </div>
        
        <section>
          <h3 className="font-semibold">Docs / Test Points</h3>
          <ul className="text-sm">
            {rr.testpoints.map(tp => (
              <li key={tp.id}>
                <div className="font-medium">{tp.fields.Label} <span className="opacity-60">→ {tp.fields.Reference}</span></div>
                {tp.fields.Nominal != null && <div>Nominal: {tp.fields.Nominal} {tp.fields.Unit || ""}</div>}
                {tp.fields.DocRef?.length && tp.fields.DocPage != null && (
                  <div className="text-xs opacity-70">Ref: doc#{tp.fields.DocRef[0]} p.{tp.fields.DocPage}</div>
                )}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="font-semibold">Signals</h3>
          <ul className="text-sm">
            {rr.signals.map(sig => (
              <li key={sig.id}>
                <div className="font-medium">{sig.fields.Tag}</div>
                <div className="text-xs opacity-70">{sig.fields.Address} {sig.fields.Unit ? `• ${sig.fields.Unit}` : ""}</div>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="font-semibold">Similar Cases</h3>
          <ul className="text-sm">
            {rr.similar.map(f => (
              <li key={f.id}>
                <div className="font-medium">{f.fields.Title || "Finding"}</div>
                <div className="text-xs opacity-70">{f.fields.FailureMode || ""}</div>
                {f.fields.ReportURL && <a className="underline" href={f.fields.ReportURL} target="_blank">Report</a>}
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}

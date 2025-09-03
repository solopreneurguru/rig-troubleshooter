"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { FINDING_OUTCOMES } from "@/lib/airtable";

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

export default function SessionWorkspace() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const sessionId = params.id as string;
  const debugSafety = searchParams.get('debug') === 'safety';
  
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
    };
    init();
  }, [sessionId, debugSafety]);

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

  return (
    <main className="p-6 max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Session {sessionId}</h1>
      {debugSafety && (
        <div className="rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm">
          <strong>🔧 Debug Mode:</strong> Showing safety gate step directly
        </div>
      )}
      {step ? (
        <div className="rounded-xl border p-4 space-y-2">
          <div className="text-sm opacity-70">Step key: {step.key} • Order {order}</div>
          <p className="text-base">{step.instruction}</p>
          {step.expect && <p className="text-sm opacity-80"><strong>Expect:</strong> {step.expect}</p>}
          {step.citation && <p className="text-xs opacity-60"><strong>Why:</strong> {step.citation}</p>}
          
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
      {(!step) && (
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
    </main>
  );
}

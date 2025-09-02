"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Step = { 
  key: string; 
  instruction: string; 
  expect?: string; 
  citation?: string; 
  unit?: string;
  hazardNote?: string;
  requireConfirm?: boolean;
};

export default function SessionWorkspace() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id as string;
  const [actionId, setActionId] = useState<string>("");
  const [step, setStep] = useState<Step | null>(null);
  const [order, setOrder] = useState<number>(1);
  const [value, setValue] = useState<string>("");
  const [pass, setPass] = useState<boolean>(true);
  const [status, setStatus] = useState<string>("");
  const [safetyConfirmed, setSafetyConfirmed] = useState<boolean>(false);
  const [fTitle, setFTitle] = useState("");
  const [fOutcome, setFOutcome] = useState("Resolved");
  const [fSummary, setFSummary] = useState("");
  const [fParts, setFParts] = useState("");
  const [reportURL, setReportURL] = useState("");

  useEffect(() => {
    const init = async () => {
      setStatus("Fetching first step...");
      const res = await fetch("/api/plan/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, order: 1 }),
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
      setStatus("");
    } else if (json.ok && json.done) {
      setStatus("Plan complete. You can close the session or escalate.");
      setStep(null);
    } else {
      setStatus(json.error || "Submit failed");
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
      {step ? (
        <div className="rounded-xl border p-4 space-y-2">
          <div className="text-sm opacity-70">Step key: {step.key} • Order {order}</div>
          <p className="text-base">{step.instruction}</p>
          {step.expect && <p className="text-sm opacity-80"><strong>Expect:</strong> {step.expect}</p>}
          {step.citation && <p className="text-xs opacity-60"><strong>Why:</strong> {step.citation}</p>}
          
          {step.hazardNote && (
            <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm">
              <strong>⚠️ Safety Warning:</strong> {step.hazardNote}
            </div>
          )}
          
          <div className="space-y-2 pt-2">
            <div className="flex gap-2">
              <input 
                className="flex-1 border rounded p-2" 
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
            
            {step.requireConfirm && (
              <label className="flex items-center gap-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={safetyConfirmed} 
                  onChange={e => setSafetyConfirmed(e.target.checked)} 
                />
                I confirm it's safe to proceed
              </label>
            )}
            
            <button 
              onClick={submit} 
              disabled={step.requireConfirm && !safetyConfirmed}
              className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
            >
              Submit
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
            className="w-full border rounded p-2" 
            placeholder="Finding title" 
            value={fTitle} 
            onChange={e => setFTitle(e.target.value)} 
          />
          <select 
            className="w-full border rounded p-2" 
            value={fOutcome} 
            onChange={e => setFOutcome(e.target.value)}
          >
            <option>Resolved</option>
            <option>Escalate-Electrical</option>
            <option>Escalate-Controls</option>
            <option>Escalate-Mechanical</option>
            <option>Monitor</option>
          </select>
          <textarea 
            className="w-full border rounded p-2" 
            placeholder="Summary" 
            rows={3} 
            value={fSummary} 
            onChange={e => setFSummary(e.target.value)} 
          />
          <textarea 
            className="w-full border rounded p-2" 
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
      <div className="mt-6 rounded-xl border border-yellow-300 bg-yellow-50 p-3 text-sm">
        <strong>Safety First:</strong> Follow LOTO and OEM procedures. Do not energize/override interlocks unless authorized and safe.
      </div>
    </main>
  );
}

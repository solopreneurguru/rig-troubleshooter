import { NextResponse } from "next/server";
import { rigsFirstPage } from "@/lib/airtableSdk";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "iad1";

function jsonErr(status:number, msg:string, extra:Record<string,unknown>={}) {
  return NextResponse.json({ ok:false, error:msg, ...extra }, { status });
}

export async function GET() {
  const t0 = Date.now();
  console.log("[api] ▶ airtable/diag start");
  // Fast env sanity: if critical vars missing, return immediately
  const missing:string[] = [];
  const need = ["AIRTABLE_API_KEY","AIRTABLE_BASE_ID","TB_RIGS"];
  for (const k of need) if (!process.env[k]) missing.push(k);
  if (missing.length) {
    console.log("[api] ◀ airtable/diag env-missing", { ms: Date.now()-t0, missing });
    return jsonErr(500, "env-missing", { missing });
  }

  try {
    // Try the minimal list, but bound with 9s deadline via Promise.race fallback
    const timeout = new Promise<never>((_,rej)=>setTimeout(()=>rej(new Error("deadline 9s")), 9000));
    const rigs = await Promise.race([rigsFirstPage(), timeout]);
    console.log("[api] ◀ airtable/diag ok", { count: rigs.length, ms: Date.now()-t0 });
    return NextResponse.json({ ok:true, rigsCount: rigs.length, ms: Date.now()-t0 });
  } catch (e:any) {
    console.log("[api] ◀ airtable/diag fail", { ms: Date.now()-t0, msg: e?.message || String(e) });
    const isTimeout = (e?.message||"").includes("deadline");
    return jsonErr(isTimeout ? 503 : 500, isTimeout ? "timeout" : (e?.message || "error"), { ms: Date.now()-t0 });
  }
}
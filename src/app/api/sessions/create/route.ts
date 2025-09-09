import { NextResponse } from 'next/server';
import { createSession } from "@/lib/airtable";
import { withDeadline } from "@/lib/deadline";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const problem = (body?.problem ?? '').trim();
  const rigId = body?.rigId || null;
  const equipmentId = body?.equipmentId || null;

  if (!problem || problem.length < 3) {
    return NextResponse.json({ ok:false, error:'problem required' }, { status: 422 });
  }

  try {
    const work = (async () => {
      const id = await createSession(
        "", // title - will be computed by Airtable
        problem,
        rigId,
        body.overrideRulePackKey || undefined,
        equipmentId,
        undefined // failureMode
      );
      return NextResponse.json({ ok:true, id, redirect:`/sessions/${encodeURIComponent(id)}` }, { status: 201 });
    })();
    return await withDeadline(work, 9000, 'sessions/create');
  } catch (e:any) {
    const msg = (e?.message || '').startsWith('deadline:') ? 'timeout' : (e?.message || 'failed');
    return NextResponse.json({ ok:false, error: msg }, { status: 503 });
  }
}

// Keep method guarders if you want:
export async function GET() {
  return NextResponse.json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
}
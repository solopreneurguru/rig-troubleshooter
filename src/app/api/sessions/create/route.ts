import { NextResponse } from 'next/server';
import { withDeadline, logStart } from '@/lib/deadline';
import { createSession } from '@/lib/airtable'; // use existing

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const end = logStart('sessions/create');
  try {
    const { problem, equipId, rigId } = await req.json().catch(() => ({}));
    const text = (problem||'').trim();
    if (text.length < 3) return NextResponse.json({ ok:false, error:'problem required' }, { status: 422 });

    // Keep the minimum write set; other fields attach later
    const id = await withDeadline(
      createSession('', text, rigId, undefined, equipId, undefined),
      9000,
      'sessions/create'
    );

    end();
    return NextResponse.json({ ok:true, id, redirect:`/sessions/${encodeURIComponent(id)}` }, { status: 201 });
  } catch (e: any) {
    end();
    console.error('[api] sessions/create error', { error: e?.message || String(e) });
    return NextResponse.json({ ok:false, error: e?.message || 'timeout' }, { status: 503 });
  }
}

// Keep method guarders if you want:
export async function GET() {
  return NextResponse.json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
}
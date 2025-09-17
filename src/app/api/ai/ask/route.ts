import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { getAirtableBase, tables } from '@/lib/airtable';

type Msg = { role: 'system'|'user'|'assistant'; content: string };

async function saveAssistantMessage(sessionId: string, content: string) {
  try {
    const base = getAirtableBase();
    await base(tables.chats).create([{ fields: {
      Session: [sessionId], // adjust if your link field expects recordId vs name
      Role: 'assistant',
      Content: content,
    }}]);
  } catch {}
}

function fallbackText(reason: string) {
  return [
    'LLM is temporarily unavailable (', reason, ').',
    ' Continuing with rule-based checks only.',
    ' You can still: (1) run quick checks, (2) enter meter readings, (3) upload PLC/doc snapshots.',
    ' Safety: follow LOTO/site permits; do NOT energize or bypass interlocks unless authorized.'
  ].join('');
}

async function callOpenAI(messages: Msg[]) {
  const key = process.env.OPENAI_API_KEY;
  if (!key || process.env.NEXT_PUBLIC_ENABLE_LLM === '0') {
    return { ok:false, reason: !key ? 'NO_API_KEY' : 'LLM_DISABLED' as const };
  }
  const body = JSON.stringify({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages,
    temperature: 0.2,
  });
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body
  });
  if (!res.ok) {
    const t = await res.text().catch(()=> '');
    return { ok:false as const, status: res.status, body: t || undefined };
  }
  const j = await res.json();
  const content = j?.choices?.[0]?.message?.content?.trim?.() || '';
  return { ok:true as const, content };
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, messages } = await req.json();
    if (!sessionId || !Array.isArray(messages)) {
      return NextResponse.json({ ok:false, error:'BAD_REQUEST' }, { status: 400 });
    }

    // Try once; if 429/5xx, short backoff and retry once
    let r = await callOpenAI(messages);
    if (!r.ok && (r.status === 429 || (r.status && r.status >= 500))) {
      await new Promise(r => setTimeout(r, 500));
      r = await callOpenAI(messages);
    }

    if (r.ok && r.content) {
      await saveAssistantMessage(sessionId, r.content);
      return NextResponse.json({ ok:true, content: r.content });
    }

    const reason = (r as any)?.reason || ((r as any)?.status ? `HTTP ${(r as any).status}` : 'UNKNOWN');
    const text = fallbackText(String(reason));
    await saveAssistantMessage(sessionId, text);
    return NextResponse.json({ ok:true, content: text, fallback:true, reason }, { status: 200 });
  } catch (e:any) {
    const text = fallbackText('SERVER_ERROR');
    try { 
      const { sessionId } = await req.json();
      if (sessionId) await saveAssistantMessage(sessionId, text);
    } catch {}
    return NextResponse.json({ ok:true, content: text, fallback:true, reason:'SERVER_ERROR' }, { status: 200 });
  }
}

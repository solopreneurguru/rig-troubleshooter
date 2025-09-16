import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export function GET(){ 
  return NextResponse.json({ error:'GONE', use:'/api/chats/[sessionId]' }, { status:410 }); 
}

export function POST(){ 
  return NextResponse.json({ error:'GONE', use:'/api/chats/[sessionId]' }, { status:410 }); 
}
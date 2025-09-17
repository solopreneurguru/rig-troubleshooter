export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

function listApiRoutes() {
  const root = process.cwd();
  const apiDir = ['src/app/api','app/api']
    .map(p => path.join(root, p))
    .find(p => fs.existsSync(p))!;
  const out: string[] = [];
  const walk = (dir: string, rel = '') => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      const r = path.join(rel, name);
      const s = fs.statSync(p);
      if (s.isDirectory()) walk(p, r);
      else if (/route\.tsx?$/.test(name)) {
        const url = '/api/' + r.replace(/\\/g,'/').replace(/\/route\.tsx?$/, '');
        out.push(url);
      }
    }
  };
  walk(apiDir);
  return out.sort();
}

export async function GET() {
  try {
    const routes = listApiRoutes();
    return NextResponse.json({ ok: true, routes });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}

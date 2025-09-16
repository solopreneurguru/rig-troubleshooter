/* Repo scanner for Node runtime flags on API routes */
import fs from 'node:fs';
import path from 'node:path';

type EnvMap = Record<string, boolean>;
type TablePing = { ok?: boolean; sampleCount?: number; error?: string | null };
type BigBadWolfResp = {
  envs?: EnvMap;
  tables?: Record<string, TablePing>;
  v2Packs?: { activeV2Count?: number; error?: string | null };
};

const root = process.cwd();
const apiDir = path.join(root, 'app', 'api');

function listRoutes(dir: string, acc: string[] = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) listRoutes(p, acc);
    else if (/route\.tsx?$/.test(name)) acc.push(p);
  }
  return acc;
}

type FileReport = {
  file: string;
  hasRuntime: boolean;
  hasDynamic: boolean;
  hasRevalidate: boolean;
};

function scanFile(file: string): FileReport {
  const src = fs.readFileSync(file, 'utf8');
  return {
    file,
    hasRuntime: /export\s+const\s+runtime\s*=\s*['"]nodejs['"]/.test(src),
    hasDynamic: /export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/.test(src),
    hasRevalidate: /export\s+const\s+revalidate\s*=\s*0/.test(src),
  };
}

function relative(p: string) {
  return p.replace(root + path.sep, '');
}

const files = listRoutes(apiDir, []);
const reports = files.map(scanFile);

const missing = reports.filter(r => !(r.hasRuntime && r.hasDynamic && r.hasRevalidate));
const ok = reports.filter(r => r.hasRuntime && r.hasDynamic && r.hasRevalidate);

console.log('=== BigBadWolf: API route runtime audit ===');
console.log(`Total routes: ${reports.length}`);
console.log(`OK (node/dynamic/revalidate): ${ok.length}`);
console.log(`Missing flags: ${missing.length}`);
if (missing.length) {
  console.log('\n-- Files needing flags --');
  for (const r of missing) {
    console.log(`• ${relative(r.file)}  [runtime:${r.hasRuntime?'✓':'×'} dynamic:${r.hasDynamic?'✓':'×'} revalidate:${r.hasRevalidate?'✓':'×'}]`);
    console.log(`  Suggested patch (add at top):`);
    console.log(`  export const runtime = 'nodejs';`);
    console.log(`  export const dynamic = 'force-dynamic';`);
    console.log(`  export const revalidate = 0;`);
  }
}

console.log('\n=== BigBadWolf: server diagnostics ===');
const url = process.env.BIGBADWOLF_URL || '/api/diag/bigbadwolf';
console.log(`Fetching ${url} ...`);

import('node:https')
  .then(() => fetch(url))
  .catch(() => fetch('http://localhost:3000' + url))
  .then(async (res: any) => {
    if (!res || !res.ok) throw new Error(`HTTP ${res?.status}`);
    const data: BigBadWolfResp = await res.json();
    console.log(JSON.stringify(data, null, 2));
    if (data?.envs) {
      const missingEnvs = Object.entries(data.envs ?? {} as EnvMap).filter(([, v]) => !v).map(([k]) => k);
      if (missingEnvs.length) {
        console.log('\nMissing envs:', missingEnvs.join(', '));
      }
    }
    if (data?.tables) {
      const tableEntries = Object.entries(data.tables ?? {}) as Array<[string, TablePing]>;
      const failures = tableEntries.filter(([, v]) => v && v.ok === false);
      if (failures.length) {
        console.log('\nAirtable table failures:');
        for (const [name, v] of failures) {
          console.log(`• ${name}: ${v.error ?? 'unknown error'}`);
        }
      }
    }
    if (typeof data?.v2Packs?.activeV2Count === 'number') {
      console.log(`\nActive v2 RulePacks: ${data.v2Packs.activeV2Count}`);
    }
    console.log('\nBigBadWolf complete.');
  })
  .catch((e: any) => {
    console.error('BigBadWolf failed to fetch server diag:', String(e?.message ?? e));
    console.error('Tip: run the dev server or deploy, then re-run.');
    process.exitCode = 1;
  });

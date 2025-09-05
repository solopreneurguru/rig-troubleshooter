import fs from 'fs/promises';
import path from 'path';

async function ensureFile(p, seed=''){ try { await fs.access(p); } catch { await fs.mkdir(path.dirname(p),{recursive:true}); await fs.writeFile(p, seed,'utf8'); } }
async function has(p, needle){ try { return (await fs.readFile(p,'utf8')).includes(needle); } catch { return false; } }
async function appendIfMissing(p, block, tag){ if(!(await has(p, tag))){ const cur = (await fs.readFile(p,'utf8').catch(()=>'')); await fs.writeFile(p, cur + '\n\n' + block + '\n', 'utf8'); console.log('added markers →', p); } }

await ensureFile('README.md', '# Rig Troubleshooter\n');
await ensureFile('docs/QUICK_START.md', '# Quick Start\n');
await ensureFile('docs/20-architecture.md', '# Architecture\n');
await ensureFile('docs/40-runbook.md', '# Runbook\n');

await appendIfMissing('README.md', `## Environment\n<!-- AUTOGEN:ENV-START -->\n<!-- AUTOGEN:ENV-END -->`, 'AUTOGEN:ENV-START');
await appendIfMissing('docs/QUICK_START.md', `## Environment variables\n<!-- AUTOGEN:ENV-START -->\n<!-- AUTOGEN:ENV-END -->`, 'AUTOGEN:ENV-START');
await appendIfMissing('docs/20-architecture.md', `### API map\n<!-- AUTOGEN:API-START -->\n<!-- AUTOGEN:API-END -->`, 'AUTOGEN:API-START');
await appendIfMissing('docs/40-runbook.md', `### Smoke API Map\n<!-- AUTOGEN:API-START -->\n<!-- AUTOGEN:API-END -->`, 'AUTOGEN:API-START');

console.log('Markers ensured.');

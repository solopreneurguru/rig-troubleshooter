import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const repoRoot = process.cwd(); // adjust if needed, e.g., path.join(process.cwd(), 'rig-troubleshooter')

function run(cmd: string, args: string[], cwd: string) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
    p.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} -> ${code}`)));
  });
}

async function main() {
  // sanity check
  const gitDir = path.join(repoRoot, '.git');
  if (!fs.existsSync(gitDir)) throw new Error(`.git not found at ${repoRoot}`);

  const msg = process.argv[2] || 'chore: deploy — BigBadWolf + endpoints';
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      await run('git', ['add', '-A'], repoRoot);
      await run('git', ['commit', '-m', msg], repoRoot);
      await run('git', ['push', 'origin', 'main'], repoRoot);
      console.log('✅ Commit & push complete');
      return;
    } catch (e) {
      console.error(`Attempt ${attempts} failed:`, (e as Error).message);
      if (attempts >= maxAttempts) throw e;
      console.log('Retrying in 2s...');
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

main().catch(err => {
  console.error('❌ commit-and-push failed:', err?.message || err);
  process.exit(1);
});

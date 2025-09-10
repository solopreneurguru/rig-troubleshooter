const fs = await import('node:fs/promises');
const path = await import('node:path');

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, 'src', 'app', 'api');

function isDynamicDirName(name) {
  return /^\[.+\]$/.test(name);
}

async function listDirs(dir) {
  const all = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  return all.filter(d => d.isDirectory()).map(d => d.name);
}

async function walk(dir, rel = '') {
  const abs = path.join(dir, rel);
  const entries = await listDirs(abs);

  // Check siblings at this level for multiple *dynamic* names with the same normalized position
  // Example: /api/sessions/[id] and /api/sessions/[sessionId] are siblings and conflict.
  const dynamicSiblings = entries.filter(isDynamicDirName);
  if (dynamicSiblings.length > 1) {
    // More than one dynamic param folder under the same parent is an immediate conflict
    // (Next.js cannot disambiguate by name; only one dynamic segment allowed per slot.)
    const conflictPaths = dynamicSiblings
      .map(n => path.posix.join('/api', rel.replaceAll(path.sep, '/'), n))
      .sort();
    throw new Error(
      `Route conflict detected under /api/${rel || ''}:\n` +
      `  Dynamic siblings found: ${dynamicSiblings.join(', ')}\n` +
      `  Conflicting paths:\n    - ${conflictPaths.join('\n    - ')}\n` +
      `Fix: standardize the param to a single name (e.g., [id]) at this level.`
    );
  }

  // Recurse
  for (const name of entries) {
    await walk(dir, path.join(rel, name));
  }
}

// Entrypoint
try {
  const exists = await fs.stat(API_DIR).then(() => true).catch(() => false);
  if (!exists) {
    console.log('No src/app/api directory; skipping route-conflict check.');
    process.exit(0);
  }
  await walk(API_DIR, '');
  console.log('Route conflict check: OK (no sibling dynamic segment collisions).');
  process.exit(0);
} catch (e) {
  console.error(String(e?.message || e));
  process.exit(1);
}

// @ts-nocheck
export const dynamic = "force-static";

export default function Fingerprint() {
  const sha = (process.env.VERCEL_GIT_COMMIT_SHA || "unknown").slice(0, 7);
  const builtAt = new Date().toISOString();
  const marker = "FST-RIG-TS-FP";
  
  return (
    <main style={{padding:"2rem",fontFamily:"ui-sans-serif,system-ui"}}>
      <h1>Rig Troubleshooter — Fingerprint</h1>
      <p>marker: <code>{marker}</code></p>
      <p>commit: <code>{sha}</code></p>
      <p>builtAt: <code>{builtAt}</code></p>
      <p>note: static page shipped from this repo's build.</p>
    </main>
  );
}
// @ts-nocheck
export const dynamic = "force-static";
export default function FP() {
  const marker = "FST-RIG-TS-FP";
  const builtAt = new Date().toISOString();
  return (
    <main style={{padding:"2rem",fontFamily:"ui-sans-serif,system-ui"}}>
      <h1>Rig Troubleshooter — Static Fingerprint</h1>
      <p>marker: <code>{marker}</code></p>
      <p>builtAt: <code>{builtAt}</code></p>
      <p>note: static page; no serverless; presence proves this build is live.</p>
    </main>
  );
}

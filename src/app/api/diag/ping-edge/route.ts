export const runtime = "edge";
export const dynamic = "force-dynamic";
export async function GET() {
  return new Response(
    JSON.stringify({
      ok: true,
      kind: "edge-ping",
      ts: Date.now(),
      region: (globalThis as any).process?.env?.VERCEL_REGION || "edge",
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}

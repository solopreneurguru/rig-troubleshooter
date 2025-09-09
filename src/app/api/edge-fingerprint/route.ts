export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  const marker = "FST-RIG-TS-FP";
  
  return new Response(JSON.stringify({
    ok: true,
    kind: "edge",
    marker,
    ts: Date.now()
  }), { 
    status: 200, 
    headers: { "content-type": "application/json" }
  });
}
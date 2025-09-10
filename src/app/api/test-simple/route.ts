export const runtime = "nodejs";

export async function GET() {
  return new Response(JSON.stringify({ ok: true, test: "simple" }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

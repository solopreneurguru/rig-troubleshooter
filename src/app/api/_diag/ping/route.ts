import { jsonOk } from "@/lib/http";

export async function GET() {
  return jsonOk({ now: Date.now() });
}

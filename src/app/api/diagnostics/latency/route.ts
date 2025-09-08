import { jsonOk } from "@/lib/http";

export async function GET() {
  const startTime = Date.now();
  
  // Simulate some processing time
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
  
  const latency = Date.now() - startTime;
  
  return jsonOk({
    latency,
    timestamp: new Date().toISOString(),
    region: process.env.VERCEL_REGION || "unknown",
    environment: process.env.NODE_ENV || "unknown"
  });
}

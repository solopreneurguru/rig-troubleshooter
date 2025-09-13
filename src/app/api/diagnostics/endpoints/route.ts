import { jsonOk } from "@/lib/http";

export async function GET() {
  const endpoints = [
    { path: "/api/health", method: "GET", description: "System health check" },
    { path: "/api/diagnostics/airtable", method: "GET", description: "Airtable connection test" },
    { path: "/api/diagnostics/latency", method: "GET", description: "Server latency test" },
    { path: "/api/rigs/list", method: "GET", description: "List rigs (with timeout)" },
    { path: "/api/equipment/create", method: "POST", description: "Create equipment (schema-agnostic)" },
    { path: "/api/sessions/create", method: "POST", description: "Create session (with timeout)" },
  ];

  return jsonOk({
    endpoints,
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
}

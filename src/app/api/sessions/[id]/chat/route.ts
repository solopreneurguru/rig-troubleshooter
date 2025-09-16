import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getAirtableEnv, requireEnv } from "@/lib/env";
import { logServer } from "@/lib/logger";
import { getId, type IdContext } from "@/lib/route-ctx";

export const runtime = "nodejs"; // important for OpenAI SDK

export async function POST(
  req: NextRequest,
  ctx: IdContext
) {
  console.log("api_start", { route: "sessions/[id]/chat", time: new Date().toISOString() });

  try {
    const id = await getId(ctx);
    const body = await req.json().catch(() => ({}));
    const { text, rigName, equipmentName } = body;
    
    if (!text?.trim() || typeof text !== "string") {
      return NextResponse.json(
        { error: "Missing text. Send { text: string }." },
        { status: 400 }
      );
    }

    // Require OpenAI key
    const openaiKey = requireEnv("OPENAI_API_KEY");

    const sys = [
      "You are Rig Troubleshooter, a calm, stepwise industrial support assistant.",
      "Always respect safety: never energize/open panels without authorization, LOTO, PPE.",
      rigName ? `Rig: ${rigName}` : "",
      equipmentName ? `Equipment: ${equipmentName}` : "",
    ].filter(Boolean).join("\n");

    const client = new OpenAI({ apiKey: openaiKey });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: text },
      ],
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "I'm here and ready. What details can you share about the issue?";

    return NextResponse.json({ ok: true, reply });
  } catch (err: any) {
    console.error("api_error", { 
      route: "sessions/[id]/chat", 
      err: String(err), 
      stack: err?.stack 
    });
    return NextResponse.json(
      { ok: false, error: String(err), cause: "internal" },
      { status: 500 }
    );
  }
}
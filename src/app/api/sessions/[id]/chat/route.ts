import { NextResponse, NextRequest } from "next/server";
import OpenAI from "openai";

type Params = { id: string };
export const runtime = "nodejs"; // important for OpenAI SDK

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<Params> }
) {
  const { id } = await ctx.params;

  try {
    const body = await req.json().catch(() => ({}));
    const { text, rigName, equipmentName } = body;
    
    if (!text?.trim() || typeof text !== "string") {
      return NextResponse.json(
        { error: "Missing text. Send { text: string }." },
        { status: 400 }
      );
    }
    if (!process.env.OPENAI_API_KEY) {
      console.error("POST /api/sessions/[id]/chat failed: Missing OPENAI_API_KEY");
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const sys = [
      "You are Rig Troubleshooter, a calm, stepwise industrial support assistant.",
      "Always respect safety: never energize/open panels without authorization, LOTO, PPE.",
      rigName ? `Rig: ${rigName}` : "",
      equipmentName ? `Equipment: ${equipmentName}` : "",
    ].filter(Boolean).join("\n");

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
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
    console.error("POST /api/sessions/[id]/chat failed:", err);
    return NextResponse.json(
      { error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
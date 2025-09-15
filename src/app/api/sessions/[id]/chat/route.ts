import { NextResponse } from "next/server";
import OpenAI from "openai";
export const runtime = "edge";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { text, rigName, equipmentName } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ ok: false, error: "Missing text" }, { status: 400 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ ok: false, error: "Missing OPENAI_API_KEY" }, { status: 500 });
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
    return NextResponse.json({ ok: false, error: err?.message || "Chat error" }, { status: 500 });
  }
}
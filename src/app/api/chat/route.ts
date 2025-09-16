import { NextResponse } from "next/server";
import { getMessages, createMessage } from "@/lib/chat";
import { withDeadline } from "@/lib/withDeadline";

export const runtime = "nodejs";

export async function GET(req: Request) {
  console.log("api_start", { route: "chat", time: new Date().toISOString() });

  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const messages = await withDeadline(
      getMessages(sessionId),
      10000,
      "chat-list"
    );

    return NextResponse.json({ ok: true, messages });
  } catch (err: any) {
    console.error("api_error", { 
      route: "chat", 
      err: String(err), 
      stack: err?.stack 
    });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  console.log("api_start", { route: "chat", time: new Date().toISOString() });

  try {
    const body = await req.json();
    const { sessionId, text, role = "user" } = body;

    if (!sessionId || !text) {
      return NextResponse.json(
        { error: "sessionId and text required" },
        { status: 400 }
      );
    }

    const message = await withDeadline(
      createMessage(sessionId, text, role),
      10000,
      "chat-append"
    );

    return NextResponse.json({ ok: true, message });
  } catch (err: any) {
    console.error("api_error", { 
      route: "chat", 
      err: String(err), 
      stack: err?.stack 
    });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
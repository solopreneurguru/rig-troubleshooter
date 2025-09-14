import { NextResponse } from "next/server";
import { airtableCreate } from "@/lib/airtable-rest";

interface Message {
  role: "user" | "assistant";
  text: string;
  docMeta?: {
    id: string;
    title: string;
    type: string;
  };
}

interface ReportDraft {
  title: string;
  status: string;
  summary: string;
  parts: string[];
  docIds: string[];
}

// Simple summarizer for MVP - can be enhanced later
function summarizeMessages(messages: Message[]): ReportDraft {
  // Extract document IDs and titles
  const docs = messages
    .filter(m => m.docMeta)
    .map(m => ({
      id: m.docMeta!.id,
      title: m.docMeta!.title,
      type: m.docMeta!.type,
    }));

  // Find the first user message as the initial problem
  const problem = messages.find(m => m.role === "user")?.text || "Unknown issue";

  // Get the last few messages to guess the outcome
  const lastMessages = messages.slice(-3);
  const resolved = lastMessages.some(m => 
    m.text.toLowerCase().includes("resolved") || 
    m.text.toLowerCase().includes("fixed") ||
    m.text.toLowerCase().includes("working now")
  );

  // Build a basic summary from the conversation
  const summary = `Issue: ${problem.slice(0, 100)}${problem.length > 100 ? "..." : ""}
Status: ${resolved ? "Resolved" : "In Progress"}
${docs.length ? `\nAttachments:\n${docs.map(d => `- ${d.title} (${d.type})`).join("\n")}` : ""}`;

  return {
    title: `Troubleshooting: ${problem.slice(0, 50)}${problem.length > 50 ? "..." : ""}`,
    status: resolved ? "Resolved" : "In Progress",
    summary,
    parts: [], // For MVP, we'll let the user add parts manually
    docIds: docs.map(d => d.id),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "sessionId required" }, { status: 400 });
    }

    // Load messages for the session
    const messagesRes = await fetch(`/api/chat/${sessionId}/messages`);
    if (!messagesRes.ok) {
      return NextResponse.json(
        { ok: false, error: "Failed to load messages" },
        { status: 500 }
      );
    }

    const messages = (await messagesRes.json())?.messages || [];
    if (!messages.length) {
      return NextResponse.json(
        { ok: false, error: "No messages found for session" },
        { status: 404 }
      );
    }

    // Generate draft report
    const draft = summarizeMessages(messages.slice(-200)); // Last 200 messages

    return NextResponse.json({ ok: true, draft });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}

export type ChatMessage = { id?: string; role: 'user'|'assistant'|'system'; content: string; createdTime?: string };

export async function listMessages(sessionId: string): Promise<ChatMessage[]> {
  const res = await fetch(`/api/chats/${sessionId}`, { method: 'GET', cache: 'no-store' });
  if (!res.ok) throw new Error(`CHAT_LIST_${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.messages) ? data.messages : [];
}

export async function sendMessage(sessionId: string, role: ChatMessage['role'], content: string) {
  const res = await fetch(`/api/chats/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, content }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(`CHAT_POST_${res.status}:${j?.error ?? ''}`);
  }
  return res.json();
}
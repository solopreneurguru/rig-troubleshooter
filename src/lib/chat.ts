import Airtable from "airtable";
import { getAirtableEnv } from "./env";

const A = getAirtableEnv();

function getBase() {
  Airtable.configure({ apiKey: A.key });
  return new Airtable().base(A.baseId);
}

export async function getMessages(sessionId: string) {
  const base = getBase();
  const messages = base(A.tables.messages);
  const records = await messages
    .select({
      filterByFormula: `{SessionId} = '${sessionId}'`,
      sort: [{ field: "CreatedTime", direction: "asc" }],
    })
    .all();

  return records.map((r) => ({
    id: r.id,
    role: r.get("Role") || "assistant",
    text: r.get("Text") || "",
    createdAt: r.get("CreatedTime") || r.fields.CreatedTime || null,
  }));
}

export async function createMessage(sessionId: string, text: string, role = "user") {
  const base = getBase();
  const messages = base(A.tables.messages);
  const created = await messages.create([
    {
      fields: {
        SessionId: sessionId,
        Role: role,
        Text: text,
      },
    },
  ]);
  return created[0];
}
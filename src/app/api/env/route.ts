import { NextResponse } from "next/server";

export async function GET() {
	const required = [
		"AIRTABLE_API_KEY",
		"AIRTABLE_BASE_ID",
		"TB_RIGS",
		"TB_EQUIP_TYPES",
		"TB_RIG_EQUIP",
		"TB_DOCS",
		"TB_SESSIONS",
		"TB_ACTIONS",
		"TB_READINGS",
		"TB_FINDINGS",
		"TB_TECHS",
		"BLOB_READ_WRITE_TOKEN",
	] as const;

	const status = Object.fromEntries(
		required.map((k) => [k, process.env[k] ? "✓ set" : "✗ missing"])
	);

	return NextResponse.json({ env: status });
}

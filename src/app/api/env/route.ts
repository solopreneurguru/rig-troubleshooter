import { NextResponse } from "next/server";
import { envStatus } from "@/lib/airtable";

export async function GET() {
	const status = envStatus();
	return NextResponse.json({ env: status });
}

import type { NextRequest } from "next/server";

export type IdContext = { params: Promise<{ id: string }> };

export async function getId(ctx: IdContext) {
  return (await ctx.params).id;
}

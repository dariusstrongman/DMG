// Weekly cron — fires every Monday morning. Triggered by Vercel Cron
// (see vercel.json). Generates a fresh ViralPick row.
//
// Auth: Vercel sets the CRON_SECRET env var and passes it as
// `Authorization: Bearer <secret>` on the request. We verify before
// running so an open endpoint can't be hammered.

import { NextRequest } from "next/server";
import { generateViralPick } from "@/lib/viral-pick";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const pick = await generateViralPick();
    return Response.json({ ok: true, id: pick.id, title: pick.title });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

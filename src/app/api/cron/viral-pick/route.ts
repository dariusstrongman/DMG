// Weekly cron — fires every Monday morning. Triggered by Vercel Cron
// (see vercel.json). Generates a fresh ViralPick row.
//
// Auth: Vercel sets the CRON_SECRET env var and passes it as
// `Authorization: Bearer <secret>` on the request. We verify before
// running so an open endpoint can't be hammered.

import { NextRequest } from "next/server";
import { generateWeeklyViralPicks, PICKS_PER_WEEK } from "@/lib/viral-pick";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const picks = await generateWeeklyViralPicks(PICKS_PER_WEEK);
    return Response.json({
      ok: true,
      count: picks.length,
      titles: picks.map((p) => p.title),
    });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

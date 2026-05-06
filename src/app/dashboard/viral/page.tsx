import { Flame, CalendarClock } from "lucide-react";
import { ViralPickCard } from "@/components/dashboard/viral/viral-pick-card";
import { generateViralPick, getLatestViralPick } from "@/lib/viral-pick";
import { db } from "@/lib/db";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";

export const metadata = { title: "Viral Pick of the Week" };
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Compute the next Monday at 7am Central. Cron fires at 13:00 UTC.
function nextMondayLabel(now = new Date()): string {
  const d = new Date(now);
  const day = d.getUTCDay(); // 0 Sun ... 6 Sat
  const daysUntilMonday = day === 1 ? (d.getUTCHours() < 13 ? 0 : 7) : (8 - day) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + daysUntilMonday);
  d.setUTCHours(13, 0, 0, 0);
  return d.toLocaleString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    timeZone: "America/Chicago",
  });
}

export default async function ViralPickPage() {
  let latest = await getLatestViralPick();

  // First-time setup: if there's no pick yet, generate one inline so
  // the user never sees an empty page. Subsequent visits hit the cron-
  // refreshed pick. Failures fall through and the empty card renders.
  if (!latest) {
    try {
      latest = await generateViralPick();
    } catch {
      latest = null;
    }
  }

  // Small history below the active card.
  let history: Array<{
    id: string;
    title: string;
    postDay: string | null;
    postTime: string | null;
    createdAt: Date;
  }> = [];
  try {
    const rows = await db.viralPick.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, title: true, postDay: true, postTime: true, createdAt: true },
    });
    history = rows.slice(1);
  } catch {
    history = [];
  }

  const nextRefresh = nextMondayLabel();

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-rise">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-2">
          <Flame className="size-3.5 text-primary" /> Viral Pick of the Week
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">This week&apos;s pitch</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Auto-generated every Monday morning. Reads top performers, best posting slots, title patterns, and format mix, then proposes ONE concrete pitch with a viral thesis and an honest risk note.
        </p>
      </div>

      <ViralPickCard pick={latest} />

      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground border border-border/60 bg-secondary/20 rounded-lg px-3 py-2">
        <CalendarClock className="size-3.5" />
        Next pick refreshes <span className="text-foreground/90">{nextRefresh}</span> Central
      </div>

      {history.length > 0 ? (
        <div>
          <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-3">
            Previous picks
          </h2>
          <div className="rounded-xl border border-border bg-secondary/30 divide-y divide-border overflow-hidden">
            {history.map((h) => (
              <div key={h.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                <span className="text-[10px] font-mono text-muted-foreground/60 w-20 shrink-0 tabular-nums">
                  {timeAgo(h.createdAt)}
                </span>
                <span className="flex-1 truncate text-foreground/85">{h.title}</span>
                {h.postDay || h.postTime ? (
                  <span className="text-[11px] font-mono text-muted-foreground/70 hidden sm:inline">
                    {[h.postDay, h.postTime].filter(Boolean).join(" · ")}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <p className="text-[11px] text-muted-foreground/70 font-mono">
        <Link href="/dashboard/analytics" className="underline hover:text-foreground">
          See the underlying analytics →
        </Link>
      </p>
    </div>
  );
}

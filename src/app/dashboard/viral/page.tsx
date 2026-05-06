import { Flame } from "lucide-react";
import { ViralPickCard } from "@/components/dashboard/viral/viral-pick-card";
import { getLatestViralPick } from "@/lib/viral-pick";
import { db } from "@/lib/db";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";

export const metadata = { title: "Viral Pick" };
export const dynamic = "force-dynamic";

export default async function ViralPickPage() {
  const latest = await getLatestViralPick();

  // Show a small history below the active card so you can see prior
  // picks. Useful for spotting drift in what the model recommends.
  let history: Array<{ id: string; title: string; postDay: string | null; postTime: string | null; createdAt: Date }> = [];
  try {
    const rows = await db.viralPick.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, title: true, postDay: true, postTime: true, createdAt: true },
    });
    history = rows.slice(1); // exclude the active one shown above
  } catch {
    history = [];
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-rise">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-2">
          <Flame className="size-3.5 text-primary" /> Viral Pick
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">The next video most likely to pop</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          The model reads your top performers, best posting slots, title patterns, and format mix, then proposes ONE concrete pitch: title, day, time, hook, thumbnail concept, and an honest risk note. Regenerate anytime.
        </p>
      </div>

      <ViralPickCard pick={latest} />

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
        Costs &lt;$0.01 per generation in tokens.{" "}
        <Link href="/dashboard/analytics" className="underline hover:text-foreground">
          See the underlying analytics →
        </Link>
      </p>
    </div>
  );
}

// "What separates your hits from your flops" card.
//
// Splits mature videos (≥14 days old) into top-30% and bottom-30% by
// views-per-day, then surfaces the concrete differences. The headline
// bullets are computed from the underlying numbers, not GPT — so they
// stay accurate even if the AI is offline.

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingDown, Lightbulb, Calendar, Clock } from "lucide-react";
import { hitsVsFlops, type VideoCohortStats } from "@/lib/analytics-aggregates";
import { formatNumber } from "@/lib/utils";
import type { VideoStats } from "@/lib/youtube";

function pct(n: number) {
  return `${Math.round(n)}%`;
}

function dur(sec: number) {
  if (!sec || !Number.isFinite(sec)) return "—";
  const m = Math.round(sec / 60);
  return `${m}m`;
}

export function HitsVsFlops({ videos, timezone }: { videos: VideoStats[]; timezone?: string }) {
  const hvf = hitsVsFlops(videos, timezone);

  return (
    <Card>
      <CardHeader>
        <CardDescription className="font-mono uppercase tracking-widest text-xs flex items-center gap-2">
          <Trophy className="size-3.5" /> What separates your hits from your flops
        </CardDescription>
        <CardTitle className="text-base">Pattern analysis on your top 30% vs bottom 30%</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Insight bullets — the answer to "what should I change?" */}
        <div className="space-y-2">
          {hvf.insights.map((bullet, i) => (
            <div key={i} className="flex gap-2.5 items-start text-sm">
              <Lightbulb className="size-4 text-primary shrink-0 mt-0.5" />
              <span className="text-foreground/95">{bullet}</span>
            </div>
          ))}
        </div>

        {hvf.enoughData ? (
          <>
            {/* Side-by-side cohort stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <CohortColumn label="Your hits" tone="hit" stats={hvf.hits} />
              <CohortColumn label="Your flops" tone="flop" stats={hvf.flops} />
            </div>

            {/* Hit titles for inspection */}
            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
                Top performing ({hvf.hits.count})
              </div>
              <div className="space-y-1">
                {hvf.hitTitles.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-xs">
                    <span className="text-emerald-300 font-mono tabular-nums w-20 shrink-0">
                      {formatNumber(Math.round(t.viewsPerDay))}/day
                    </span>
                    <span className="text-foreground/90 truncate">{t.title}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
                Bottom performing ({hvf.flops.count})
              </div>
              <div className="space-y-1">
                {hvf.flopTitles.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-xs">
                    <span className="text-rose-300/80 font-mono tabular-nums w-20 shrink-0">
                      {formatNumber(Math.round(t.viewsPerDay))}/day
                    </span>
                    <span className="text-foreground/70 truncate">{t.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CohortColumn({ label, tone, stats }: { label: string; tone: "hit" | "flop"; stats: VideoCohortStats }) {
  const accent = tone === "hit" ? "border-emerald-400/30 bg-emerald-400/5" : "border-rose-400/20 bg-rose-400/5";
  const Icon = tone === "hit" ? Trophy : TrendingDown;
  const iconColor = tone === "hit" ? "text-emerald-300" : "text-rose-300/80";
  return (
    <div className={`rounded-lg border p-3 space-y-2.5 ${accent}`}>
      <div className="flex items-center gap-2">
        <Icon className={`size-3.5 ${iconColor}`} />
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className="text-[10px] font-mono text-muted-foreground/70 ml-auto">n={stats.count}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <Row label="Avg views/day" val={formatNumber(Math.round(stats.avgViewsPerDay))} />
        <Row label="Median views/day" val={formatNumber(Math.round(stats.medianViewsPerDay))} />
        <Row label="Title length" val={`${Math.round(stats.avgTitleChars)} chars`} />
        <Row label="Title words" val={`${stats.avgTitleWords.toFixed(1)}`} />
        <Row label="With question" val={pct(stats.pctWithQuestion)} />
        <Row label="With number" val={pct(stats.pctWithNumber)} />
        <Row label="With emoji" val={pct(stats.pctWithEmoji)} />
        <Row label="Shorts" val={pct(stats.pctShort)} />
        <Row label="Avg duration (long)" val={dur(stats.avgDurationSec)} />
        <Row label="Top day" val={stats.topDay?.name ?? "—"} icon={<Calendar className="size-3" />} />
        <Row
          label="Median hour"
          val={stats.medianHourLocal != null ? `${stats.medianHourLocal}:00` : "—"}
          icon={<Clock className="size-3" />}
        />
      </div>
      {stats.topFirstWords.length > 0 ? (
        <div className="pt-1 border-t border-border/50">
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
            Common opening words
          </div>
          <div className="flex flex-wrap gap-1">
            {stats.topFirstWords.map((w) => (
              <span key={w.word} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary/50 text-foreground/80">
                {w.word} <span className="text-muted-foreground/70">×{w.count}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, val, icon }: { label: string; val: string; icon?: React.ReactNode }) {
  return (
    <>
      <span className="text-muted-foreground flex items-center gap-1">{icon}{label}</span>
      <span className="font-mono tabular-nums text-foreground/95 text-right">{val}</span>
    </>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Trophy } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import {
  postingTimeAnalysis,
  type DayStat,
  type HourStat,
  type Slot,
} from "@/lib/analytics-aggregates";
import type { VideoStats } from "@/lib/youtube";

const TZ_LABEL = (tz: string) => {
  // "America/Chicago" → "Chicago"
  const parts = tz.split("/");
  return parts[parts.length - 1].replace(/_/g, " ");
};

export function BestPostingTimes({
  videos,
  timezone,
}: {
  videos: VideoStats[];
  timezone: string;
}) {
  const a = postingTimeAnalysis(videos, timezone);

  if (a.topSlots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">When to post</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Need a few uploads before patterns emerge.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription className="font-mono uppercase tracking-widest text-xs flex items-center gap-2">
          <Clock className="size-3.5" /> When to post · {TZ_LABEL(a.timezone)} time
        </CardDescription>
        <CardTitle className="text-base">Best slots, ranked</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Top 3 ranked */}
        <div className="space-y-2">
          {a.topSlots.map((slot, i) => (
            <SlotRow key={`${slot.day}-${slot.hourBucket}`} rank={i + 1} slot={slot} channelAvg={a.channelAvg} />
          ))}
        </div>

        {/* By day */}
        <Section title="By day of week">
          <DayBars days={a.byDay} channelAvg={a.channelAvg} />
        </Section>

        {/* By hour */}
        <Section title="By time of day">
          <HourBars hours={a.byHour} channelAvg={a.channelAvg} />
        </Section>

        <p className="text-[11px] text-muted-foreground">
          Bars compare each slot&apos;s average views to the channel average ({formatNumber(Math.round(a.channelAvg))}).
          Greener = above average. Empty bars = no uploads in that slot yet.
        </p>
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">{title}</div>
      {children}
    </div>
  );
}

function SlotRow({ rank, slot, channelAvg }: { rank: number; slot: Slot; channelAvg: number }) {
  const ratio = channelAvg > 0 ? slot.avgViews / channelAvg : 1;
  const tone =
    ratio >= 1.5 ? "emerald" : ratio >= 1 ? "blue" : "default";
  const toneClass =
    tone === "emerald" ? "border-emerald-500/30 bg-emerald-500/[0.06]" :
    tone === "blue" ? "border-blue-500/30 bg-blue-500/[0.04]" :
    "border-border bg-secondary/30";

  return (
    <div className={`rounded-lg border ${toneClass} p-3 flex items-center gap-3`}>
      <div className="size-7 rounded-md bg-secondary border border-border grid place-items-center text-xs font-mono">
        {rank === 1 ? <Trophy className="size-3.5 text-yellow-300" /> : `#${rank}`}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">
          {slot.dayLabelFull} · {slot.hourLabel}
        </div>
        <div className="text-xs text-muted-foreground font-mono mt-0.5">
          {slot.uploads} upload{slot.uploads === 1 ? "" : "s"} · avg {formatNumber(Math.round(slot.avgViews))} views
          {ratio >= 1 ? ` · ${ratio.toFixed(1)}x channel avg` : ""}
        </div>
      </div>
    </div>
  );
}

function DayBars({ days, channelAvg }: { days: DayStat[]; channelAvg: number }) {
  const max = Math.max(channelAvg, ...days.map((d) => d.avgViews));
  return (
    <div className="space-y-1.5">
      {days.map((d) => (
        <div key={d.day} className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground w-9 shrink-0">
            {d.dayLabel}
          </span>
          <div className="flex-1 relative h-5 rounded bg-secondary/40 overflow-hidden">
            {d.uploads > 0 ? (
              <div
                className="absolute inset-y-0 left-0 rounded transition"
                style={{
                  width: `${Math.max(2, (d.avgViews / max) * 100)}%`,
                  background: barColor(channelAvg > 0 ? d.avgViews / channelAvg : 1),
                }}
              />
            ) : null}
            {channelAvg > 0 ? (
              <div
                className="absolute inset-y-0 w-px bg-foreground/40"
                style={{ left: `${(channelAvg / max) * 100}%` }}
              />
            ) : null}
          </div>
          <span className="text-xs font-mono tabular-nums text-foreground/90 min-w-[80px] text-right">
            {d.uploads === 0 ? <span className="text-muted-foreground/60">—</span> : formatNumber(Math.round(d.avgViews))}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground/70 min-w-[24px] text-right">
            n={d.uploads}
          </span>
        </div>
      ))}
    </div>
  );
}

function HourBars({ hours, channelAvg }: { hours: HourStat[]; channelAvg: number }) {
  const max = Math.max(channelAvg, ...hours.map((h) => h.avgViews));
  return (
    <div className="space-y-1">
      {hours.map((h) => (
        <div key={h.hourBucket} className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-muted-foreground w-20 shrink-0 tabular-nums">
            {h.hourLabel}
          </span>
          <div className="flex-1 relative h-4 rounded bg-secondary/40 overflow-hidden">
            {h.uploads > 0 ? (
              <div
                className="absolute inset-y-0 left-0 rounded transition"
                style={{
                  width: `${Math.max(2, (h.avgViews / max) * 100)}%`,
                  background: barColor(channelAvg > 0 ? h.avgViews / channelAvg : 1),
                }}
              />
            ) : null}
            {channelAvg > 0 ? (
              <div
                className="absolute inset-y-0 w-px bg-foreground/40"
                style={{ left: `${(channelAvg / max) * 100}%` }}
              />
            ) : null}
          </div>
          <span className="text-[11px] font-mono tabular-nums text-foreground/90 min-w-[70px] text-right">
            {h.uploads === 0 ? <span className="text-muted-foreground/60">—</span> : formatNumber(Math.round(h.avgViews))}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground/70 min-w-[20px] text-right">
            {h.uploads || ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function barColor(ratio: number): string {
  // < 0.7 → muted, ~1 → blue, > 1.4 → emerald
  if (ratio >= 1.4) return "rgba(74,222,128,0.85)";
  if (ratio >= 1) return "rgba(96,165,250,0.7)";
  if (ratio >= 0.7) return "rgba(96,165,250,0.4)";
  return "rgba(148,163,184,0.35)";
}

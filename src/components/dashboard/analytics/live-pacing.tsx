// Currently-live videos with their pace vs the channel's mature
// median. Lets the creator catch underperformers in their first
// week, when promotion still moves the needle.

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { livePacing } from "@/lib/analytics-aggregates";
import { formatNumber } from "@/lib/utils";
import type { VideoStats } from "@/lib/youtube";

export function LivePacing({ videos }: { videos: VideoStats[] }) {
  const { items, baselineLong, baselineShort } = livePacing(videos);
  const hasBaseline = baselineLong > 0 || baselineShort > 0;

  return (
    <Card>
      <CardHeader>
        <CardDescription className="font-mono uppercase tracking-widest text-xs flex items-center gap-2">
          <Activity className="size-3.5" /> Live video pacing
        </CardDescription>
        <CardTitle className="text-base">How your last 2 weeks are tracking</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasBaseline ? (
          <p className="text-sm text-muted-foreground">
            Need at least one mature video (14+ days) to set a baseline. Once you have a couple, this card will rate every live video as ahead, on-pace, or behind.
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No videos under 14 days old. Drop a new one and check back tomorrow to see how it's pacing.
          </p>
        ) : (
          <>
            <div className="text-xs text-muted-foreground">
              Baseline: <span className="font-mono text-foreground/90">{formatNumber(Math.round(baselineLong))}/day</span> for long videos
              {baselineShort > 0 ? (
                <>
                  {" · "}
                  <span className="font-mono text-foreground/90">{formatNumber(Math.round(baselineShort))}/day</span> for Shorts
                </>
              ) : null}
            </div>
            <div className="space-y-2">
              {items.map((it) => (
                <PacingRow key={it.id} item={it} />
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
              "Behind" videos are the ones to share to a Discord, post on Twitter, or pin in a community tab. Boost early — once a video plateaus past 14 days the algorithm rarely revisits.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PacingRow({ item }: { item: ReturnType<typeof livePacing>["items"][number] }) {
  const tone =
    item.status === "ahead"
      ? "border-emerald-400/30 bg-emerald-400/5"
      : item.status === "behind"
      ? "border-rose-400/30 bg-rose-400/5"
      : item.status === "on-pace"
      ? "border-border bg-secondary/20"
      : "border-border/60 bg-secondary/10";

  const Icon =
    item.status === "ahead" ? TrendingUp : item.status === "behind" ? TrendingDown : Minus;
  const iconClass =
    item.status === "ahead"
      ? "text-emerald-300"
      : item.status === "behind"
      ? "text-rose-300"
      : "text-muted-foreground";

  const label =
    item.status === "ahead"
      ? `${item.ratio.toFixed(1)}× pace`
      : item.status === "behind"
      ? `${item.ratio.toFixed(1)}× pace`
      : item.status === "too-early"
      ? "too early"
      : `${item.ratio.toFixed(1)}× pace`;

  const ageLabel =
    item.ageDays < 1
      ? `${Math.round(item.ageDays * 24)}h ago`
      : item.ageDays < 2
      ? "1 day ago"
      : `${Math.round(item.ageDays)} days ago`;

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${tone}`}>
      <Icon className={`size-4 shrink-0 ${iconClass}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-foreground/95 truncate">{item.title}</div>
        <div className="text-[11px] font-mono text-muted-foreground">
          {ageLabel} · {item.isShort ? "Short" : "Long"} · {formatNumber(item.views)} views · {formatNumber(Math.round(item.viewsPerDay))}/day
        </div>
      </div>
      <span className={`text-[11px] font-mono px-2 py-0.5 rounded ${iconClass} bg-secondary/40`}>
        {label}
      </span>
    </div>
  );
}

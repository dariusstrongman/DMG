import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { bestPostingTimes, HOUR_BUCKETS, type BestPostingResult } from "@/lib/analytics-aggregates";
import type { VideoStats } from "@/lib/youtube";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function BestPostingTimes({ videos }: { videos: VideoStats[] }) {
  const result = bestPostingTimes(videos);
  const max = Math.max(1, ...result.buckets.map((b) => b.avgViews));

  return (
    <Card>
      <CardHeader>
        <CardDescription className="font-mono uppercase tracking-widest text-xs flex items-center gap-2">
          <Clock className="size-3.5" /> When to post
        </CardDescription>
        <CardTitle className="text-base">Best posting times (UTC)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Insight result={result} />

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left font-mono uppercase tracking-widest text-[10px] text-muted-foreground py-1.5 pr-2"></th>
                {HOUR_BUCKETS.map((h) => (
                  <th key={h.idx} className="text-center font-mono uppercase tracking-widest text-[10px] text-muted-foreground py-1.5 px-1">
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day, di) => (
                <tr key={day}>
                  <td className="text-right font-mono uppercase tracking-widest text-[10px] text-muted-foreground py-0.5 pr-2">
                    {day}
                  </td>
                  {HOUR_BUCKETS.map((h) => {
                    const b = result.buckets.find((b) => b.day === di && b.hourBucket === h.idx);
                    const intensity = b && b.uploads > 0 ? b.avgViews / max : 0;
                    return (
                      <td key={`${di}-${h.idx}`} className="px-0.5 py-0.5">
                        <Cell uploads={b?.uploads ?? 0} avg={b?.avgViews ?? 0} intensity={intensity} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-2 mt-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            <span>Cool</span>
            <div className="flex">
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map((v) => (
                <div
                  key={v}
                  className="w-5 h-2"
                  style={{ background: heat(v) }}
                />
              ))}
            </div>
            <span>Hot</span>
            <span className="ml-3">·</span>
            <span>Color = avg views per upload in that slot</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Cell({ uploads, avg, intensity }: { uploads: number; avg: number; intensity: number }) {
  if (uploads === 0) {
    return <div className="h-7 rounded bg-secondary/40 border border-border/40" title="No uploads in this slot" />;
  }
  return (
    <div
      className="h-7 rounded border border-border/40 grid place-items-center text-[10px] font-mono tabular-nums"
      style={{ background: heat(intensity), color: intensity > 0.55 ? "#0b0d10" : "rgba(255,255,255,0.85)" }}
      title={`${uploads} upload${uploads === 1 ? "" : "s"} · avg ${formatNumber(Math.round(avg))} views`}
    >
      {uploads > 1 ? uploads : ""}
    </div>
  );
}

// Cool blue → warm green → hot lime gradient (matches dashboard accent).
function heat(t: number): string {
  if (t <= 0) return "rgba(40,50,65,0.4)";
  // 0..1 → blue → cyan → lime
  const r = Math.round(60 + t * 130);
  const g = Math.round(100 + t * 130);
  const b = Math.round(200 - t * 180);
  return `rgb(${r},${g},${b})`;
}

function Insight({ result }: { result: BestPostingResult }) {
  if (!result.bestDay) {
    return (
      <p className="text-sm text-muted-foreground">
        Need a few uploads before patterns emerge.
      </p>
    );
  }
  const lines: string[] = [];
  if (result.bestBucket) {
    lines.push(
      `Best slot: ${result.bestBucket.dayLabel} ${result.bestBucket.hourLabel} · avg ${formatNumber(Math.round(result.bestBucket.avgViews))} views (${result.bestBucket.uploads} upload${result.bestBucket.uploads === 1 ? "" : "s"})`
    );
  }
  if (result.bestDay && result.worstDay && result.bestDay.day !== result.worstDay.day && result.worstDay.avg > 0) {
    const ratio = result.bestDay.avg / result.worstDay.avg;
    if (ratio >= 1.4) {
      lines.push(
        `${result.bestDay.dayLabel} uploads avg ${ratio.toFixed(1)}x the views of ${result.worstDay.dayLabel} uploads on this channel.`
      );
    }
  }
  return (
    <div className="space-y-1 text-sm">
      {lines.map((l, i) => (
        <p key={i} className={i === 0 ? "text-foreground" : "text-muted-foreground"}>
          {l}
        </p>
      ))}
    </div>
  );
}

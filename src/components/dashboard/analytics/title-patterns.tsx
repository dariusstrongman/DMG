import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Type, TrendingUp, Lightbulb } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { titleLengthAnalysis, titleSignals } from "@/lib/analytics-aggregates";
import type { VideoStats } from "@/lib/youtube";

// Headline reads the underlying numbers and produces a single clear
// sentence. Avoids the generic "no signal" copy when there's at least
// one usable comparison.
function buildHeadline(
  best: { label: string; avgViews: number; uploads: number } | null,
  signals: ReturnType<typeof titleSignals>,
): { headline: string; sub: string } {
  const parts: string[] = [];
  if (best && best.uploads >= 2) {
    parts.push(`Your best-performing title length is ${best.label} (${formatNumber(Math.round(best.avgViews))} avg views).`);
  }
  const qWinner = winnerOf("a question mark", signals.withQuestion, signals.withoutQuestion);
  if (qWinner) parts.push(qWinner);
  const nWinner = winnerOf("a number", signals.withNumber, signals.withoutNumber);
  if (nWinner) parts.push(nWinner);
  if (parts.length === 0) {
    return {
      headline: "Not enough data yet to spot a pattern.",
      sub: "Keep posting. Once you have a dozen-ish uploads with varied titles, this card will surface what's actually working.",
    };
  }
  return { headline: parts[0], sub: parts.slice(1).join(" ") };
}

function winnerOf(
  feature: string,
  withIt: { uploads: number; avgViews: number },
  without: { uploads: number; avgViews: number },
): string | null {
  if (withIt.uploads < 2 || without.uploads < 2) return null;
  if (withIt.avgViews <= 0 || without.avgViews <= 0) return null;
  const ratio = withIt.avgViews / without.avgViews;
  if (ratio >= 1.25) {
    return `Titles with ${feature} get ${ratio.toFixed(1)}x the views of titles without.`;
  }
  if (ratio <= 0.8) {
    return `Titles without ${feature} get ${(1 / ratio).toFixed(1)}x the views of titles with.`;
  }
  return null;
}

export function TitlePatterns({ videos }: { videos: VideoStats[] }) {
  const lengthBuckets = titleLengthAnalysis(videos);
  const signals = titleSignals(videos);
  const maxAvg = Math.max(1, ...lengthBuckets.map((b) => b.avgViews));
  const bestBucket =
    lengthBuckets
      .filter((b) => b.uploads > 0)
      .sort((a, b) => b.avgViews - a.avgViews)[0] ?? null;

  const { headline, sub } = buildHeadline(bestBucket, signals);

  return (
    <Card>
      <CardHeader>
        <CardDescription className="font-mono uppercase tracking-widest text-xs flex items-center gap-2">
          <Type className="size-3.5" /> Title patterns
        </CardDescription>
        <CardTitle className="text-base">What works in your titles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2.5 flex gap-2.5">
          <Lightbulb className="size-4 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium text-foreground/95">{headline}</div>
            {sub ? <div className="text-muted-foreground mt-0.5 text-[13px]">{sub}</div> : null}
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <div className="text-sm font-medium">By title length</div>
            <div className="text-[11px] text-muted-foreground">average views per video</div>
          </div>
          <p className="text-[12px] text-muted-foreground mb-2.5">
            Each row groups your videos by how long the title is. Longer bars mean those videos got more views on average.
          </p>
          <div className="space-y-1.5">
            {lengthBuckets.map((b) => {
              const isWinner = b.uploads > 0 && bestBucket?.label === b.label;
              return (
                <div key={b.label} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground w-20 shrink-0">{b.label}</span>
                  <div className="flex-1 relative h-4 rounded bg-secondary/40 overflow-hidden">
                    {b.uploads > 0 ? (
                      <div
                        className={`absolute inset-y-0 left-0 rounded ${isWinner ? "bg-emerald-400/80" : "bg-blue-400/70"}`}
                        style={{ width: `${Math.max(2, (b.avgViews / maxAvg) * 100)}%` }}
                      />
                    ) : null}
                  </div>
                  <span className="text-xs font-mono tabular-nums w-16 text-right">
                    {b.uploads === 0 ? <span className="text-muted-foreground/60">—</span> : formatNumber(Math.round(b.avgViews))}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/70 w-16 text-right">
                    {b.uploads === 0 ? "no videos" : `${b.uploads} videos`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Comparison
            label="Question marks"
            withDesc="With a ?"
            withoutDesc="Without"
            withIt={signals.withQuestion}
            without={signals.withoutQuestion}
          />
          <Comparison
            label="Numbers in title"
            withDesc="With a number"
            withoutDesc="Without"
            withIt={signals.withNumber}
            without={signals.withoutNumber}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Comparison({
  label,
  withDesc,
  withoutDesc,
  withIt,
  without,
}: {
  label: string;
  withDesc: string;
  withoutDesc: string;
  withIt: { uploads: number; avgViews: number };
  without: { uploads: number; avgViews: number };
}) {
  const enoughData = withIt.uploads >= 2 && without.uploads >= 2;
  const winner = !enoughData
    ? null
    : withIt.avgViews > without.avgViews
    ? "with"
    : without.avgViews > withIt.avgViews
    ? "without"
    : null;
  const max = Math.max(1, withIt.avgViews, without.avgViews);

  return (
    <div className="rounded-md border border-border bg-secondary/30 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
        {!enoughData ? (
          <span className="text-[10px] font-mono text-muted-foreground/70 px-1.5 py-0.5 rounded bg-secondary/60">
            need more data
          </span>
        ) : null}
      </div>
      <ComparisonRow desc={withDesc} stats={withIt} max={max} winner={winner === "with"} />
      <ComparisonRow desc={withoutDesc} stats={without} max={max} winner={winner === "without"} />
    </div>
  );
}

function ComparisonRow({
  desc,
  stats,
  max,
  winner,
}: {
  desc: string;
  stats: { uploads: number; avgViews: number };
  max: number;
  winner: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="flex items-center gap-1.5">
          <span className={winner ? "text-foreground font-medium" : "text-muted-foreground"}>{desc}</span>
          {winner ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-mono px-1 py-0.5 rounded bg-emerald-400/15 text-emerald-300">
              <TrendingUp className="size-2.5" /> better
            </span>
          ) : null}
        </span>
        <span className="font-mono tabular-nums text-foreground/90">
          {stats.uploads === 0 ? "—" : formatNumber(Math.round(stats.avgViews))}
        </span>
      </div>
      <div className="relative h-1.5 rounded bg-secondary/50 overflow-hidden">
        {stats.uploads > 0 ? (
          <div
            className={`absolute inset-y-0 left-0 rounded ${winner ? "bg-emerald-400/70" : "bg-blue-400/60"}`}
            style={{ width: `${Math.max(2, (stats.avgViews / max) * 100)}%` }}
          />
        ) : null}
      </div>
      <div className="text-[10px] font-mono text-muted-foreground/70">
        {stats.uploads} {stats.uploads === 1 ? "video" : "videos"}
      </div>
    </div>
  );
}

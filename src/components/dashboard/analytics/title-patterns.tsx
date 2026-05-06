import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Type } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { titleLengthAnalysis, titleSignals } from "@/lib/analytics-aggregates";
import type { VideoStats } from "@/lib/youtube";

export function TitlePatterns({ videos }: { videos: VideoStats[] }) {
  const lengthBuckets = titleLengthAnalysis(videos);
  const signals = titleSignals(videos);
  const maxAvg = Math.max(1, ...lengthBuckets.map((b) => b.avgViews));

  return (
    <Card>
      <CardHeader>
        <CardDescription className="font-mono uppercase tracking-widest text-xs flex items-center gap-2">
          <Type className="size-3.5" /> Title patterns
        </CardDescription>
        <CardTitle className="text-base">What works in your titles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Length bucket bars */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Avg views by title length</div>
          {lengthBuckets.map((b) => (
            <div key={b.label} className="flex items-center gap-3">
              <span className="text-xs font-mono text-muted-foreground w-16 shrink-0">{b.label}</span>
              <div className="flex-1 relative h-4 rounded bg-secondary/40 overflow-hidden">
                {b.uploads > 0 ? (
                  <div
                    className="absolute inset-y-0 left-0 rounded bg-blue-400/70"
                    style={{ width: `${Math.max(2, (b.avgViews / maxAvg) * 100)}%` }}
                  />
                ) : null}
              </div>
              <span className="text-xs font-mono tabular-nums w-16 text-right">
                {b.uploads === 0 ? <span className="text-muted-foreground/60">—</span> : formatNumber(Math.round(b.avgViews))}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/70 w-10 text-right">
                n={b.uploads}
              </span>
            </div>
          ))}
        </div>

        {/* Question vs not, number vs not */}
        <div className="grid grid-cols-2 gap-3">
          <Pair
            label="With question mark"
            yes={signals.withQuestion}
            no={signals.withoutQuestion}
          />
          <Pair
            label="With a number"
            yes={signals.withNumber}
            no={signals.withoutNumber}
          />
        </div>

        <p className="text-sm text-foreground/90 font-medium pt-1 border-t border-border">
          {signals.recommendation}
        </p>
      </CardContent>
    </Card>
  );
}

function Pair({
  label,
  yes,
  no,
}: {
  label: string;
  yes: { uploads: number; avgViews: number };
  no: { uploads: number; avgViews: number };
}) {
  return (
    <div className="rounded-md border border-border bg-secondary/30 p-2.5">
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5">{label}</div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-muted-foreground">Yes (n={yes.uploads})</div>
          <div className="font-semibold tabular-nums">{formatNumber(Math.round(yes.avgViews))}</div>
        </div>
        <div>
          <div className="text-muted-foreground">No (n={no.uploads})</div>
          <div className="font-semibold tabular-nums">{formatNumber(Math.round(no.avgViews))}</div>
        </div>
      </div>
    </div>
  );
}

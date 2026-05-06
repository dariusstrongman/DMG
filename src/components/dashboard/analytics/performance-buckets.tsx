import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { performanceBuckets } from "@/lib/analytics-aggregates";
import type { VideoStats } from "@/lib/youtube";

export function PerformanceBuckets({ videos }: { videos: VideoStats[] }) {
  const buckets = performanceBuckets(videos);
  const max = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <Card>
      <CardHeader>
        <CardDescription className="font-mono uppercase tracking-widest text-xs">
          Distribution
        </CardDescription>
        <CardTitle className="text-base">Where the views land</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {buckets.map((b) => (
            <div key={b.label} className="flex items-center gap-3">
              <span className="text-xs font-mono text-muted-foreground w-20 shrink-0">{b.label}</span>
              <div className="flex-1 relative h-5 rounded bg-secondary/40 overflow-hidden">
                {b.count > 0 ? (
                  <div
                    className="absolute inset-y-0 left-0 rounded bg-gradient-to-r from-primary/70 to-primary"
                    style={{ width: `${(b.count / max) * 100}%` }}
                  />
                ) : null}
              </div>
              <span className="text-xs font-mono tabular-nums w-20 text-right text-foreground/90">
                {b.count} video{b.count === 1 ? "" : "s"}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/70 w-12 text-right">
                {b.pct.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

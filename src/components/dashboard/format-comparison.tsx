import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Film, Zap } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { formatPerformance, type FormatBucket } from "@/lib/analytics-aggregates";
import type { VideoStats } from "@/lib/youtube";

export function FormatComparison({ videos }: { videos: VideoStats[] }) {
  const r = formatPerformance(videos);
  return (
    <Card>
      <CardHeader>
        <CardDescription className="font-mono uppercase tracking-widest text-xs">
          Format comparison
        </CardDescription>
        <CardTitle className="text-base">Long vs Short</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Side
            icon={<Film className="size-4 text-blue-300" />}
            label="Long-form"
            bucket={r.long}
            tone="blue"
          />
          <Side
            icon={<Zap className="size-4 text-purple-300" />}
            label="Shorts"
            bucket={r.short}
            tone="purple"
          />
        </div>
        <p className="text-sm text-foreground/90 font-medium pt-2 border-t border-border">
          {r.recommendation}
        </p>
      </CardContent>
    </Card>
  );
}

function Side({
  icon,
  label,
  bucket,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  bucket: FormatBucket;
  tone: "blue" | "purple";
}) {
  const ringClass =
    tone === "blue"
      ? "ring-blue-500/20 bg-blue-500/[0.04]"
      : "ring-purple-500/20 bg-purple-500/[0.04]";

  return (
    <div className={`rounded-lg ring-1 ${ringClass} p-3 space-y-2`}>
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Uploads" value={bucket.count.toString()} />
        <Stat label="Avg eng" value={`${bucket.avgEngagement.toFixed(1)}%`} />
        <Stat label="Avg views" value={formatNumber(Math.round(bucket.avgViews))} />
        <Stat label="Median" value={formatNumber(Math.round(bucket.medianViews))} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

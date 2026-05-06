"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function VideoSnapshotChart({
  history,
}: {
  history: Array<{ capturedAt: string; views: number; likes: number; comments: number }>;
}) {
  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-secondary/30 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No history yet. Snapshots will start collecting on the next dashboard load.
        </p>
      </div>
    );
  }
  if (history.length === 1) {
    return (
      <div className="rounded-xl border border-border bg-secondary/30 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          One snapshot captured. The trend line activates once a second one lands (next hour or so).
        </p>
      </div>
    );
  }

  const data = history.map((h) => ({
    t: new Date(h.capturedAt).getTime(),
    views: h.views,
  }));

  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4 h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            stroke="rgba(255,255,255,0.4)"
            fontSize={11}
          />
          <YAxis
            stroke="rgba(255,255,255,0.4)"
            fontSize={11}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K` : String(v))}
            width={48}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(10,12,16,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(t) => new Date(t).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            formatter={(value: number) => [Math.round(value).toLocaleString(), "Views"]}
          />
          <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

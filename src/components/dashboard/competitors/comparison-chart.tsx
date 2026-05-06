"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type Series = {
  name: string;
  color: string;
  points: Array<{ capturedAt: string; subscribers: number }>;
};

const COLORS = [
  "#60a5fa", // blue
  "#a78bfa", // purple
  "#f472b6", // pink
  "#fbbf24", // amber
  "#34d399", // emerald
  "#fb7185", // rose
  "#22d3ee", // cyan
];

export function CompetitorComparisonChart({
  series,
}: {
  series: Series[];
}) {
  // Merge by timestamp into a single dataset Recharts can render. Keys
  // become "Channel A", "Channel B", etc.
  const allTimestamps = new Set<number>();
  for (const s of series) {
    for (const p of s.points) {
      allTimestamps.add(new Date(p.capturedAt).getTime());
    }
  }
  if (allTimestamps.size === 0) {
    return (
      <div className="rounded-xl border border-border bg-secondary/30 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Snapshots are still building up. The chart fills in as competitors get tracked over time.
        </p>
      </div>
    );
  }

  const sorted = Array.from(allTimestamps).sort((a, b) => a - b);
  const data = sorted.map((t) => {
    const row: Record<string, number | undefined> = { t };
    for (const s of series) {
      const match = s.points.find((p) => Math.abs(new Date(p.capturedAt).getTime() - t) < 30 * 60 * 1000);
      if (match) row[s.name] = match.subscribers;
    }
    return row;
  });

  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4 h-72">
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
            tickFormatter={(v) =>
              v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` :
              v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K` :
              String(v)
            }
            width={56}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(10,12,16,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(t) => new Date(t).toLocaleString(undefined, { dateStyle: "medium" })}
            formatter={(value: number) => Math.round(value).toLocaleString()}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }} />
          {series.map((s, i) => (
            <Line
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={s.color || COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export const CHART_COLORS = COLORS;

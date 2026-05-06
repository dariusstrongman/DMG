"use client";

import {
  ScatterChart,
  Scatter,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

type Point = {
  publishedAt: string;
  engagement: number;
  views: number;
  isShort: boolean;
  title: string;
};

export function EngagementTrendChart({ points }: { points: Point[] }) {
  if (points.length < 3) {
    return (
      <p className="text-sm text-muted-foreground">
        Not enough uploads yet to show a trend. Comes alive after ~5 videos.
      </p>
    );
  }

  const data = points.map((p) => ({
    t: new Date(p.publishedAt).getTime(),
    engagement: Number(p.engagement.toFixed(2)),
    isShort: p.isShort,
    title: p.title,
    views: p.views,
  }));

  const avg =
    data.reduce((s, d) => s + d.engagement, 0) / data.length;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 12, bottom: 0, left: 8 }}>
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
            dataKey="engagement"
            stroke="rgba(255,255,255,0.4)"
            fontSize={11}
            tickFormatter={(v) => `${v}%`}
            width={42}
          />
          <ReferenceLine y={avg} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 3" label={{ value: `avg ${avg.toFixed(1)}%`, fill: "rgba(255,255,255,0.5)", fontSize: 10, position: "insideTopLeft" }} />
          <Tooltip
            contentStyle={{
              background: "rgba(10,12,16,0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              fontSize: 12,
            }}
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const p = payload[0].payload as typeof data[number];
              return (
                <div className="rounded-md bg-[rgba(10,12,16,0.95)] border border-white/10 p-2 text-xs max-w-xs">
                  <div className="font-medium text-foreground line-clamp-2">{p.title}</div>
                  <div className="text-muted-foreground mt-1 font-mono">
                    {new Date(p.t).toLocaleDateString()} · {p.isShort ? "Short" : "Long"} · {p.views.toLocaleString()} views · {p.engagement.toFixed(2)}% eng
                  </div>
                </div>
              );
            }}
          />
          <Scatter data={data}>
            {data.map((p, i) => (
              <Cell
                key={i}
                fill={p.isShort ? "rgba(168,85,247,0.85)" : "rgba(96,165,250,0.85)"}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

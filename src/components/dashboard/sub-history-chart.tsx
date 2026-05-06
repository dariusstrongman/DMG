"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

type Point = { t: number; subscribers?: number; projected?: number };

export function SubHistoryChart({
  history,
  projected,
  goal,
}: {
  history: Array<{ capturedAt: string; subscribers: number }>;
  projected: Array<{ capturedAt: string; subscribers: number }>;
  goal: number;
}) {
  if (history.length === 0 && projected.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-secondary/30 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Snapshots will start collecting on your next dashboard load. Come back in a day or two for the trend chart.
        </p>
      </div>
    );
  }

  const data: Point[] = [];
  for (const h of history) {
    data.push({ t: new Date(h.capturedAt).getTime(), subscribers: h.subscribers });
  }
  for (const p of projected) {
    data.push({ t: new Date(p.capturedAt).getTime(), projected: p.subscribers });
  }
  data.sort((a, b) => a.t - b.t);

  const allValues = data.flatMap((d) => [d.subscribers, d.projected]).filter((v): v is number => typeof v === "number");
  const minY = Math.max(0, Math.min(...allValues) * 0.95);
  const maxY = Math.max(goal, ...allValues) * 1.05;

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
            domain={[minY, maxY]}
            tickFormatter={(v) =>
              v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K` : String(v)
            }
            stroke="rgba(255,255,255,0.4)"
            fontSize={11}
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
            formatter={(value: number, name) => [Math.round(value).toLocaleString(), name === "subscribers" ? "Actual" : "Projected"]}
          />
          <ReferenceLine
            y={goal}
            stroke="rgba(74,222,128,0.5)"
            strokeDasharray="4 4"
            label={{ value: `Goal · ${goal.toLocaleString()}`, fill: "rgba(74,222,128,0.8)", fontSize: 11, position: "insideTopRight" }}
          />
          <Line
            type="monotone"
            dataKey="subscribers"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="projected"
            stroke="rgba(74,222,128,0.7)"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

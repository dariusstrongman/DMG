"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { formatNumber } from "@/lib/utils";

type V = {
  id: string;
  title: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  engagement: number;
  isShort: boolean;
};

type CadenceBucket = { week: string; count: number; views: number };

export function ViewsBarChart({ videos }: { videos: V[] }) {
  // Top 10 by views, in publish order so the chart reads chronologically.
  const top = [...videos]
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)
    .sort((a, b) => +new Date(a.publishedAt) - +new Date(b.publishedAt))
    .map((v) => ({
      label: v.title.length > 26 ? v.title.slice(0, 24) + "…" : v.title,
      views: v.views,
      isShort: v.isShort,
    }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={top} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="label"
          stroke="hsl(var(--muted-foreground))"
          fontSize={10}
          angle={-30}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickFormatter={(v) => formatNumber(v)}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          cursor={{ fill: "hsl(var(--accent) / 0.1)" }}
          formatter={(v: number) => formatNumber(v)}
        />
        <Bar dataKey="views" radius={[6, 6, 0, 0]}>
          {top.map((d, i) => (
            <Cell
              key={i}
              fill={d.isShort ? "hsl(var(--accent))" : "hsl(var(--primary))"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EngagementScatter({ videos }: { videos: V[] }) {
  const data = videos
    .filter((v) => v.views > 0)
    .map((v) => ({
      x: v.views,
      y: v.engagement,
      title: v.title,
      isShort: v.isShort,
    }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          type="number"
          dataKey="x"
          name="Views"
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickFormatter={(v) => formatNumber(v)}
          scale="log"
          domain={["auto", "auto"]}
        />
        <YAxis
          type="number"
          dataKey="y"
          name="Engagement"
          unit="%"
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
        />
        <ZAxis range={[40, 40]} />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          cursor={{ strokeDasharray: "3 3" }}
          formatter={(value, name) => {
            if (name === "Views") return [formatNumber(Number(value)), name];
            if (name === "Engagement") return [`${Number(value).toFixed(2)}%`, name];
            return [value, name];
          }}
          labelFormatter={() => ""}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as (typeof data)[number];
            return (
              <div className="bg-card border border-border rounded-md p-2 text-xs max-w-[260px]">
                <div className="font-medium line-clamp-2">{p.title}</div>
                <div className="text-muted-foreground mt-1">
                  {formatNumber(p.x)} views · {p.y.toFixed(2)}% engagement
                </div>
              </div>
            );
          }}
        />
        <Scatter data={data}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.isShort ? "hsl(var(--accent))" : "hsl(var(--primary))"}
              fillOpacity={0.7}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

export function CadenceChart({ videos }: { videos: V[] }) {
  // Bucket by ISO week.
  const buckets = new Map<string, CadenceBucket>();
  for (const v of videos) {
    const d = new Date(v.publishedAt);
    const week = isoWeekKey(d);
    const cur = buckets.get(week) ?? { week, count: 0, views: 0 };
    cur.count += 1;
    cur.views += v.views;
    buckets.set(week, cur);
  }
  const data = Array.from(buckets.values()).sort((a, b) => a.week.localeCompare(b.week));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="week"
          stroke="hsl(var(--muted-foreground))"
          fontSize={10}
          angle={-30}
          textAnchor="end"
          interval={0}
        />
        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          cursor={{ fill: "hsl(var(--accent) / 0.1)" }}
          formatter={(v: number, name) => [
            name === "views" ? formatNumber(v) : v,
            name === "count" ? "Uploads" : "Views",
          ]}
        />
        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function isoWeekKey(d: Date): string {
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((+tmp - +yearStart) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

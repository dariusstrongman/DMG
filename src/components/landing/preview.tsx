"use client";

import { motion } from "framer-motion";
import { TrendingUp, Eye, Users, DollarSign } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

const series = Array.from({ length: 30 }).map((_, i) => ({
  d: i,
  v: 1200 + Math.sin(i / 3) * 400 + i * 80 + Math.random() * 200
}));

export function LandingPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
    >
      {/* Glow under preview */}
      <div className="absolute inset-x-0 -bottom-10 top-10 bg-[radial-gradient(closest-side,hsl(var(--primary)/0.3),transparent)] blur-2xl" />

      <div className="relative glass-strong rounded-2xl p-1 shadow-2xl shadow-primary/10">
        <div className="rounded-xl bg-background/50 p-5 sm:p-7">
          {/* Top row: KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <Kpi icon={Users} label="Subscribers" value="142.8K" delta="+1.2K" deltaPos />
            <Kpi icon={Eye} label="Views (30d)" value="4.21M" delta="+18%" deltaPos />
            <Kpi icon={TrendingUp} label="CTR" value="6.4%" delta="+0.7" deltaPos />
            <Kpi icon={DollarSign} label="Est. revenue" value="$3,847" delta="+22%" deltaPos />
          </div>

          {/* Big chart */}
          <div className="rounded-xl border border-border bg-card/50 p-4 h-[260px]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Views over time
                </p>
                <p className="text-lg font-semibold tabular-nums">last 30 days</p>
              </div>
              <div className="flex gap-1 text-xs font-mono">
                {["7d", "30d", "90d"].map((r, i) => (
                  <span
                    key={r}
                    className={`px-2.5 py-1 rounded-md ${
                      i === 1
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height="80%">
              <AreaChart data={series} margin={{ left: 0, right: 0, top: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" hide />
                <YAxis hide domain={[0, "dataMax + 500"]} />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#g1)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  delta,
  deltaPos
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta: string;
  deltaPos?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4 hover:border-primary/40 transition">
      <div className="flex items-center justify-between mb-2.5">
        <Icon className="size-4 text-muted-foreground" />
        <span
          className={`text-xs font-mono ${deltaPos ? "text-success" : "text-destructive"}`}
        >
          {delta}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums mt-0.5">{value}</p>
    </div>
  );
}

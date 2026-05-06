import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Target, CalendarClock } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import {
  type GoalProjection,
  formatPace,
  formatDays,
  formatEta,
} from "@/lib/projections";
export function GoalTracker({
  projection,
  goalDeadline,
}: {
  projection: GoalProjection;
  goalDeadline?: string | null;
}) {
  const p = projection;

  const trendIcon =
    p.trend === "up" ? <TrendingUp className="size-3.5" /> :
    p.trend === "down" ? <TrendingDown className="size-3.5" /> :
    <Minus className="size-3.5" />;
  const trendClass =
    p.trend === "up" ? "text-emerald-400" :
    p.trend === "down" ? "text-rose-400" :
    "text-muted-foreground";

  const onPaceLabel = computeOnPaceLabel(p, goalDeadline ?? null);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardDescription className="font-mono uppercase tracking-widest text-xs flex items-center gap-2">
          <Target className="size-3.5" /> Goal tracker
        </CardDescription>
        <CardTitle className="flex items-baseline gap-3">
          <span className="text-3xl font-semibold tabular-nums">
            {p.current.toLocaleString()}
          </span>
          <span className="text-base text-muted-foreground">/ {p.goal.toLocaleString()} subs</span>
          {p.goalReached ? (
            <span className="ml-auto px-2 py-0.5 rounded text-xs font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Goal reached
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Progress bar */}
        <div>
          <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden ring-1 ring-border">
            <div
              className="h-full bg-gradient-to-r from-primary to-emerald-400 transition-[width] duration-500"
              style={{ width: `${p.progressPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-muted-foreground font-mono">
            <span>{p.progressPct.toFixed(1)}% there</span>
            <span>{p.remaining.toLocaleString()} to go</span>
          </div>
        </div>

        {/* ETA + pace grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat
            label="ETA"
            icon={<CalendarClock className="size-3.5" />}
            value={p.cold ? "gathering data" : formatEta(p.etaDate)}
            sub={p.cold ? "need 2+ snapshots" : formatDays(p.daysToGoal)}
          />
          <Stat
            label="Pace · 7d"
            icon={trendIcon}
            iconClass={trendClass}
            value={formatPace(p.pace7d.perDay)}
          />
          <Stat
            label="Pace · 30d"
            value={formatPace(p.pace30d.perDay)}
          />
          <Stat
            label="Pace · all time"
            value={formatPace(p.paceLifetime.perDay)}
          />
        </div>

        {onPaceLabel ? (
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            {onPaceLabel}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  sub,
  icon,
  iconClass,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  iconClass?: string;
}) {
  return (
    <div className="rounded-lg bg-secondary/40 border border-border p-3">
      <div className={`flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground ${iconClass ?? ""}`}>
        {icon}
        {label}
      </div>
      <div className="text-base font-semibold mt-1 tabular-nums">{value}</div>
      {sub ? <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div> : null}
    </div>
  );
}

function computeOnPaceLabel(p: GoalProjection, deadlineIso: string | null): string | null {
  if (!deadlineIso || !p.etaDate || p.goalReached) return null;
  const deadline = new Date(deadlineIso);
  if (isNaN(deadline.getTime())) return null;
  const slackDays = (deadline.getTime() - p.etaDate.getTime()) / (24 * 60 * 60 * 1000);
  if (slackDays >= 0) {
    return `On pace · ${Math.round(slackDays)} days of slack vs ${deadline.toDateString()}`;
  }
  return `Behind · need ${Math.abs(Math.round(slackDays))} more days at this rate`;
}

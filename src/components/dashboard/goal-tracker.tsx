import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Target, CalendarClock, Zap, Upload, Percent } from "lucide-react";
import {
  type GoalProjection,
  type MonteCarloProjection,
  formatPace,
  formatDays,
  formatEta,
  formatMonth,
  formatPct,
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
  const mc = p.monteCarlo;
  const useMc = !!(mc && mc.reason === "ok" && mc.p50Date && mc.hitRate >= 0.05);

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

        {/* Outlook block — Monte Carlo when we have enough video data,
            linear ETA as a fallback. */}
        {useMc ? (
          <McOutlook mc={mc as MonteCarloProjection} linearEta={p.etaDate} />
        ) : (
          <LinearOutlook
            etaDate={p.etaDate}
            cold={p.cold}
            daysToGoal={p.daysToGoal}
            mcReason={mc?.reason}
          />
        )}

        {/* Pace strip */}
        <div className="grid grid-cols-3 gap-3">
          <Stat
            label="Pace · 7d"
            icon={trendIcon}
            iconClass={trendClass}
            value={formatPace(p.pace7d.perDay)}
          />
          <Stat label="Pace · 30d" value={formatPace(p.pace30d.perDay)} />
          <Stat label="Pace · all time" value={formatPace(p.paceLifetime.perDay)} />
        </div>

        {/* Growth signals — why the projection looks the way it does. */}
        {mc && (mc.reason === "ok" || mc.recentVideosUsed > 0) ? (
          <GrowthSignals mc={mc} />
        ) : null}

        {onPaceLabel ? (
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            {onPaceLabel}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function McOutlook({ mc, linearEta }: { mc: MonteCarloProjection; linearEta: Date | null }) {
  const horizonYears = mc.horizonDays / 365;
  const hint = linearEta
    ? `Linear extrapolation alone says ${linearEta.toLocaleDateString(undefined, { month: "short", year: "numeric" })}, but linear ignores breakout videos.`
    : "Linear extrapolation isn't useful at your current pace — this model is.";
  return (
    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-emerald-300">
        <CalendarClock className="size-3.5" /> Outlook (Monte Carlo · {mc.recentVideosUsed} recent videos)
      </div>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <div className="text-2xl font-semibold tabular-nums">{formatMonth(mc.p50Date)}</div>
        <div className="text-xs font-mono text-muted-foreground">
          median · range {formatMonth(mc.p10Date)} → {formatMonth(mc.p90Date)}
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        <span className="text-foreground font-mono">{formatPct(mc.hitRate)}</span> chance of hitting goal within {horizonYears.toFixed(0)} years.
      </div>
      <div className="text-[11px] text-muted-foreground/80">{hint}</div>
    </div>
  );
}

function LinearOutlook({
  etaDate,
  cold,
  daysToGoal,
  mcReason,
}: {
  etaDate: Date | null;
  cold: boolean;
  daysToGoal: number | null;
  mcReason?: MonteCarloProjection["reason"];
}) {
  const tooCold = mcReason === "too_cold";
  const noViews = mcReason === "no_views";
  return (
    <div className="rounded-lg bg-secondary/40 border border-border p-4 space-y-1">
      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        <CalendarClock className="size-3.5" /> ETA · linear (rough)
      </div>
      <div className="text-2xl font-semibold tabular-nums">
        {cold ? "gathering data" : formatEta(etaDate)}
      </div>
      <div className="text-xs text-muted-foreground">
        {cold ? "need 2+ snapshots" : daysToGoal !== null ? formatDays(daysToGoal) : "—"}
      </div>
      {tooCold ? (
        <div className="text-[11px] text-muted-foreground/80 pt-1">
          Not enough recent uploads to model breakout potential. Post more videos to unlock the Monte Carlo outlook.
        </div>
      ) : noViews ? (
        <div className="text-[11px] text-muted-foreground/80 pt-1">
          Recent videos have ~0 views, so the empirical model can't sample upside. Linear is the only floor right now.
        </div>
      ) : null}
    </div>
  );
}

function GrowthSignals({ mc }: { mc: MonteCarloProjection }) {
  const cadenceLabel =
    mc.uploadsPerDay >= 1
      ? `${mc.uploadsPerDay.toFixed(1)} / day`
      : `${(mc.uploadsPerDay * 7).toFixed(1)} / week`;
  const hitFraction = mc.recentVideosUsed > 0
    ? mc.hitVideoCount / mc.recentVideosUsed
    : 0;
  const hitLabel =
    mc.hitVideoCount > 0
      ? `1 in ${Math.max(2, Math.round(1 / hitFraction))} (${mc.hitVideoCount}/${mc.recentVideosUsed})`
      : `0 / ${mc.recentVideosUsed}`;
  return (
    <div className="grid grid-cols-3 gap-3">
      <Stat
        label="Upload cadence"
        icon={<Upload className="size-3.5" />}
        value={cadenceLabel}
      />
      <Stat
        label="Breakout rate"
        icon={<Zap className="size-3.5" />}
        value={hitLabel}
        sub="videos ≥ 3× median"
      />
      <Stat
        label="Follow / view"
        icon={<Percent className="size-3.5" />}
        value={`${(mc.conversionRate * 100).toFixed(2)}%`}
      />
    </div>
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

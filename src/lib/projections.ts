// Pure projection helpers. No DB / network. Easy to reason about and
// test. Given a list of subscriber snapshots ascending by capturedAt,
// produce paces (subs/day) over rolling windows and an ETA to a goal.

export type SubSnapshot = { subscribers: number; capturedAt: Date };

export type Pace = {
  windowDays: number;
  perDay: number | null;
  dataPoints: number;
};

export type GoalProjection = {
  goal: number;
  current: number;
  remaining: number;
  progressPct: number;

  pace7d: Pace;
  pace30d: Pace;
  paceLifetime: Pace;

  // Primary projection uses pace30d if it has >=2 data points and a
  // positive rate, otherwise falls back to lifetime, otherwise null.
  daysToGoal: number | null;
  etaDate: Date | null;

  // Trend compares 7d pace against 30d pace.
  trend: "up" | "down" | "flat" | "unknown";

  // True when goal has already been hit. UI should celebrate.
  goalReached: boolean;

  // True when we don't have enough history (<2 points across >24h).
  // UI should say "gathering data" and not show ETA.
  cold: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function paceOver(
  snapshots: SubSnapshot[],
  windowDays: number,
  now: Date
): Pace {
  const cutoff = now.getTime() - windowDays * DAY_MS;
  const inWindow = snapshots.filter((s) => s.capturedAt.getTime() >= cutoff);
  if (inWindow.length < 2) {
    return { windowDays, perDay: null, dataPoints: inWindow.length };
  }
  const first = inWindow[0];
  const last = inWindow[inWindow.length - 1];
  const days =
    (last.capturedAt.getTime() - first.capturedAt.getTime()) / DAY_MS;
  if (days <= 0) {
    return { windowDays, perDay: null, dataPoints: inWindow.length };
  }
  return {
    windowDays,
    perDay: (last.subscribers - first.subscribers) / days,
    dataPoints: inWindow.length,
  };
}

export function project(
  snapshots: SubSnapshot[],
  goal: number,
  now: Date = new Date()
): GoalProjection {
  const sorted = [...snapshots].sort(
    (a, b) => a.capturedAt.getTime() - b.capturedAt.getTime()
  );
  const current = sorted.length > 0 ? sorted[sorted.length - 1].subscribers : 0;
  const remaining = Math.max(0, goal - current);
  const progressPct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  const goalReached = current >= goal;

  const pace7d = paceOver(sorted, 7, now);
  const pace30d = paceOver(sorted, 30, now);
  const paceLifetime = paceOver(sorted, 365 * 10, now);

  const cold = sorted.length < 2;

  // Pick best available pace for ETA. Prefer 30d window for stability.
  const primary =
    pace30d.perDay && pace30d.perDay > 0
      ? pace30d.perDay
      : paceLifetime.perDay && paceLifetime.perDay > 0
      ? paceLifetime.perDay
      : null;

  let daysToGoal: number | null = null;
  let etaDate: Date | null = null;
  if (!goalReached && primary && primary > 0 && remaining > 0) {
    daysToGoal = remaining / primary;
    etaDate = new Date(now.getTime() + daysToGoal * DAY_MS);
  }

  let trend: GoalProjection["trend"] = "unknown";
  if (pace7d.perDay !== null && pace30d.perDay !== null) {
    const delta = pace7d.perDay - pace30d.perDay;
    const ref = Math.max(Math.abs(pace30d.perDay), 1);
    if (delta / ref > 0.1) trend = "up";
    else if (delta / ref < -0.1) trend = "down";
    else trend = "flat";
  }

  return {
    goal,
    current,
    remaining,
    progressPct,
    pace7d,
    pace30d,
    paceLifetime,
    daysToGoal,
    etaDate,
    trend,
    goalReached,
    cold,
  };
}

// "in 47 days" / "in 3 months" / "today"
export function formatDays(days: number | null): string {
  if (days === null) return "—";
  if (days < 1) return "today";
  if (days < 60) return `${Math.round(days)} day${Math.round(days) === 1 ? "" : "s"}`;
  const months = days / 30;
  if (months < 18) return `${months.toFixed(1)} months`;
  return `${(days / 365).toFixed(1)} years`;
}

// "+12.4 / day" / "—"
export function formatPace(perDay: number | null): string {
  if (perDay === null) return "—";
  const sign = perDay >= 0 ? "+" : "";
  if (Math.abs(perDay) >= 100) return `${sign}${Math.round(perDay)} / day`;
  return `${sign}${perDay.toFixed(1)} / day`;
}

export function formatEta(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Build a projected line of points from now to the ETA, for charting.
// Returns at most ~30 points so the dotted projection line stays smooth.
export function projectedLine(
  current: number,
  perDay: number,
  goal: number,
  now: Date = new Date()
): Array<{ capturedAt: Date; subscribers: number }> {
  if (perDay <= 0 || current >= goal) return [];
  const remaining = goal - current;
  const totalDays = remaining / perDay;
  const stepDays = Math.max(1, Math.ceil(totalDays / 30));
  const out: Array<{ capturedAt: Date; subscribers: number }> = [];
  for (let d = 0; d <= totalDays; d += stepDays) {
    out.push({
      capturedAt: new Date(now.getTime() + d * DAY_MS),
      subscribers: Math.min(goal, current + perDay * d),
    });
  }
  // ensure final point lands exactly on the goal
  out.push({
    capturedAt: new Date(now.getTime() + totalDays * DAY_MS),
    subscribers: goal,
  });
  return out;
}

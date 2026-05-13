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

  // Monte Carlo projection over the empirical per-video view
  // distribution. Captures the heavy-tailed reality of short-form
  // creator growth: each upload is a chance at a breakout. Null when
  // there isn't enough video history to sample from.
  monteCarlo: MonteCarloProjection | null;
};

export type VideoStat = {
  views: number;
  publishedAt: Date | string;
};

export type MonteCarloProjection = {
  // P10 = optimistic (10% of trials hit by here), P50 = median, P90 = pessimistic.
  p10Days: number | null;
  p50Days: number | null;
  p90Days: number | null;
  p10Date: Date | null;
  p50Date: Date | null;
  p90Date: Date | null;
  // Fraction of trials that crossed the goal within the horizon.
  hitRate: number;
  horizonDays: number;
  // Signals fed to the simulation, surfaced in UI so users see WHY.
  uploadsPerDay: number;
  conversionRate: number;
  recentVideosUsed: number;
  hitVideoCount: number;   // count of recent videos with views >= 3 * median
  medianViews: number;
  reason: "ok" | "too_cold" | "no_views" | "no_uploads";
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
  now: Date = new Date(),
  videos: VideoStat[] = []
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

  const monteCarlo = goalReached
    ? null
    : projectMonteCarlo({
        current,
        goal,
        videos,
        snapshots: sorted,
        now,
      });

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
    monteCarlo,
  };
}

// ── Monte Carlo projection ──────────────────────────────────────────
//
// Why this exists: linear extrapolation of subs/day systematically
// underestimates creator growth because per-video views are heavy-
// tailed (top 10% of videos pull the majority of views) and each
// upload is an independent shot at a breakout. Linear says "you'll
// hit 10k in 2040." Reality is "1 in 8 of your videos goes 3x median,
// and at your upload cadence that means a breakout every 12 days."
//
// Algorithm: for each trial, simulate the next 3 years of uploads.
// Each simulated upload draws views from your actual recent-video
// distribution (preserving the long tail). Convert views → subs at
// your fitted follow rate. Record the first day cumulative subs cross
// the goal. Quantiles across trials give P10 / P50 / P90 dates.

const DEFAULT_HORIZON_DAYS = 3 * 365;
const DEFAULT_TRIALS = 4000;
const DEFAULT_CONVERSION_RATE = 0.004; // 0.4% follow-per-view, conservative

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ageDays(d: Date | string, now: Date): number {
  const t = typeof d === "string" ? new Date(d).getTime() : d.getTime();
  return (now.getTime() - t) / DAY_MS;
}

export function projectMonteCarlo(args: {
  current: number;
  goal: number;
  videos: VideoStat[];
  snapshots?: SubSnapshot[];
  now?: Date;
  trials?: number;
  horizonDays?: number;
  seed?: number;
}): MonteCarloProjection {
  const now = args.now ?? new Date();
  const horizonDays = args.horizonDays ?? DEFAULT_HORIZON_DAYS;
  const trials = args.trials ?? DEFAULT_TRIALS;
  const remaining = Math.max(0, args.goal - args.current);

  const empty: MonteCarloProjection = {
    p10Days: null,
    p50Days: null,
    p90Days: null,
    p10Date: null,
    p50Date: null,
    p90Date: null,
    hitRate: 0,
    horizonDays,
    uploadsPerDay: 0,
    conversionRate: 0,
    recentVideosUsed: 0,
    hitVideoCount: 0,
    medianViews: 0,
    reason: "too_cold",
  };

  if (remaining <= 0) {
    return { ...empty, hitRate: 1, p10Days: 0, p50Days: 0, p90Days: 0, p10Date: now, p50Date: now, p90Date: now, reason: "ok" };
  }

  // Pick the freshest window with at least 5 videos: 90d → 180d → 365d.
  const candidates = [90, 180, 365];
  let windowDays = 0;
  let inWindow: VideoStat[] = [];
  for (const w of candidates) {
    const filtered = args.videos.filter((v) => {
      const a = ageDays(v.publishedAt, now);
      return a >= 0 && a <= w;
    });
    if (filtered.length >= 5) {
      windowDays = w;
      inWindow = filtered;
      break;
    }
  }
  if (inWindow.length < 5) return empty;

  const viewsArr = inWindow.map((v) => Math.max(0, Math.floor(v.views)));
  const totalViews = viewsArr.reduce((s, v) => s + v, 0);
  if (totalViews <= 0) return { ...empty, recentVideosUsed: inWindow.length, reason: "no_views" };

  // Sort copy for quantiles
  const sortedViews = [...viewsArr].sort((a, b) => a - b);
  const medianViews = sortedViews[Math.floor(sortedViews.length / 2)] || 0;
  const hitThreshold = Math.max(1, medianViews * 3);
  const hitVideoCount = viewsArr.filter((v) => v >= hitThreshold).length;

  const uploadsPerDay = inWindow.length / windowDays;
  if (uploadsPerDay <= 0) return { ...empty, recentVideosUsed: inWindow.length, medianViews, hitVideoCount, reason: "no_uploads" };

  // Fit conversion rate from snapshot delta vs view sum over an
  // overlapping recent window, when we have it. Clamp so a single
  // outlier doesn't blow up the simulation.
  let conversionRate = DEFAULT_CONVERSION_RATE;
  const snaps = args.snapshots ?? [];
  if (snaps.length >= 2) {
    // Find earliest snap within last 30 days. Sub gain over that span
    // divided by views from videos posted in same span.
    const cutoff = now.getTime() - 30 * DAY_MS;
    const recent = snaps.filter((s) => s.capturedAt.getTime() >= cutoff);
    if (recent.length >= 2) {
      const subDelta = recent[recent.length - 1].subscribers - recent[0].subscribers;
      const viewsIn30 = args.videos
        .filter((v) => ageDays(v.publishedAt, now) <= 30)
        .reduce((s, v) => s + Math.max(0, v.views), 0);
      if (subDelta > 0 && viewsIn30 > 100) {
        conversionRate = Math.min(0.05, Math.max(0.0005, subDelta / viewsIn30));
      }
    }
  }

  const rng = mulberry32(args.seed ?? 0xC0FFEE);
  const lambda = uploadsPerDay; // expected uploads per day

  // Interarrival exponential sample: -ln(U)/λ
  const sampleInterarrival = (): number => -Math.log(1 - rng()) / lambda;
  const sampleView = (): number => viewsArr[Math.floor(rng() * viewsArr.length)] ?? 0;

  const hitDays: number[] = [];
  let hits = 0;
  for (let t = 0; t < trials; t++) {
    let day = 0;
    let cumSubs = 0;
    // safety cap on uploads/trial in case lambda is enormous
    const maxUploads = Math.ceil(uploadsPerDay * horizonDays * 3) + 100;
    for (let u = 0; u < maxUploads; u++) {
      day += sampleInterarrival();
      if (day > horizonDays) break;
      const v = sampleView();
      cumSubs += v * conversionRate;
      if (cumSubs >= remaining) {
        hitDays.push(day);
        hits++;
        break;
      }
    }
  }

  if (hits === 0) {
    return {
      ...empty,
      uploadsPerDay,
      conversionRate,
      recentVideosUsed: inWindow.length,
      medianViews,
      hitVideoCount,
      hitRate: 0,
      reason: "ok",
    };
  }

  // Quantiles only over trials that hit. P50 is honest within hits;
  // hitRate tells the user how likely those hits are.
  hitDays.sort((a, b) => a - b);
  const q = (p: number) => {
    const idx = Math.min(hitDays.length - 1, Math.max(0, Math.floor(hitDays.length * p)));
    return hitDays[idx];
  };
  const p10 = q(0.1);
  const p50 = q(0.5);
  const p90 = q(0.9);
  const toDate = (d: number) => new Date(now.getTime() + d * DAY_MS);

  return {
    p10Days: p10,
    p50Days: p50,
    p90Days: p90,
    p10Date: toDate(p10),
    p50Date: toDate(p50),
    p90Date: toDate(p90),
    hitRate: hits / trials,
    horizonDays,
    uploadsPerDay,
    conversionRate,
    recentVideosUsed: inWindow.length,
    hitVideoCount,
    medianViews,
    reason: "ok",
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

// "Mar 2028" — coarser than formatEta because a Monte Carlo P50 to
// the day implies false precision.
export function formatMonth(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export function formatPct(x: number): string {
  if (!isFinite(x)) return "—";
  if (x >= 0.995) return "100%";
  if (x < 0.005) return "<1%";
  return `${Math.round(x * 100)}%`;
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

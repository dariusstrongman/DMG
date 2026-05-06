// Pure aggregation helpers over a list of VideoStats. No DB / network.

import type { VideoStats } from "./youtube";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Hour buckets — we group every 4 hours so the heatmap reads cleanly.
// 0 = 00-03, 1 = 04-07, ..., 5 = 20-23.
export const HOUR_BUCKETS = [
  { idx: 0, label: "00-04" },
  { idx: 1, label: "04-08" },
  { idx: 2, label: "08-12" },
  { idx: 3, label: "12-16" },
  { idx: 4, label: "16-20" },
  { idx: 5, label: "20-24" },
] as const;

export type DayHourBucket = {
  day: number; // 0=Sun ... 6=Sat
  dayLabel: string;
  hourBucket: number; // 0..5
  hourLabel: string;
  uploads: number;
  totalViews: number;
  avgViews: number;
};

export type BestPostingResult = {
  buckets: DayHourBucket[];
  bestBucket: DayHourBucket | null;
  bestDay: { day: number; dayLabel: string; avg: number; uploads: number } | null;
  worstDay: { day: number; dayLabel: string; avg: number; uploads: number } | null;
  channelAvg: number;
};

// Build a 7×6 grid of (day, 4h bucket) → avg views. Channel-relative
// so a "good" bucket is one above the channel average. Buckets with
// zero uploads still get a row so the heatmap renders the empty cell.
export function bestPostingTimes(videos: VideoStats[]): BestPostingResult {
  const grid = new Map<string, { uploads: number; totalViews: number }>();
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 6; h++) {
      grid.set(`${d}:${h}`, { uploads: 0, totalViews: 0 });
    }
  }

  for (const v of videos) {
    const dt = new Date(v.publishedAt);
    const day = dt.getUTCDay();
    const hourBucket = Math.floor(dt.getUTCHours() / 4);
    const key = `${day}:${hourBucket}`;
    const cell = grid.get(key)!;
    cell.uploads += 1;
    cell.totalViews += v.views;
  }

  const buckets: DayHourBucket[] = [];
  for (const [key, val] of grid.entries()) {
    const [d, h] = key.split(":").map(Number);
    buckets.push({
      day: d,
      dayLabel: DAY_NAMES[d],
      hourBucket: h,
      hourLabel: HOUR_BUCKETS[h].label,
      uploads: val.uploads,
      totalViews: val.totalViews,
      avgViews: val.uploads > 0 ? val.totalViews / val.uploads : 0,
    });
  }

  // Day-level rollups (across all hours of that day).
  const dayRollup = new Map<number, { uploads: number; totalViews: number }>();
  for (const b of buckets) {
    const r = dayRollup.get(b.day) ?? { uploads: 0, totalViews: 0 };
    r.uploads += b.uploads;
    r.totalViews += b.totalViews;
    dayRollup.set(b.day, r);
  }
  const dayStats = Array.from(dayRollup.entries())
    .map(([day, r]) => ({
      day,
      dayLabel: DAY_NAMES[day],
      avg: r.uploads > 0 ? r.totalViews / r.uploads : 0,
      uploads: r.uploads,
    }))
    .filter((d) => d.uploads > 0);

  const bestBucket =
    buckets.filter((b) => b.uploads > 0).sort((a, b) => b.avgViews - a.avgViews)[0] ?? null;
  const bestDay =
    dayStats.length > 0 ? [...dayStats].sort((a, b) => b.avg - a.avg)[0] : null;
  const worstDay =
    dayStats.length > 1 ? [...dayStats].sort((a, b) => a.avg - b.avg)[0] : null;

  const totalUploads = videos.length;
  const channelAvg =
    totalUploads > 0 ? videos.reduce((s, v) => s + v.views, 0) / totalUploads : 0;

  return { buckets, bestBucket, bestDay, worstDay, channelAvg };
}

// ─────────── Long vs Short performance ───────────

export type FormatBucket = {
  count: number;
  totalViews: number;
  avgViews: number;
  medianViews: number;
  totalEngagement: number;
  avgEngagement: number;
};

export type FormatComparisonResult = {
  long: FormatBucket;
  short: FormatBucket;
  recommendation: string;
};

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function bucketize(videos: VideoStats[]): FormatBucket {
  const count = videos.length;
  const totalViews = videos.reduce((s, v) => s + v.views, 0);
  const totalEngagement = videos.reduce((s, v) => s + v.engagement, 0);
  return {
    count,
    totalViews,
    avgViews: count > 0 ? totalViews / count : 0,
    medianViews: median(videos.map((v) => v.views)),
    totalEngagement,
    avgEngagement: count > 0 ? totalEngagement / count : 0,
  };
}

export function formatPerformance(videos: VideoStats[]): FormatComparisonResult {
  const long = bucketize(videos.filter((v) => !v.isShort));
  const short = bucketize(videos.filter((v) => v.isShort));

  let recommendation = "";
  if (long.count === 0 && short.count > 0) {
    recommendation = "Only Shorts in this window. Try a long-form to broaden the funnel.";
  } else if (short.count === 0 && long.count > 0) {
    recommendation = "Only long-form in this window. Shorts can pull subs into the channel cheaply, worth experimenting.";
  } else if (long.count > 0 && short.count > 0) {
    // Compare medians (more robust than averages with one viral outlier).
    const ratio = short.medianViews / Math.max(long.medianViews, 1);
    if (ratio >= 1.8) {
      recommendation = `Shorts pull ~${ratio.toFixed(1)}x the views of long-form on this channel. Lean into Shorts.`;
    } else if (ratio <= 0.55) {
      recommendation = `Long-form pulls ~${(1 / ratio).toFixed(1)}x the views of Shorts. Lean into long-form.`;
    } else {
      recommendation = "Both formats perform comparably. Pick whichever you can produce faster.";
    }
  } else {
    recommendation = "Not enough data yet.";
  }

  return { long, short, recommendation };
}

// ─────────── Upload cadence ───────────

export type CadenceWeek = { week: string; count: number; views: number };

// Returns the last `weeks` ISO weeks, ascending. Pads empty weeks with 0.
export function uploadCadence(videos: VideoStats[], weeks = 12): CadenceWeek[] {
  const now = new Date();
  const buckets = new Map<string, { count: number; views: number }>();
  // Pre-seed the last N week keys so empty weeks render as zero columns.
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i * 7);
    const k = isoWeekKey(d);
    buckets.set(k, { count: 0, views: 0 });
  }
  for (const v of videos) {
    const k = isoWeekKey(new Date(v.publishedAt));
    if (!buckets.has(k)) continue; // outside window
    const b = buckets.get(k)!;
    b.count += 1;
    b.views += v.views;
  }
  return Array.from(buckets.entries())
    .map(([week, b]) => ({ week, ...b }))
    .sort((a, b) => (a.week < b.week ? -1 : 1));
}

function isoWeekKey(d: Date): string {
  // ISO week: Mon-Sun. Shift to Thursday of same week, count from Jan 4.
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

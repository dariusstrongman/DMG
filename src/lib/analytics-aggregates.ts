// Pure aggregation helpers over a list of VideoStats. No DB / network.

import type { VideoStats } from "./youtube";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Get day-of-week (0=Sun) and hour-of-day (0-23) for a given Date in
// a target IANA timezone. Defaults to UTC if no zone provided.
function tzParts(d: Date, timezone?: string): { day: number; hour: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const wk = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hourStr = parts.find((p) => p.type === "hour")?.value ?? "0";
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  // en-US with hour12=false sometimes returns "24" for midnight.
  const hour = parseInt(hourStr, 10) % 24;
  return { day: map[wk] ?? 0, hour: Number.isFinite(hour) ? hour : 0 };
}

function fmtHourLabel(h: number): string {
  // 12h labels read more naturally to most users.
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

function fmtHourRangeLabel(h: number, span: number): string {
  return `${fmtHourLabel(h)}–${fmtHourLabel((h + span) % 24)}`;
}

// 2-hour buckets, in 12h labels for clarity.
export const HOUR_BUCKETS = Array.from({ length: 12 }, (_, i) => ({
  idx: i,
  startHour: i * 2,
  label: fmtHourRangeLabel(i * 2, 2),
}));

export type Slot = {
  day: number;
  dayLabel: string;
  dayLabelFull: string;
  hourBucket: number;
  hourLabel: string; // "2pm-4pm"
  uploads: number;
  avgViews: number;
};

export type DayStat = {
  day: number;
  dayLabel: string;
  dayLabelFull: string;
  uploads: number;
  avgViews: number;
};

export type HourStat = {
  hourBucket: number;
  hourLabel: string;
  uploads: number;
  avgViews: number;
};

export type PostingTimeAnalysis = {
  topSlots: Slot[];     // best slots ranked by avg views (uploads >= 1)
  worstSlots: Slot[];   // bottom slots that have data
  byDay: DayStat[];     // 7 entries, sorted Sun-Sat
  byHour: HourStat[];   // 12 entries, 2h buckets, sorted by hour
  channelAvg: number;
  timezone: string;
};

export function postingTimeAnalysis(
  videos: VideoStats[],
  timezone?: string
): PostingTimeAnalysis {
  const slotMap = new Map<string, { uploads: number; totalViews: number }>();
  const dayMap = new Map<number, { uploads: number; totalViews: number }>();
  const hourMap = new Map<number, { uploads: number; totalViews: number }>();

  for (const v of videos) {
    const { day, hour } = tzParts(new Date(v.publishedAt), timezone);
    const hourBucket = Math.floor(hour / 2);

    const sk = `${day}:${hourBucket}`;
    const s = slotMap.get(sk) ?? { uploads: 0, totalViews: 0 };
    s.uploads += 1;
    s.totalViews += v.views;
    slotMap.set(sk, s);

    const d = dayMap.get(day) ?? { uploads: 0, totalViews: 0 };
    d.uploads += 1;
    d.totalViews += v.views;
    dayMap.set(day, d);

    const h = hourMap.get(hourBucket) ?? { uploads: 0, totalViews: 0 };
    h.uploads += 1;
    h.totalViews += v.views;
    hourMap.set(hourBucket, h);
  }

  const slots: Slot[] = Array.from(slotMap.entries()).map(([key, val]) => {
    const [d, hb] = key.split(":").map(Number);
    return {
      day: d,
      dayLabel: DAY_NAMES[d],
      dayLabelFull: DAY_NAMES_FULL[d],
      hourBucket: hb,
      hourLabel: HOUR_BUCKETS[hb].label,
      uploads: val.uploads,
      avgViews: val.uploads > 0 ? val.totalViews / val.uploads : 0,
    };
  });

  const byDay: DayStat[] = Array.from({ length: 7 }, (_, day) => {
    const r = dayMap.get(day) ?? { uploads: 0, totalViews: 0 };
    return {
      day,
      dayLabel: DAY_NAMES[day],
      dayLabelFull: DAY_NAMES_FULL[day],
      uploads: r.uploads,
      avgViews: r.uploads > 0 ? r.totalViews / r.uploads : 0,
    };
  });

  const byHour: HourStat[] = Array.from({ length: 12 }, (_, hb) => {
    const r = hourMap.get(hb) ?? { uploads: 0, totalViews: 0 };
    return {
      hourBucket: hb,
      hourLabel: HOUR_BUCKETS[hb].label,
      uploads: r.uploads,
      avgViews: r.uploads > 0 ? r.totalViews / r.uploads : 0,
    };
  });

  const sortedSlotsWithData = slots
    .filter((s) => s.uploads > 0)
    .sort((a, b) => b.avgViews - a.avgViews);

  const totalUploads = videos.length;
  const channelAvg =
    totalUploads > 0 ? videos.reduce((s, v) => s + v.views, 0) / totalUploads : 0;

  return {
    topSlots: sortedSlotsWithData.slice(0, 3),
    worstSlots: sortedSlotsWithData.slice(-3).reverse(),
    byDay,
    byHour,
    channelAvg,
    timezone: timezone ?? "UTC",
  };
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

// ─────────── Engagement trend ───────────

export type EngagementPoint = {
  publishedAt: string;
  engagement: number;
  views: number;
  isShort: boolean;
  title: string;
  videoId: string;
};

export function engagementTrend(videos: VideoStats[]): EngagementPoint[] {
  return [...videos]
    .sort((a, b) => +new Date(a.publishedAt) - +new Date(b.publishedAt))
    .map((v) => ({
      publishedAt: v.publishedAt,
      engagement: v.engagement,
      views: v.views,
      isShort: v.isShort,
      title: v.title,
      videoId: v.id,
    }));
}

// ─────────── Performance buckets (view distribution) ───────────

export type PerformanceBucket = {
  label: string;
  range: [number, number];
  count: number;
  pct: number;
};

const BUCKETS: Array<{ label: string; range: [number, number] }> = [
  { label: "<500", range: [0, 500] },
  { label: "500-1K", range: [500, 1000] },
  { label: "1K-5K", range: [1000, 5000] },
  { label: "5K-10K", range: [5000, 10000] },
  { label: "10K-50K", range: [10000, 50000] },
  { label: "50K-100K", range: [50000, 100000] },
  { label: "100K+", range: [100000, Infinity] },
];

export function performanceBuckets(videos: VideoStats[]): PerformanceBucket[] {
  const total = videos.length || 1;
  return BUCKETS.map((b) => {
    const count = videos.filter((v) => v.views >= b.range[0] && v.views < b.range[1]).length;
    return { label: b.label, range: b.range, count, pct: (count / total) * 100 };
  });
}

// ─────────── Title patterns ───────────

export type TitleLengthBucket = {
  label: string;
  range: [number, number];
  uploads: number;
  avgViews: number;
};

export function titleLengthAnalysis(videos: VideoStats[]): TitleLengthBucket[] {
  const buckets: Array<{ label: string; range: [number, number] }> = [
    { label: "<30 chars", range: [0, 30] },
    { label: "30-50", range: [30, 50] },
    { label: "50-70", range: [50, 70] },
    { label: "70+", range: [70, Infinity] },
  ];
  return buckets.map((b) => {
    const matches = videos.filter((v) => v.title.length >= b.range[0] && v.title.length < b.range[1]);
    const avg = matches.length > 0 ? matches.reduce((s, v) => s + v.views, 0) / matches.length : 0;
    return { label: b.label, range: b.range, uploads: matches.length, avgViews: avg };
  });
}

export type TitleSignals = {
  withQuestion: { uploads: number; avgViews: number };
  withoutQuestion: { uploads: number; avgViews: number };
  withNumber: { uploads: number; avgViews: number };
  withoutNumber: { uploads: number; avgViews: number };
  recommendation: string;
};

export function titleSignals(videos: VideoStats[]): TitleSignals {
  const splitBy = (pred: (t: string) => boolean) => {
    const yes = videos.filter((v) => pred(v.title));
    const no = videos.filter((v) => !pred(v.title));
    const avg = (xs: VideoStats[]) =>
      xs.length > 0 ? xs.reduce((s, v) => s + v.views, 0) / xs.length : 0;
    return {
      yes: { uploads: yes.length, avgViews: avg(yes) },
      no: { uploads: no.length, avgViews: avg(no) },
    };
  };
  const q = splitBy((t) => /\?/.test(t));
  const n = splitBy((t) => /\d/.test(t));

  let recommendation = "";
  if (q.yes.uploads >= 3 && q.no.uploads >= 3) {
    const ratio = q.yes.avgViews / Math.max(q.no.avgViews, 1);
    if (ratio >= 1.4) recommendation += `Question titles avg ${ratio.toFixed(1)}x the views of statement titles. `;
    else if (ratio <= 0.7) recommendation += `Statement titles outperform question titles by ${(1 / ratio).toFixed(1)}x. `;
  }
  if (n.yes.uploads >= 3 && n.no.uploads >= 3) {
    const ratio = n.yes.avgViews / Math.max(n.no.avgViews, 1);
    if (ratio >= 1.3) recommendation += `Titles with numbers avg ${ratio.toFixed(1)}x the views.`;
    else if (ratio <= 0.75) recommendation += `Titles without numbers do better here.`;
  }
  if (!recommendation) recommendation = "No strong title pattern yet. Keep posting and the signal will emerge.";

  return {
    withQuestion: q.yes,
    withoutQuestion: q.no,
    withNumber: n.yes,
    withoutNumber: n.no,
    recommendation: recommendation.trim(),
  };
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

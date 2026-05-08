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

// ─────────── HITS vs FLOPS ───────────
//
// Ranks the channel's mature videos (>= 14 days old) by views-per-day
// to age-normalize. Top 30% = hits, bottom 30% = flops. Then compares
// the two groups across title shape, format, posting time, and length.
//
// Output is concrete differences plus plain-English bullets the
// creator can act on. This is the "what makes my videos hit?" answer
// YouTube Studio doesn't give.

const MATURITY_DAYS = 14;
const TIER_PERCENTILE = 0.3;

export type VideoCohortStats = {
  count: number;
  avgViewsPerDay: number;
  medianViewsPerDay: number;
  avgTitleChars: number;
  avgTitleWords: number;
  pctWithQuestion: number;
  pctWithNumber: number;
  pctWithEmoji: number;
  pctWithBracket: number;
  pctShort: number;
  pctLong: number;
  avgDurationSec: number; // long-format only
  topFirstWords: Array<{ word: string; count: number }>;
  topPhrases: Array<{ phrase: string; count: number }>;
  topDay: { name: string; count: number } | null;
  medianHourLocal: number | null;
};

export type HitsVsFlops = {
  enoughData: boolean;
  hits: VideoCohortStats;
  flops: VideoCohortStats;
  // Concrete bullet points the user can act on.
  insights: string[];
  // The actual hit + flop video lists for display.
  hitTitles: Array<{ id: string; title: string; viewsPerDay: number; publishedAt: string }>;
  flopTitles: Array<{ id: string; title: string; viewsPerDay: number; publishedAt: string }>;
};

const STOP_WORDS = new Set([
  "the","a","an","and","or","but","of","for","in","on","at","to","is","are",
  "i","me","my","you","your","we","our","this","that","with","by","from","it",
  "vs","ep","part","how","why","what","when","do","did","does","be","was","were",
]);

function ageDays(publishedAt: string | Date): number {
  const t = typeof publishedAt === "string" ? new Date(publishedAt).getTime() : publishedAt.getTime();
  return Math.max(1, (Date.now() - t) / (24 * 60 * 60 * 1000));
}

function emojiRegex(): RegExp {
  // Broad Unicode emoji range. Imperfect but catches the common cases
  // (faces, fire, hundred, etc.) that creators use in titles.
  return /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
}

function bracketRegex(): RegExp {
  return /[\[\](){}]/;
}

function firstWord(title: string): string | null {
  const m = title.trim().match(/[A-Za-z][A-Za-z'-]*/);
  return m ? m[0].toLowerCase() : null;
}

// 2-grams over alphanumeric tokens, stop-words filtered.
function bigrams(title: string): string[] {
  const tokens = title
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((t) => t && !STOP_WORDS.has(t) && t.length > 1);
  const out: string[] = [];
  for (let i = 0; i + 1 < tokens.length; i++) {
    out.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return out;
}

function summarizeCohort(videos: VideoStats[], timezone?: string): VideoCohortStats {
  const titles = videos.map((v) => v.title);
  const vpd = videos.map((v) => v.views / ageDays(v.publishedAt));
  const longs = videos.filter((v) => !v.isShort);

  const firstWordCount: Record<string, number> = {};
  const phraseCount: Record<string, number> = {};
  const dayCount: Record<string, number> = {};
  const hours: number[] = [];

  for (const v of videos) {
    const fw = firstWord(v.title);
    if (fw) firstWordCount[fw] = (firstWordCount[fw] ?? 0) + 1;
    for (const bg of bigrams(v.title)) phraseCount[bg] = (phraseCount[bg] ?? 0) + 1;
    const { day, hour } = tzParts(new Date(v.publishedAt), timezone);
    const name = DAY_NAMES_FULL[day];
    dayCount[name] = (dayCount[name] ?? 0) + 1;
    hours.push(hour);
  }

  const topFirstWords = Object.entries(firstWordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word, count]) => ({ word, count }));

  const topPhrases = Object.entries(phraseCount)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([phrase, count]) => ({ phrase, count }));

  const topDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0];

  return {
    count: videos.length,
    avgViewsPerDay: vpd.reduce((a, b) => a + b, 0) / Math.max(1, vpd.length),
    medianViewsPerDay: median(vpd),
    avgTitleChars: titles.reduce((s, t) => s + t.length, 0) / Math.max(1, titles.length),
    avgTitleWords:
      titles.reduce((s, t) => s + t.trim().split(/\s+/).filter(Boolean).length, 0) /
      Math.max(1, titles.length),
    pctWithQuestion: 100 * (titles.filter((t) => /\?/.test(t)).length / Math.max(1, titles.length)),
    pctWithNumber: 100 * (titles.filter((t) => /\d/.test(t)).length / Math.max(1, titles.length)),
    pctWithEmoji: 100 * (titles.filter((t) => emojiRegex().test(t)).length / Math.max(1, titles.length)),
    pctWithBracket: 100 * (titles.filter((t) => bracketRegex().test(t)).length / Math.max(1, titles.length)),
    pctShort: 100 * (videos.filter((v) => v.isShort).length / Math.max(1, videos.length)),
    pctLong: 100 * (videos.filter((v) => !v.isShort).length / Math.max(1, videos.length)),
    avgDurationSec: longs.reduce((s, v) => s + v.durationSec, 0) / Math.max(1, longs.length),
    topFirstWords,
    topPhrases,
    topDay: topDay ? { name: topDay[0], count: topDay[1] } : null,
    medianHourLocal: hours.length > 0 ? Math.round(median(hours)) : null,
  };
}

// Builds plain-English bullets describing how hits differ from flops.
// Each bullet is gated on a meaningful threshold so we don't print noise.
function buildInsights(hits: VideoCohortStats, flops: VideoCohortStats): string[] {
  const out: string[] = [];

  // Title length
  const lenDelta = hits.avgTitleChars - flops.avgTitleChars;
  if (Math.abs(lenDelta) >= 8) {
    if (lenDelta < 0) {
      out.push(
        `Your hits have shorter titles (avg ${Math.round(hits.avgTitleChars)} chars vs ${Math.round(flops.avgTitleChars)} for flops). Try keeping titles tighter.`,
      );
    } else {
      out.push(
        `Your hits have longer, more descriptive titles (avg ${Math.round(hits.avgTitleChars)} chars vs ${Math.round(flops.avgTitleChars)} for flops). Don't be afraid of detail.`,
      );
    }
  }

  // Question mark
  const qDelta = hits.pctWithQuestion - flops.pctWithQuestion;
  if (Math.abs(qDelta) >= 15) {
    if (qDelta > 0) {
      out.push(`Question titles win: ${Math.round(hits.pctWithQuestion)}% of your hits have a "?" vs ${Math.round(flops.pctWithQuestion)}% of flops.`);
    } else {
      out.push(`Statement titles outperform questions for you (${Math.round(flops.pctWithQuestion)}% of flops are questions vs ${Math.round(hits.pctWithQuestion)}% of hits).`);
    }
  }

  // Numbers
  const nDelta = hits.pctWithNumber - flops.pctWithNumber;
  if (Math.abs(nDelta) >= 15) {
    if (nDelta > 0) {
      out.push(`Numbers in titles correlate with hits: ${Math.round(hits.pctWithNumber)}% vs ${Math.round(flops.pctWithNumber)}%.`);
    } else {
      out.push(`Skip listicle-style numbers — they show up in flops more than hits here.`);
    }
  }

  // Format
  const fmtDelta = hits.pctShort - flops.pctShort;
  if (Math.abs(fmtDelta) >= 25) {
    if (fmtDelta > 0) {
      out.push(`Shorts dominate your hits (${Math.round(hits.pctShort)}% vs ${Math.round(flops.pctShort)}% of flops). Lean into vertical.`);
    } else {
      out.push(`Long-form is your strength (only ${Math.round(hits.pctShort)}% of hits are Shorts vs ${Math.round(flops.pctShort)}% of flops).`);
    }
  }

  // Duration (long-format)
  if (hits.avgDurationSec > 0 && flops.avgDurationSec > 0) {
    const ratio = hits.avgDurationSec / flops.avgDurationSec;
    if (ratio >= 1.3 || ratio <= 0.77) {
      const hMin = Math.round(hits.avgDurationSec / 60);
      const fMin = Math.round(flops.avgDurationSec / 60);
      if (ratio > 1) {
        out.push(`Longer videos win: hits average ${hMin} min vs ${fMin} min for flops.`);
      } else {
        out.push(`Tighter cuts win: hits average ${hMin} min vs ${fMin} min for flops.`);
      }
    }
  }

  // Day of week
  if (hits.topDay && hits.topDay.count >= 2 && flops.topDay && hits.topDay.name !== flops.topDay.name) {
    out.push(`Hits cluster on ${hits.topDay.name}; flops cluster on ${flops.topDay.name}.`);
  }

  // First word
  const hitFw = hits.topFirstWords[0];
  if (hitFw && hitFw.count >= 2) {
    out.push(`Your hits often start with "${hitFw.word}" (${hitFw.count} of ${hits.count}).`);
  }

  // Common phrase in hits
  const hitPh = hits.topPhrases[0];
  if (hitPh && hitPh.count >= 2) {
    out.push(`The phrase "${hitPh.phrase}" recurs in ${hitPh.count} of your hits.`);
  }

  if (out.length === 0) {
    out.push(`No strong differences between your hits and flops yet. Keep posting; once you have ~20 mature videos this card will get sharper.`);
  }

  return out.slice(0, 6);
}

export function hitsVsFlops(videos: VideoStats[], timezone?: string): HitsVsFlops {
  const mature = videos.filter((v) => ageDays(v.publishedAt) >= MATURITY_DAYS);
  const ranked = mature
    .map((v) => ({ v, vpd: v.views / ageDays(v.publishedAt) }))
    .sort((a, b) => b.vpd - a.vpd);
  const n = ranked.length;
  const enoughData = n >= 6;
  const k = Math.max(2, Math.floor(n * TIER_PERCENTILE));
  const hits = ranked.slice(0, k).map((x) => x.v);
  const flops = ranked.slice(Math.max(0, n - k)).map((x) => x.v);

  const hitsStats = summarizeCohort(hits, timezone);
  const flopsStats = summarizeCohort(flops, timezone);

  return {
    enoughData,
    hits: hitsStats,
    flops: flopsStats,
    insights: enoughData
      ? buildInsights(hitsStats, flopsStats)
      : [`Need at least 6 videos with 14+ days of view history. You have ${n}. Keep posting.`],
    hitTitles: ranked.slice(0, k).map(({ v, vpd }) => ({
      id: v.id,
      title: v.title,
      viewsPerDay: vpd,
      publishedAt: v.publishedAt,
    })),
    flopTitles: ranked.slice(Math.max(0, n - k)).map(({ v, vpd }) => ({
      id: v.id,
      title: v.title,
      viewsPerDay: vpd,
      publishedAt: v.publishedAt,
    })),
  };
}

// ─────────── LIVE VIDEO PACING ───────────
//
// For each video that's still ramping (<14 days old), compute its
// current views-per-day and compare to the channel's mature median.
// Flag ahead-of-pace, on-pace, behind, or too-early. This is the
// early-warning signal YouTube Studio buries.

export type LivePacingItem = {
  id: string;
  title: string;
  ageDays: number;
  views: number;
  viewsPerDay: number;
  baselineVpd: number;
  ratio: number;
  status: "ahead" | "on-pace" | "behind" | "too-early";
  isShort: boolean;
};

export function livePacing(videos: VideoStats[]): { items: LivePacingItem[]; baselineLong: number; baselineShort: number } {
  const mature = videos.filter((v) => ageDays(v.publishedAt) >= 14);
  const matureLong = mature.filter((v) => !v.isShort);
  const matureShort = mature.filter((v) => v.isShort);

  const baselineLong =
    matureLong.length > 0 ? median(matureLong.map((v) => v.views / ageDays(v.publishedAt))) : 0;
  const baselineShort =
    matureShort.length > 0 ? median(matureShort.map((v) => v.views / ageDays(v.publishedAt))) : 0;

  const live = videos.filter((v) => ageDays(v.publishedAt) < 14);

  const items: LivePacingItem[] = live.map((v) => {
    const age = ageDays(v.publishedAt);
    const vpd = v.views / age;
    const baseline = v.isShort ? baselineShort : baselineLong;
    const ratio = baseline > 0 ? vpd / baseline : 0;
    let status: LivePacingItem["status"] = "on-pace";
    if (age < 1) status = "too-early";
    else if (baseline === 0) status = "too-early";
    else if (ratio >= 1.5) status = "ahead";
    else if (ratio <= 0.5) status = "behind";
    return {
      id: v.id,
      title: v.title,
      ageDays: age,
      views: v.views,
      viewsPerDay: vpd,
      baselineVpd: baseline,
      ratio,
      status,
      isShort: v.isShort,
    };
  });

  items.sort((a, b) => a.ageDays - b.ageDays);
  return { items, baselineLong, baselineShort };
}

// ─────────── PRODUCTION PLAYBOOK ───────────
//
// Combines hits-vs-flops + best posting times into 3 concrete prescriptions.
// "Make a long video about [topic from hits], post Saturday morning,
//  title shape: 30-50 chars with a number." These are deliberately
// specific so the creator can use them directly.

export type PlaybookCard = {
  format: "long" | "short" | "either";
  topicHint: string;
  postingDay: string;
  postingHourLabel: string;
  titleLength: string;
  titleShape: string;
  rationale: string;
};

export function productionPlaybook(
  videos: VideoStats[],
  timezone?: string,
): PlaybookCard[] {
  const hvf = hitsVsFlops(videos, timezone);
  if (!hvf.enoughData) return [];

  const h = hvf.hits;
  const cards: PlaybookCard[] = [];

  // Card 1 — replicate the dominant winning shape.
  const dominantFormat: "long" | "short" | "either" =
    h.pctShort >= 65 ? "short" : h.pctLong >= 65 ? "long" : "either";
  const dayLabel = h.topDay?.name ?? "the day you usually post";
  const hourLabel = h.medianHourLocal != null ? fmtHourLabel(h.medianHourLocal) : "morning";
  const titleLengthRange = h.avgTitleChars < 35 ? "<35 chars" : h.avgTitleChars < 55 ? "35-55 chars" : "55-75 chars";
  const titleShape: string[] = [];
  if (h.pctWithQuestion >= 50) titleShape.push("with a question mark");
  if (h.pctWithNumber >= 50) titleShape.push("with a number");
  if (h.topPhrases[0]?.count >= 2) titleShape.push(`echoing "${h.topPhrases[0].phrase}"`);
  cards.push({
    format: dominantFormat,
    topicHint: h.topFirstWords[0]
      ? `Lead with "${h.topFirstWords[0].word}" — your hits open with it ${h.topFirstWords[0].count}× more than flops.`
      : "Stay in the lane your top videos already proved.",
    postingDay: dayLabel,
    postingHourLabel: hourLabel,
    titleLength: titleLengthRange,
    titleShape: titleShape.length ? titleShape.join(", ") : "match the shape of your top 3 titles",
    rationale: "Direct copy of what's already winning. Lowest-risk swing.",
  });

  // Card 2 — "controlled experiment" against the dominant pattern.
  const oppositeFormat: "long" | "short" | "either" =
    dominantFormat === "long" ? "short" : dominantFormat === "short" ? "long" : "long";
  cards.push({
    format: oppositeFormat,
    topicHint: h.topPhrases[1]
      ? `Try "${h.topPhrases[1].phrase}" angle — secondary winning phrase in your hits.`
      : `Take your strongest hit topic and reframe for ${oppositeFormat} format.`,
    postingDay: dayLabel,
    postingHourLabel: hourLabel,
    titleLength: titleLengthRange,
    titleShape: titleShape.length ? titleShape.join(", ") : "match the shape of your top 3 titles",
    rationale: `Test ${oppositeFormat} format on a winning topic. If it lands, you've doubled your output.`,
  });

  // Card 3 — counter-program.
  // Pick a non-winning day to break out of the same-day rut, but keep title shape.
  const allDays = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const offDay = allDays.find((d) => d !== h.topDay?.name) ?? "Saturday";
  cards.push({
    format: dominantFormat,
    topicHint: `An adjacent topic, not the same as your top hit — go one step sideways.`,
    postingDay: offDay,
    postingHourLabel: hourLabel,
    titleLength: titleLengthRange,
    titleShape: titleShape.length ? titleShape.join(", ") : "match the shape of your top 3 titles",
    rationale: "Posting cadence experiment. If this also works, you've found a second slot to fill weekly.",
  });

  return cards;
}

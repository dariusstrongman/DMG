// Projects what a video's view count will be at the 7-, 15-, and 30-day
// marks based on its current views + age.
//
// Model: V(t) = V_∞ · (1 − e^(−t/τ))
// Most YouTube videos hit roughly steady-state by day 30 — long-form
// decays slower than Shorts. We treat day 30 as the projection ceiling
// and renormalize the curve so f(30) = 1, then project:
//
//   projected(K) = current * f(K) / f(ageDays)
//
// τ values are rough community-known defaults. For a more accurate
// per-channel fit we'd backfit τ from real video curves, but this is
// good enough for an MVP.

// Hardcoded fallbacks. Real τ values come from `video-curve-fit.ts`,
// which backfits per-channel from snapshot history.
const TAU_LONG_DAYS = 14;
const TAU_SHORT_DAYS = 5;

// Don't project for the first hour — the curve fraction is too tiny and
// rounding noise dominates.
const MIN_AGE_DAYS = 1 / 24;

// Past this age, the day-30 projection is essentially what the video
// already has. We surface "—" for projections instead of giving false
// precision.
const MAX_PROJECT_AGE_DAYS = 30;

export type VideoProjection = {
  ageDays: number;
  current: number;
  // null when we can't project (too young, too old, or zero views).
  proj7: number | null;
  proj15: number | null;
  proj30: number | null;
  isShort: boolean;
  // Confidence drops as the age window the projection comes from gets
  // shorter. UI can use this to soften the visual treatment.
  confidence: "low" | "medium" | "high" | "n/a";
};

function fraction(tDays: number, tau: number): number {
  if (tDays <= 0) return 0;
  return 1 - Math.exp(-tDays / tau);
}

// Renormalized so day-30 = 1.
function fractionOfDay30(tDays: number, tau: number): number {
  const denom = fraction(30, tau);
  if (denom <= 0) return 0;
  return fraction(tDays, tau) / denom;
}

export function projectVideo(input: {
  views: number;
  publishedAt: Date | string;
  isShort: boolean;
  now?: Date;
  // Optional channel-fitted τ values (from video-curve-fit). When
  // omitted, falls back to the hardcoded defaults.
  tauLong?: number;
  tauShort?: number;
}): VideoProjection {
  const now = input.now ?? new Date();
  const published = typeof input.publishedAt === "string"
    ? new Date(input.publishedAt)
    : input.publishedAt;
  const ageDays = (now.getTime() - published.getTime()) / (24 * 60 * 60 * 1000);
  const tau = input.isShort
    ? (input.tauShort ?? TAU_SHORT_DAYS)
    : (input.tauLong ?? TAU_LONG_DAYS);

  const base: VideoProjection = {
    ageDays,
    current: input.views,
    proj7: null,
    proj15: null,
    proj30: null,
    isShort: input.isShort,
    confidence: "n/a",
  };

  if (ageDays < MIN_AGE_DAYS || input.views <= 0) return base;
  if (ageDays >= MAX_PROJECT_AGE_DAYS) return base;

  const fNow = fractionOfDay30(ageDays, tau);
  if (fNow <= 0) return base;

  // Project each milestone. If the milestone is in the past for this
  // video, the projection IS just the current count (or higher if the
  // curve says it should have continued growing past that mark).
  const project = (k: number): number => {
    const fK = fractionOfDay30(k, tau);
    const projected = (input.views * fK) / fNow;
    // Floor: never project a milestone below current views if K >= ageDays
    if (k >= ageDays) return Math.max(projected, input.views);
    return projected;
  };

  const proj7 = project(7);
  const proj15 = project(15);
  const proj30 = project(30);

  // Confidence: more age = more signal. Below 1d is "low", >= 7d is "high".
  let confidence: VideoProjection["confidence"];
  if (ageDays < 1) confidence = "low";
  else if (ageDays < 5) confidence = "medium";
  else confidence = "high";

  return {
    ...base,
    proj7: Math.round(proj7),
    proj15: Math.round(proj15),
    proj30: Math.round(proj30),
    confidence,
  };
}

// Convenience: project an entire list at once (for the videos table).
export function projectVideos<T extends { views: number; publishedAt: string; isShort: boolean }>(
  videos: T[],
  opts: { now?: Date; tauLong?: number; tauShort?: number } = {}
): Array<T & { projection: VideoProjection }> {
  return videos.map((v) => ({
    ...v,
    projection: projectVideo({
      views: v.views,
      publishedAt: v.publishedAt,
      isShort: v.isShort,
      now: opts.now,
      tauLong: opts.tauLong,
      tauShort: opts.tauShort,
    }),
  }));
}

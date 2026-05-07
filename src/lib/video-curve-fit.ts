// Backfits the view-decay constant τ from this channel's own historical
// data. The view-projection model is:
//
//   V(t) = V_∞ · (1 − e^(−t/τ))
//
// τ is the only free parameter. Each channel decays differently — this
// fits τ separately for long-form and Shorts using snapshots from videos
// that are already >= 30 days old.
//
// Falls back to sensible defaults when there's not enough history yet.

import { db } from "./db";
import { unstable_cache } from "next/cache";

export const DEFAULT_TAU_LONG = 14;
export const DEFAULT_TAU_SHORT = 5;

const MIN_VIDEOS_TO_FIT = 3;
const MIN_SNAPSHOTS_PER_VIDEO = 4;
const MATURITY_AGE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

type Curve = {
  isShort: boolean;
  publishedAt: Date;
  // ascending by capturedAt
  snapshots: Array<{ ageDays: number; views: number }>;
};

async function getMaturedCurves(): Promise<Curve[]> {
  const cutoff = new Date(Date.now() - MATURITY_AGE_DAYS * DAY_MS);
  const videos = await db.video.findMany({
    where: { publishedAt: { lt: cutoff } },
    select: {
      publishedAt: true,
      format: true,
      snapshots: {
        select: { capturedAt: true, views: true },
        orderBy: { capturedAt: "asc" },
      },
    },
  });
  return videos
    .filter((v) => v.snapshots.length >= MIN_SNAPSHOTS_PER_VIDEO)
    .map((v) => ({
      isShort: v.format === "short",
      publishedAt: v.publishedAt,
      snapshots: v.snapshots.map((s) => ({
        ageDays: (s.capturedAt.getTime() - v.publishedAt.getTime()) / DAY_MS,
        views: Number(s.views),
      })),
    }));
}

// Linear interpolation between snapshots to estimate views at a target age.
function viewsAt(snapshots: Curve["snapshots"], targetDay: number): number | null {
  if (snapshots.length === 0) return null;
  for (let i = 0; i < snapshots.length - 1; i++) {
    const a = snapshots[i];
    const b = snapshots[i + 1];
    if (a.ageDays <= targetDay && b.ageDays >= targetDay) {
      const span = b.ageDays - a.ageDays;
      if (span <= 0) return a.views;
      const t = (targetDay - a.ageDays) / span;
      return a.views + (b.views - a.views) * t;
    }
  }
  // If targetDay is past last snapshot but within tolerance, use the last.
  const last = snapshots[snapshots.length - 1];
  if (last && targetDay - last.ageDays <= 2) return last.views;
  return null;
}

// Grid search for τ minimizing sum-squared-error of f_obs vs f_model.
// Returns null if not enough data points.
function fitTau(curves: Curve[]): number | null {
  if (curves.length < MIN_VIDEOS_TO_FIT) return null;

  const points: Array<{ t: number; frac: number }> = [];
  for (const c of curves) {
    const v30 = viewsAt(c.snapshots, 30);
    if (!v30 || v30 <= 0) continue;
    for (const s of c.snapshots) {
      if (s.ageDays > 0 && s.ageDays <= 30) {
        points.push({ t: s.ageDays, frac: s.views / v30 });
      }
    }
  }
  if (points.length < 8) return null;

  let bestTau = 14;
  let bestSse = Infinity;
  // Search τ ∈ [1, 60] in 0.5-day steps. ~120 evaluations, trivial.
  for (let tau = 1; tau <= 60; tau += 0.5) {
    const denom = 1 - Math.exp(-30 / tau);
    if (denom <= 0) continue;
    let sse = 0;
    for (const p of points) {
      const expected = (1 - Math.exp(-p.t / tau)) / denom;
      const err = expected - p.frac;
      sse += err * err;
    }
    if (sse < bestSse) {
      bestSse = sse;
      bestTau = tau;
    }
  }
  return bestTau;
}

export type FittedTaus = {
  tauLong: number;
  tauShort: number;
  source: { long: "fitted" | "default"; short: "fitted" | "default" };
  // For UI: how many videos contributed to each fit.
  longSamples: number;
  shortSamples: number;
};

// Cached for 24h via Next.js. Re-fits automatically when the cache
// expires, so as more videos mature the curve constants shift to match
// the channel's actual decay shape.
export const getFittedTaus = unstable_cache(
  async (): Promise<FittedTaus> => {
    try {
      const curves = await getMaturedCurves();
      const longCurves = curves.filter((c) => !c.isShort);
      const shortCurves = curves.filter((c) => c.isShort);

      const fittedLong = fitTau(longCurves);
      const fittedShort = fitTau(shortCurves);

      return {
        tauLong: fittedLong ?? DEFAULT_TAU_LONG,
        tauShort: fittedShort ?? DEFAULT_TAU_SHORT,
        source: {
          long: fittedLong !== null ? "fitted" : "default",
          short: fittedShort !== null ? "fitted" : "default",
        },
        longSamples: longCurves.length,
        shortSamples: shortCurves.length,
      };
    } catch {
      return {
        tauLong: DEFAULT_TAU_LONG,
        tauShort: DEFAULT_TAU_SHORT,
        source: { long: "default", short: "default" },
        longSamples: 0,
        shortSamples: 0,
      };
    }
  },
  ["dmg-fitted-taus"],
  { revalidate: 60 * 60 * 24 } // 24h
);

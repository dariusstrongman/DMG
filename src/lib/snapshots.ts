// Persistence for channel time-series. The dashboard fetches live YT
// data on render, but we also write a snapshot to Postgres so we can
// project trends. Throttled to ~hourly so we don't bloat the table on
// every page view.
//
// Cold-start safe: every helper here returns gracefully if the DB
// isn't reachable, so the dashboard still renders from live YT data.

import { cache } from "react";
import { db } from "./db";
import type { ChannelStats, VideoStats } from "./youtube";
import type { SubSnapshot } from "./projections";
import { recordVideoSnapshots } from "./video-snapshots";

const MIN_SNAPSHOT_INTERVAL_MS = 55 * 60 * 1000; // ~hourly

// Upsert the channel row (no-op if it exists, refresh basic fields)
// and append a snapshot if the last one is older than ~1h.
export async function recordChannelSnapshot(
  channel: ChannelStats,
  videos: VideoStats[]
): Promise<void> {
  try {
    const row = await db.channel.upsert({
      where: { ytChannelId: channel.id },
      create: {
        ytChannelId: channel.id,
        title: channel.title,
        handle: channel.handle,
        description: channel.description,
        thumbnailUrl: channel.thumbnailUrl,
        country: channel.country,
        publishedAt: channel.publishedAt ? new Date(channel.publishedAt) : null,
        lastSyncedAt: new Date(),
      },
      update: {
        title: channel.title,
        handle: channel.handle,
        thumbnailUrl: channel.thumbnailUrl,
        lastSyncedAt: new Date(),
      },
    });

    const last = await db.channelSnapshot.findFirst({
      where: { channelId: row.id },
      orderBy: { capturedAt: "desc" },
      select: { capturedAt: true },
    });

    if (
      last &&
      Date.now() - last.capturedAt.getTime() < MIN_SNAPSHOT_INTERVAL_MS
    ) {
      return;
    }

    await db.channelSnapshot.create({
      data: {
        channelId: row.id,
        subscribers: BigInt(channel.subscribers),
        totalViews: BigInt(channel.totalViews),
        totalVideos: channel.totalVideos,
      },
    });

    await recordVideoSnapshots(row.id, videos);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[snapshots] persistence skipped:", err);
    }
  }
}

// Returns subscriber history ascending. Empty array on any failure
// so the projection layer can show a cold-start state instead of
// throwing.
export const getSubscriberHistory = cache(async function getSubscriberHistoryImpl(
  ytChannelId: string,
  days = 90,
): Promise<SubSnapshot[]> {
  try {
    const channel = await db.channel.findUnique({
      where: { ytChannelId },
      select: { id: true },
    });
    if (!channel) return [];
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await db.channelSnapshot.findMany({
      where: { channelId: channel.id, capturedAt: { gte: cutoff } },
      orderBy: { capturedAt: "asc" },
      select: { subscribers: true, capturedAt: true },
    });
    return rows.map((r) => ({
      subscribers: Number(r.subscribers),
      capturedAt: r.capturedAt,
    }));
  } catch {
    return [];
  }
});

export type DeltaWindow = {
  windowHours: number;
  subsDelta: number | null;
  viewsDelta: number | null;
};

// For the velocity strip. Returns delta vs the snapshot closest to N
// hours ago (within a 50% tolerance). null when no comparable point.
//
// Pulls the full 30d snapshot history in one query (channelSnapshots
// for a channel are ~720 rows max at hourly cadence) and resolves all
// three windows in memory. Previously this issued 3 separate findFirst
// queries plus a channel lookup — 4 round-trips for a velocity strip
// that renders on every dashboard load.
export const getChannelDeltas = cache(async function getChannelDeltasImpl(
  ytChannelId: string,
): Promise<DeltaWindow[]> {
  const windows = [24, 7 * 24, 30 * 24];
  const empty = windows.map((h) => ({ windowHours: h, subsDelta: null, viewsDelta: null }));
  try {
    const channel = await db.channel.findUnique({
      where: { ytChannelId },
      select: { id: true },
    });
    if (!channel) return empty;

    const lookback = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000);
    const rows = await db.channelSnapshot.findMany({
      where: { channelId: channel.id, capturedAt: { gte: lookback } },
      orderBy: { capturedAt: "asc" },
      select: { subscribers: true, totalViews: true, capturedAt: true },
    });
    if (rows.length === 0) return empty;

    const latest = rows[rows.length - 1];

    return windows.map((hours) => {
      const target = latest.capturedAt.getTime() - hours * 60 * 60 * 1000;
      const tolerance = hours * 60 * 60 * 1000 * 0.5;
      const lo = target - tolerance;
      const hi = target + tolerance;
      // Earliest row inside the window (rows are already asc-sorted).
      const match = rows.find(
        (r) => r.capturedAt.getTime() >= lo && r.capturedAt.getTime() <= hi,
      );
      if (!match) return { windowHours: hours, subsDelta: null, viewsDelta: null };
      return {
        windowHours: hours,
        subsDelta: Number(latest.subscribers) - Number(match.subscribers),
        viewsDelta: Number(latest.totalViews) - Number(match.totalViews),
      };
    });
  } catch {
    return empty;
  }
});

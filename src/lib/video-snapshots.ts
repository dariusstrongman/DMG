// Per-video snapshot persistence. Same throttled write-through pattern
// as channel snapshots. Enables 24h spike badges and per-video charts.

import { db } from "./db";
import type { VideoStats } from "./youtube";

const MIN_SNAPSHOT_INTERVAL_MS = 55 * 60 * 1000; // ~hourly
const MAX_VIDEOS_TO_TRACK = 30; // newest 30 only — keeps writes bounded

function ytFormat(v: VideoStats): "short" | "long" {
  return v.isShort ? "short" : "long";
}

// Upsert Video rows, then add a VideoSnapshot for each video whose last
// snapshot is older than ~1h. Failures are swallowed.
export async function recordVideoSnapshots(
  channelDbId: string,
  videos: VideoStats[]
): Promise<void> {
  try {
    const targets = videos.slice(0, MAX_VIDEOS_TO_TRACK);

    for (const v of targets) {
      const row = await db.video.upsert({
        where: { ytVideoId: v.id },
        create: {
          channelId: channelDbId,
          ytVideoId: v.id,
          title: v.title,
          description: v.description,
          thumbnailUrl: v.thumbnailUrl,
          publishedAt: new Date(v.publishedAt),
          durationSec: v.durationSec,
          format: ytFormat(v),
          views: BigInt(v.views),
          likes: BigInt(v.likes),
          comments: BigInt(v.comments),
        },
        update: {
          title: v.title,
          format: ytFormat(v),
          views: BigInt(v.views),
          likes: BigInt(v.likes),
          comments: BigInt(v.comments),
        },
      });

      const last = await db.videoSnapshot.findFirst({
        where: { videoId: row.id },
        orderBy: { capturedAt: "desc" },
        select: { capturedAt: true },
      });
      if (
        last &&
        Date.now() - last.capturedAt.getTime() < MIN_SNAPSHOT_INTERVAL_MS
      ) {
        continue;
      }

      await db.videoSnapshot.create({
        data: {
          videoId: row.id,
          views: BigInt(v.views),
          likes: BigInt(v.likes),
          comments: BigInt(v.comments),
        },
      });
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[video-snapshots] persistence skipped:", err);
    }
  }
}

export type VideoHistoryPoint = {
  capturedAt: Date;
  views: number;
  likes: number;
  comments: number;
};

export async function getVideoHistory(
  ytVideoId: string,
  days = 30
): Promise<VideoHistoryPoint[]> {
  try {
    const v = await db.video.findUnique({
      where: { ytVideoId },
      select: { id: true },
    });
    if (!v) return [];
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await db.videoSnapshot.findMany({
      where: { videoId: v.id, capturedAt: { gte: cutoff } },
      orderBy: { capturedAt: "asc" },
      select: { capturedAt: true, views: true, likes: true, comments: true },
    });
    return rows.map((r) => ({
      capturedAt: r.capturedAt,
      views: Number(r.views),
      likes: Number(r.likes),
      comments: Number(r.comments),
    }));
  } catch {
    return [];
  }
}

// Returns a map ytVideoId → 24h delta. Null when there's no point ~24h
// ago to compare against. Used for spike badges in the videos list.
//
// One findMany pulls all snapshots in the 18-30h window across every
// video at once, then we pick the closest-to-24h-ago point per video
// in memory. Avoids the N+1 query the original implementation did.
export async function getVideoSpikes24h(
  ytVideoIds: string[]
): Promise<Record<string, number | null>> {
  const out: Record<string, number | null> = {};
  for (const id of ytVideoIds) out[id] = null;
  if (ytVideoIds.length === 0) return out;
  try {
    const videos = await db.video.findMany({
      where: { ytVideoId: { in: ytVideoIds } },
      select: { id: true, ytVideoId: true, views: true },
    });
    if (videos.length === 0) return out;

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const tolerance = 6 * 60 * 60 * 1000;
    const lo = new Date(dayAgo.getTime() - tolerance);
    const hi = new Date(dayAgo.getTime() + tolerance);

    const internalIds = videos.map((v) => v.id);
    const snaps = await db.videoSnapshot.findMany({
      where: {
        videoId: { in: internalIds },
        capturedAt: { gte: lo, lte: hi },
      },
      select: { videoId: true, views: true, capturedAt: true },
      orderBy: { capturedAt: "asc" },
    });

    // Earliest snapshot in window per video.
    const earliest = new Map<string, { views: bigint; capturedAt: Date }>();
    for (const s of snaps) {
      if (!earliest.has(s.videoId)) {
        earliest.set(s.videoId, { views: s.views as unknown as bigint, capturedAt: s.capturedAt });
      }
    }

    for (const v of videos) {
      const e = earliest.get(v.id);
      out[v.ytVideoId] = e ? Number(v.views) - Number(e.views) : null;
    }
    return out;
  } catch {
    return out;
  }
}

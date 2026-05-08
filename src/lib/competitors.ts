// Competitor tracking. Same write-through snapshot pattern as the main
// channel: a row per ~hour into dmg_competitor_snapshots so we can
// chart their growth alongside ours.
//
// Per-tenant: every Competitor row carries channelId. Adding "Linus
// Tech Tips" as a competitor on DMG does not surface it on RushToons.

import { db } from "./db";
import { getChannelByHandle } from "./youtube";
import { getActiveChannelDbId } from "./active-channel";

const MIN_SNAPSHOT_INTERVAL_MS = 55 * 60 * 1000;

export type CompetitorWithLatest = {
  id: string;
  ytChannelId: string;
  title: string;
  handle: string | null;
  thumbnailUrl: string | null;
  notes: string | null;
  createdAt: Date;
  latest: {
    capturedAt: Date;
    subscribers: number;
    totalViews: number;
    totalVideos: number;
  } | null;
  delta7d: { subscribers: number | null; totalViews: number | null };
};

// Add a competitor by @handle. Pulls live YT data, upserts under the
// active tenant's channelId, and records the first snapshot.
export async function addCompetitor(rawHandle: string) {
  const channelId = await getActiveChannelDbId();
  if (!channelId) throw new Error("Active channel not resolved.");
  const handle = rawHandle.startsWith("@") ? rawHandle : `@${rawHandle.replace(/^https?:\/\/[^/]+\/(@?)/i, "@")}`;
  const channel = await getChannelByHandle(handle);
  const row = await db.competitor.upsert({
    where: { channelId_ytChannelId: { channelId, ytChannelId: channel.id } },
    create: {
      channelId,
      ytChannelId: channel.id,
      title: channel.title,
      handle: channel.handle,
      thumbnailUrl: channel.thumbnailUrl,
    },
    update: {
      title: channel.title,
      handle: channel.handle,
      thumbnailUrl: channel.thumbnailUrl,
    },
  });
  await db.competitorSnapshot.create({
    data: {
      competitorId: row.id,
      subscribers: BigInt(channel.subscribers),
      totalViews: BigInt(channel.totalViews),
      totalVideos: channel.totalVideos,
    },
  });
  return row;
}

export async function removeCompetitor(id: string) {
  // Belt-and-suspenders: only delete if the row belongs to the active
  // channel. Prevents cross-tenant deletion via guessed ids.
  const channelId = await getActiveChannelDbId();
  if (!channelId) return;
  await db.competitor.deleteMany({ where: { id, channelId } });
}

export async function listCompetitorsWithLatest(): Promise<CompetitorWithLatest[]> {
  try {
    const channelId = await getActiveChannelDbId();
    if (!channelId) return [];
    const rows = await db.competitor.findMany({
      where: { channelId },
      orderBy: { createdAt: "asc" },
    });
    const out: CompetitorWithLatest[] = [];
    for (const r of rows) {
      const latest = await db.competitorSnapshot.findFirst({
        where: { competitorId: r.id },
        orderBy: { capturedAt: "desc" },
      });
      let delta7dSubs: number | null = null;
      let delta7dViews: number | null = null;
      if (latest) {
        const wkAgo = new Date(latest.capturedAt.getTime() - 7 * 24 * 60 * 60 * 1000);
        const tolerance = 24 * 60 * 60 * 1000;
        const past = await db.competitorSnapshot.findFirst({
          where: {
            competitorId: r.id,
            capturedAt: {
              gte: new Date(wkAgo.getTime() - tolerance),
              lte: new Date(wkAgo.getTime() + tolerance),
            },
          },
          orderBy: { capturedAt: "asc" },
        });
        if (past) {
          delta7dSubs = Number(latest.subscribers) - Number(past.subscribers);
          delta7dViews = Number(latest.totalViews) - Number(past.totalViews);
        }
      }
      out.push({
        id: r.id,
        ytChannelId: r.ytChannelId,
        title: r.title,
        handle: r.handle,
        thumbnailUrl: r.thumbnailUrl,
        notes: r.notes,
        createdAt: r.createdAt,
        latest: latest
          ? {
              capturedAt: latest.capturedAt,
              subscribers: Number(latest.subscribers),
              totalViews: Number(latest.totalViews),
              totalVideos: latest.totalVideos,
            }
          : null,
        delta7d: { subscribers: delta7dSubs, totalViews: delta7dViews },
      });
    }
    return out;
  } catch {
    return [];
  }
}

// Refresh active-tenant competitors' snapshots (throttled).
export async function refreshCompetitorSnapshots() {
  try {
    const channelId = await getActiveChannelDbId();
    if (!channelId) return;
    const competitors = await db.competitor.findMany({ where: { channelId } });
    for (const c of competitors) {
      const last = await db.competitorSnapshot.findFirst({
        where: { competitorId: c.id },
        orderBy: { capturedAt: "desc" },
        select: { capturedAt: true },
      });
      if (last && Date.now() - last.capturedAt.getTime() < MIN_SNAPSHOT_INTERVAL_MS) continue;
      try {
        const live = await getChannelByHandle(c.handle ?? `@${c.title}`);
        await db.competitorSnapshot.create({
          data: {
            competitorId: c.id,
            subscribers: BigInt(live.subscribers),
            totalViews: BigInt(live.totalViews),
            totalVideos: live.totalVideos,
          },
        });
      } catch {
        // skip, we'll try next page load
      }
    }
  } catch {
    // ignore
  }
}

export async function getCompetitorHistory(competitorId: string, days = 90) {
  try {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await db.competitorSnapshot.findMany({
      where: { competitorId, capturedAt: { gte: cutoff } },
      orderBy: { capturedAt: "asc" },
      select: { capturedAt: true, subscribers: true, totalViews: true },
    });
    return rows.map((r) => ({
      capturedAt: r.capturedAt,
      subscribers: Number(r.subscribers),
      totalViews: Number(r.totalViews),
    }));
  } catch {
    return [];
  }
}

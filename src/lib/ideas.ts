// Video idea generation + persistence. Reads recent uploads to learn
// the channel's style, asks GPT-4o-mini for fresh ideas, stores them
// in dmg_video_ideas. Server-only.

import { db } from "./db";
import { chatJson } from "./openai";
import type { ChannelStats, VideoStats } from "./youtube";
import { fetchDmgSnapshot } from "./youtube";
import { DMG_BRAND, DMG_HANDLE } from "./config";

const MODEL = "gpt-4o-mini";
const DEFAULT_COUNT = 5;

type GeneratedIdea = {
  title: string;
  hook: string;
  outline: string;
  rationale: string;
  format: "long" | "short" | "either";
  tags: string[];
};

type GenerateResponse = { ideas: GeneratedIdea[] };

function buildPrompt(channel: ChannelStats, videos: VideoStats[], count: number) {
  // Pick the most recent 30 uploads, plus the top 5 by views as anchors.
  const recent = videos.slice(0, 30);
  const top = [...videos]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const fmt = (v: VideoStats) => {
    const ageDays = Math.max(0, Math.round((Date.now() - +new Date(v.publishedAt)) / (24 * 60 * 60 * 1000)));
    return `- "${v.title.replace(/"/g, '\\"')}" · ${v.isShort ? "Short" : "Long"} · ${v.views.toLocaleString()} views · ${ageDays}d ago · ${v.engagement.toFixed(1)}% eng`;
  };

  const system = [
    `You are a YouTube content strategist for ${DMG_BRAND} (${DMG_HANDLE}).`,
    "Your job: study what the channel already publishes, then propose fresh video ideas that match its tone, format, and audience.",
    "",
    "Rules for ideas:",
    "- Stay in the channel's lane. Do not pivot the format or topic to chase trends that don't fit.",
    "- Each idea must be filmable with what a small creator already has. No big productions.",
    "- The hook is the first 5-10 seconds spoken aloud. Write it that way.",
    "- The outline is 3 to 5 short beats, one line each.",
    "- The rationale should reference specific patterns you noticed in the channel's catalog.",
    "- Avoid clickbait that the channel hasn't earned.",
    "- Pick format (long, short, or either) based on what tends to perform on this channel.",
    "",
    "Return ONLY valid JSON of shape: {\"ideas\":[{\"title\":\"\",\"hook\":\"\",\"outline\":\"\",\"rationale\":\"\",\"format\":\"long|short|either\",\"tags\":[\"\"]}]}",
  ].join("\n");

  const user = [
    `Channel: ${channel.title} (${channel.handle})`,
    channel.description ? `Description: ${channel.description.slice(0, 600)}` : "",
    `Subscribers: ${channel.subscribers.toLocaleString()} · Total videos: ${channel.totalVideos.toLocaleString()} · Total views: ${channel.totalViews.toLocaleString()}`,
    "",
    `RECENT UPLOADS (${recent.length}):`,
    ...recent.map(fmt),
    "",
    "TOP PERFORMERS (all-time among the last 50):",
    ...top.map(fmt),
    "",
    `Generate ${count} new video ideas. Rank them best-first.`,
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}

// Generates and persists `count` new ideas, then returns the inserted rows.
// Throws if OpenAI key is missing or API call fails. Caller should catch
// and surface a friendly error.
export async function generateIdeas(count: number = DEFAULT_COUNT) {
  const snap = await fetchDmgSnapshot(50);
  if ("error" in snap) {
    throw new Error(`Cannot generate ideas: ${snap.error}`);
  }
  const { channel, videos } = snap;

  // Make sure the channel row exists so we can FK ideas to it.
  const channelRow = await db.channel.upsert({
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
    update: { title: channel.title, lastSyncedAt: new Date() },
  });

  const { system, user } = buildPrompt(channel, videos, count);
  const { data, modelUsed } = await chatJson<GenerateResponse>({
    model: MODEL,
    system,
    user,
    temperature: 0.85,
  });

  const ideas = Array.isArray(data?.ideas) ? data.ideas : [];
  if (ideas.length === 0) {
    throw new Error("Model returned 0 ideas. Try again.");
  }

  const created = await db.$transaction(
    ideas.slice(0, count).map((idea) =>
      db.videoIdea.create({
        data: {
          channelId: channelRow.id,
          title: idea.title?.slice(0, 200) ?? "Untitled idea",
          hook: idea.hook ?? "",
          outline: idea.outline ?? "",
          rationale: idea.rationale ?? "",
          format:
            idea.format === "long" || idea.format === "short" || idea.format === "either"
              ? idea.format
              : "either",
          tags: Array.isArray(idea.tags) ? idea.tags.slice(0, 8).map((t) => String(t).slice(0, 40)) : [],
          source: "ai",
          modelUsed,
        },
      })
    )
  );

  return created;
}

export type IdeaListFilters = {
  status?: "pending" | "accepted" | "rejected" | "produced" | "all";
};

export async function listIdeas(filters: IdeaListFilters = {}) {
  try {
    const where: Record<string, unknown> = {};
    if (filters.status && filters.status !== "all") {
      where.status = filters.status;
    }
    return await db.videoIdea.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
    });
  } catch {
    return [];
  }
}

export async function countIdeasByStatus() {
  try {
    const groups = await db.videoIdea.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    const out: Record<string, number> = { pending: 0, accepted: 0, rejected: 0, produced: 0 };
    for (const g of groups) out[g.status] = g._count._all;
    return out;
  } catch {
    return { pending: 0, accepted: 0, rejected: 0, produced: 0 };
  }
}

export async function setIdeaStatus(
  id: string,
  status: "pending" | "accepted" | "rejected" | "produced"
) {
  await db.videoIdea.update({ where: { id }, data: { status } });
}

export async function deleteIdea(id: string) {
  await db.videoIdea.delete({ where: { id } });
}

export async function createManualIdea(opts: {
  title: string;
  hook?: string;
  outline?: string;
  format?: "long" | "short" | "either";
  tags?: string[];
}) {
  const snap = await fetchDmgSnapshot(1);
  if ("error" in snap) throw new Error(snap.error);
  const channelRow = await db.channel.upsert({
    where: { ytChannelId: snap.channel.id },
    create: {
      ytChannelId: snap.channel.id,
      title: snap.channel.title,
      handle: snap.channel.handle,
    },
    update: {},
  });
  return db.videoIdea.create({
    data: {
      channelId: channelRow.id,
      title: opts.title.slice(0, 200),
      hook: opts.hook ?? "",
      outline: opts.outline ?? "",
      rationale: "Manual entry",
      format: opts.format ?? "either",
      tags: (opts.tags ?? []).slice(0, 8),
      source: "manual",
    },
  });
}

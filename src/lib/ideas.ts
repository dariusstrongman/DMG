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
  outline: string | string[];
  rationale: string;
  format: "long" | "short" | "either";
  tags: string[];
  viral_score: number; // 1-10
};

// Models often return outline as an array of bullets even when asked
// for a string. Normalize to a single newline-joined string.
function normalizeOutline(o: unknown): string {
  if (Array.isArray(o)) {
    return o.map((line) => `- ${String(line).trim()}`).join("\n");
  }
  if (typeof o === "string") return o;
  return "";
}

type GenerateResponse = { ideas: GeneratedIdea[] };

// Pull the user's idea-judgment history so the model can learn from it.
// Rejected = anti-patterns. Accepted/produced = patterns to favor.
// Bounded so the prompt stays cheap; the most-recent decisions are the
// most informative since taste evolves.
const FEEDBACK_LOOKBACK = 25;

type FeedbackIdea = {
  title: string;
  hook: string;
  format: "long" | "short" | "either";
  tags: string[];
  aiScore: number | null;
};

async function getIdeaFeedback(): Promise<{
  rejected: FeedbackIdea[];
  accepted: FeedbackIdea[];
}> {
  try {
    const [rejected, accepted] = await Promise.all([
      db.videoIdea.findMany({
        where: { status: "rejected" },
        orderBy: { updatedAt: "desc" },
        take: FEEDBACK_LOOKBACK,
        select: { title: true, hook: true, format: true, tags: true, aiScore: true },
      }),
      db.videoIdea.findMany({
        where: { status: { in: ["accepted", "produced"] } },
        orderBy: { updatedAt: "desc" },
        take: FEEDBACK_LOOKBACK,
        select: { title: true, hook: true, format: true, tags: true, aiScore: true },
      }),
    ]);
    return { rejected, accepted };
  } catch {
    return { rejected: [], accepted: [] };
  }
}

function buildPrompt(
  channel: ChannelStats,
  videos: VideoStats[],
  count: number,
  feedback: { rejected: FeedbackIdea[]; accepted: FeedbackIdea[] }
) {
  // Pick the most recent 30 uploads, plus the top 5 by views as anchors.
  const recent = videos.slice(0, 30);
  const top = [...videos]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const fmt = (v: VideoStats) => {
    const ageDays = Math.max(0, Math.round((Date.now() - +new Date(v.publishedAt)) / (24 * 60 * 60 * 1000)));
    return `- "${v.title.replace(/"/g, '\\"')}" · ${v.isShort ? "Short" : "Long"} · ${v.views.toLocaleString()} views · ${ageDays}d ago · ${v.engagement.toFixed(1)}% eng`;
  };

  const todayLong = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const todayIso = new Date().toISOString().slice(0, 10);

  const system = [
    `Today is ${todayLong} (${todayIso}). Treat this as the present. Your training data may be older — do NOT use stale year references like "2023" or "2024" in titles unless the topic is genuinely about that year. Default to evergreen phrasing or the current year if a year is needed.`,
    "",
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
    "- Score each idea's viral potential 1-10 (10 = unmissable banger for this channel; 1 = unlikely to land). Be honest, don't grade-inflate.",
    "",
    "LEARNING LOOP — IMPORTANT:",
    "- The user reviews every idea you propose and tags it ACCEPTED, PRODUCED, or REJECTED.",
    "- Treat REJECTED ideas as anti-patterns. Do NOT propose anything semantically similar to rejected ones — same topic, same angle, same hook structure, same title formula. Adapt and try a different lane.",
    "- Treat ACCEPTED/PRODUCED ideas as positive signal. Lean toward those topics, formats, hook styles, and title patterns. Build on what the user has shown they want.",
    "- If a rejected idea had a high AI score, that is a calibration signal: your taste model is off for this channel. Recalibrate downward on similar ideas.",
    "- You may propose variations that explicitly avoid a previous rejection's failure mode (e.g., \"like X but without the listicle framing they didn't like\").",
    "",
    "Return ONLY valid JSON of shape: {\"ideas\":[{\"title\":\"\",\"hook\":\"\",\"outline\":\"\",\"rationale\":\"\",\"format\":\"long|short|either\",\"tags\":[\"\"],\"viral_score\":7}]}",
  ].join("\n");

  const fmtFeedback = (it: FeedbackIdea) => {
    const score = it.aiScore !== null ? ` · AI scored ${it.aiScore}/10` : "";
    const tags = it.tags.length > 0 ? ` · tags: ${it.tags.slice(0, 4).join(", ")}` : "";
    const hookSnippet = it.hook ? ` — hook: "${it.hook.slice(0, 80).replace(/"/g, '\\"')}"` : "";
    return `- "${it.title.replace(/"/g, '\\"')}" · ${it.format}${score}${hookSnippet}${tags}`;
  };

  const rejectedSection =
    feedback.rejected.length > 0
      ? [
          "",
          `REJECTED IDEAS (${feedback.rejected.length}, most recent first) — DO NOT propose anything in the same vein:`,
          ...feedback.rejected.map(fmtFeedback),
        ]
      : [];

  const acceptedSection =
    feedback.accepted.length > 0
      ? [
          "",
          `ACCEPTED / PRODUCED IDEAS (${feedback.accepted.length}, most recent first) — these the user wanted; lean toward this taste:`,
          ...feedback.accepted.map(fmtFeedback),
        ]
      : [];

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
    ...acceptedSection,
    ...rejectedSection,
    "",
    `Generate ${count} new video ideas. Rank them best-first. Apply the learning loop above — avoid the rejected vein, lean into the accepted vein.`,
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

  const feedback = await getIdeaFeedback();
  const { system, user } = buildPrompt(channel, videos, count, feedback);
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
          hook: typeof idea.hook === "string" ? idea.hook : String(idea.hook ?? ""),
          outline: normalizeOutline(idea.outline),
          rationale: typeof idea.rationale === "string" ? idea.rationale : "",
          format:
            idea.format === "long" || idea.format === "short" || idea.format === "either"
              ? idea.format
              : "either",
          tags: Array.isArray(idea.tags) ? idea.tags.slice(0, 8).map((t) => String(t).slice(0, 40)) : [],
          source: "ai",
          aiScore:
            typeof idea.viral_score === "number" && idea.viral_score >= 1 && idea.viral_score <= 10
              ? Math.round(idea.viral_score)
              : null,
          modelUsed,
        },
      })
    )
  );

  return created;
}

// Score a single (typically manual) idea on a 1-10 scale, given the
// channel context. Used right after a manual idea is submitted so the
// score appears on the card immediately.
export async function scoreIdeaForChannel(idea: {
  title: string;
  hook?: string;
  outline?: string;
  format?: "long" | "short" | "either";
}): Promise<{ score: number; modelUsed: string } | null> {
  const snap = await fetchDmgSnapshot(50);
  if ("error" in snap) return null;
  const { channel, videos } = snap;

  const top = [...videos].sort((a, b) => b.views - a.views).slice(0, 5);
  const fmt = (v: VideoStats) =>
    `- "${v.title.replace(/"/g, '\\"')}" · ${v.isShort ? "Short" : "Long"} · ${v.views.toLocaleString()} views`;

  const todayIso = new Date().toISOString().slice(0, 10);
  const system = [
    `Today is ${todayIso}. Treat as the present.`,
    `You are a YouTube content strategist for ${DMG_BRAND} (${DMG_HANDLE}).`,
    "Score the supplied idea 1-10 for viral potential ON THIS CHANNEL specifically.",
    "10 = unmissable banger. 7 = solid hit. 5 = mid. 3 = unlikely. 1 = misses the audience.",
    "Be honest. Don't grade-inflate. One short sentence rationale is fine.",
    'Return ONLY JSON: {"score": 7, "rationale": ""}',
  ].join("\n");

  const user = [
    `Channel: ${channel.title} (${channel.handle})`,
    channel.description ? `Identity: ${channel.description.slice(0, 300)}` : "",
    `Subs: ${channel.subscribers.toLocaleString()}`,
    "",
    "TOP PERFORMERS (recent 50):",
    top.map(fmt).join("\n"),
    "",
    "IDEA:",
    `Title: ${idea.title}`,
    idea.format ? `Format: ${idea.format}` : "",
    idea.hook ? `Hook: ${idea.hook}` : "",
    idea.outline ? `Outline:\n${idea.outline}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { data, modelUsed } = await chatJson<{ score: number }>({
      model: MODEL,
      system,
      user,
      temperature: 0.2,
    });
    const s = typeof data?.score === "number" ? data.score : 0;
    if (s < 1 || s > 10) return null;
    return { score: Math.round(s), modelUsed };
  } catch {
    return null;
  }
}

export type IdeaListFilters = {
  status?: "pending" | "accepted" | "rejected" | "produced" | "all";
  page?: number;
  perPage?: number;
};

export type IdeaListResult = {
  items: Awaited<ReturnType<typeof db.videoIdea.findMany>>;
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export async function listIdeas(filters: IdeaListFilters = {}): Promise<IdeaListResult> {
  const perPage = Math.max(1, Math.min(100, filters.perPage ?? 10));
  const page = Math.max(1, filters.page ?? 1);
  try {
    const where: Record<string, unknown> = {};
    if (filters.status && filters.status !== "all") {
      where.status = filters.status;
    }
    const [items, total] = await Promise.all([
      db.videoIdea.findMany({
        where,
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      db.videoIdea.count({ where }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    return { items, total, page: Math.min(page, totalPages), perPage, totalPages };
  } catch {
    return { items: [], total: 0, page: 1, perPage, totalPages: 1 };
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
  submittedBy: string;
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
      submittedBy: opts.submittedBy.slice(0, 60),
    },
  });
}

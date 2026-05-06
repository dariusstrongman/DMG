// Generate this week's batch of viral video pitches. Synthesizes the
// channel's full analytics surface (top performers, best posting slots,
// title patterns, format mix) into N distinct pitches with intentional
// variety: different formats, different angles, different topics.
// Persisted to dmg_viral_picks. The N most-recent rows are the active
// batch; older rows live as history.

import { db } from "./db";
import { fetchDmgSnapshot } from "./youtube";
import { chatJson } from "./openai";
import { DMG_BRAND, DMG_HANDLE } from "./config";
import { getSettings } from "./settings";
import {
  postingTimeAnalysis,
  formatPerformance,
  titleSignals,
  titleLengthAnalysis,
} from "./analytics-aggregates";

const MODEL = "gpt-4o-mini";
export const PICKS_PER_WEEK = 4;

type GeneratedPick = {
  title: string;
  format: "long" | "short" | "either";
  post_day: string;
  post_time: string;
  hook: string;
  outline: string | string[];
  thumbnail_concept: string;
  viral_thesis: string;
  risk_note: string;
  tags: string[];
};

type GenerateBatchResponse = { picks: GeneratedPick[] };

function normalizeOutline(o: unknown): string {
  if (Array.isArray(o)) return o.map((line) => `- ${String(line).trim()}`).join("\n");
  if (typeof o === "string") return o;
  return "";
}

export async function generateWeeklyViralPicks(count: number = PICKS_PER_WEEK) {
  const snap = await fetchDmgSnapshot(50);
  if ("error" in snap) throw new Error(snap.error);
  const { channel, videos } = snap;

  const channelRow = await db.channel.upsert({
    where: { ytChannelId: channel.id },
    create: {
      ytChannelId: channel.id,
      title: channel.title,
      handle: channel.handle,
    },
    update: {},
  });

  const settings = await getSettings();
  const channelTz = settings.channelTimezone;
  const posting = postingTimeAnalysis(videos, channelTz);
  const fmt = formatPerformance(videos);
  const sig = titleSignals(videos);
  const lenBuckets = titleLengthAnalysis(videos);
  const top10 = [...videos].sort((a, b) => b.views - a.views).slice(0, 10);
  const recent10 = videos.slice(0, 10);

  const fmtVid = (v: typeof videos[number]) =>
    `- "${v.title.replace(/"/g, '\\"')}" · ${v.isShort ? "Short" : "Long"} · ${v.views.toLocaleString()} views · ${v.engagement.toFixed(1)}% eng`;

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const todayLong = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: channelTz,
  });

  const system = [
    `Today is ${todayLong} (${todayIso}). Treat this as the present. Your training data may be older — do NOT use stale year references like "2023" or "2024" in titles unless the topic is genuinely about that year. Default to evergreen phrasing or the current year if a year is needed.`,
    "",
    `You are a YouTube growth strategist for ${DMG_BRAND} (${DMG_HANDLE}).`,
    "You will be handed the channel's full analytics surface.",
    `Your job: propose ${count} distinct video pitches with strong viral potential for THIS channel.`,
    "Be concrete and channel-specific. Reference actual patterns you see in the data.",
    "Do NOT recommend a video that obviously duplicates a recent upload.",
    "",
    `IMPORTANT: the ${count} pitches must be DIFFERENT from each other. Vary:`,
    "- format (mix Long-form and Shorts based on what works for this channel)",
    "- topic / angle (don't propose 4 versions of the same idea)",
    "- structure (e.g. one reaction, one tier-list, one explainer, one skit, etc — pick what suits the channel)",
    "",
    "Per pitch, choose:",
    "- format: pick the one that fits THIS pitch best.",
    "- post_day + post_time: from the channel's best slots in their local timezone. Spread the 4 across different best slots.",
    "- title: align with title patterns that work (length, question/no, number/no).",
    "- hook: first 5-10 seconds spoken aloud. Specific words.",
    "- outline: 4-6 short beats, one line each.",
    "- thumbnail_concept: one sentence visual direction (no emojis).",
    "- viral_thesis: 2-3 sentences. Reference real numbers and titles you saw.",
    "- risk_note: 1 honest sentence about why this might fail.",
    "- tags: 4-7 relevant tags.",
    "",
    "Tone: blunt, specific, no marketing-speak. No em-dashes. No 'leverage', 'unlock', 'level up'.",
    "",
    "Return ONLY JSON: {\"picks\":[{\"title\":\"\",\"format\":\"long|short|either\",\"post_day\":\"\",\"post_time\":\"\",\"hook\":\"\",\"outline\":\"\",\"thumbnail_concept\":\"\",\"viral_thesis\":\"\",\"risk_note\":\"\",\"tags\":[\"\"]}]}",
  ].join("\n");

  const user = [
    `Channel: ${channel.title} (${channel.handle})`,
    channel.description ? `Identity: ${channel.description.slice(0, 400)}` : "",
    `Subs: ${channel.subscribers.toLocaleString()} · Total videos: ${channel.totalVideos.toLocaleString()} · Total views: ${channel.totalViews.toLocaleString()}`,
    `Local timezone: ${channelTz}`,
    "",
    "TOP 10 ALL-TIME (recent 50):",
    top10.map(fmtVid).join("\n"),
    "",
    "RECENT 10 (don't duplicate these):",
    recent10.map(fmtVid).join("\n"),
    "",
    "BEST POSTING SLOTS (local time):",
    posting.topSlots.length === 0
      ? "(not enough data — use any reasonable peak time)"
      : posting.topSlots
          .map(
            (s, i) =>
              `${i + 1}. ${s.dayLabelFull} ${s.hourLabel} · avg ${Math.round(s.avgViews).toLocaleString()} views, ${s.uploads} upload(s)`
          )
          .join("\n"),
    "",
    `FORMAT PERFORMANCE:`,
    `- Long-form: ${fmt.long.count} uploads · avg ${Math.round(fmt.long.avgViews).toLocaleString()} views, ${fmt.long.avgEngagement.toFixed(1)}% eng`,
    `- Shorts: ${fmt.short.count} uploads · avg ${Math.round(fmt.short.avgViews).toLocaleString()} views, ${fmt.short.avgEngagement.toFixed(1)}% eng`,
    `- Read: ${fmt.recommendation}`,
    "",
    "TITLE SIGNALS:",
    `- With "?" → ${sig.withQuestion.uploads} uploads, avg ${Math.round(sig.withQuestion.avgViews).toLocaleString()}`,
    `- Without "?" → ${sig.withoutQuestion.uploads} uploads, avg ${Math.round(sig.withoutQuestion.avgViews).toLocaleString()}`,
    `- With number → ${sig.withNumber.uploads} uploads, avg ${Math.round(sig.withNumber.avgViews).toLocaleString()}`,
    `- Without number → ${sig.withoutNumber.uploads} uploads, avg ${Math.round(sig.withoutNumber.avgViews).toLocaleString()}`,
    `- Read: ${sig.recommendation}`,
    "",
    "TITLE LENGTH BUCKETS (avg views):",
    lenBuckets.map((b) => `- ${b.label}: ${b.uploads} uploads, avg ${Math.round(b.avgViews).toLocaleString()}`).join("\n"),
    "",
    `Now produce ${count} distinct, varied viral pitches for THIS channel.`,
  ]
    .filter(Boolean)
    .join("\n");

  const { data, modelUsed } = await chatJson<GenerateBatchResponse>({
    model: MODEL,
    system,
    user,
    temperature: 0.85,
  });

  const picks = Array.isArray(data?.picks) ? data.picks : [];
  if (picks.length === 0) throw new Error("Model returned no picks.");

  const created = await db.$transaction(
    picks.slice(0, count).map((p) =>
      db.viralPick.create({
        data: {
          channelId: channelRow.id,
          title: (p.title || "Untitled pitch").slice(0, 200),
          format:
            p.format === "long" || p.format === "short" || p.format === "either"
              ? p.format
              : "either",
          postDay: p.post_day || null,
          postTime: p.post_time || null,
          hook: p.hook || "",
          outline: normalizeOutline(p.outline),
          thumbnailConcept: p.thumbnail_concept || null,
          viralThesis: p.viral_thesis || null,
          riskNote: p.risk_note || null,
          tags: Array.isArray(p.tags) ? p.tags.slice(0, 8).map((t) => String(t).slice(0, 40)) : [],
          signalUsed: {
            topSlots: posting.topSlots,
            formatPerf: { long: fmt.long, short: fmt.short, recommendation: fmt.recommendation },
            titleSignals: sig,
          },
          modelUsed,
        },
      })
    )
  );

  return created;
}

export async function getActiveViralPicks(count: number = PICKS_PER_WEEK) {
  try {
    return await db.viralPick.findMany({
      orderBy: { createdAt: "desc" },
      take: count,
    });
  } catch {
    return [];
  }
}

// Returns picks older than the active batch, for the history list.
export async function getViralPickHistory(skip: number = PICKS_PER_WEEK, take: number = 12) {
  try {
    return await db.viralPick.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: { id: true, title: true, postDay: true, postTime: true, createdAt: true },
    });
  } catch {
    return [];
  }
}

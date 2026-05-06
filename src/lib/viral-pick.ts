// Generate ONE highly-specific viral video pitch. Synthesizes the
// channel's full analytics surface — top performers, best posting
// slots, title patterns, format mix, recent uploads to avoid — into
// a concrete recommendation: title, day, time, hook, thumbnail concept,
// risk. Persisted to dmg_viral_picks; latest row is the active pick.

import { db } from "./db";
import { fetchDmgSnapshot } from "./youtube";
import { chatJson } from "./openai";
import { CHANNEL_TIMEZONE, DMG_BRAND, DMG_HANDLE } from "./config";
import {
  postingTimeAnalysis,
  formatPerformance,
  titleSignals,
  titleLengthAnalysis,
} from "./analytics-aggregates";

const MODEL = "gpt-4o-mini";

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

function normalizeOutline(o: unknown): string {
  if (Array.isArray(o)) return o.map((line) => `- ${String(line).trim()}`).join("\n");
  if (typeof o === "string") return o;
  return "";
}

export async function generateViralPick() {
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

  // Build all the signal we have.
  const posting = postingTimeAnalysis(videos, CHANNEL_TIMEZONE);
  const fmt = formatPerformance(videos);
  const sig = titleSignals(videos);
  const lenBuckets = titleLengthAnalysis(videos);
  const top10 = [...videos].sort((a, b) => b.views - a.views).slice(0, 10);
  const recent10 = videos.slice(0, 10);

  const fmtVid = (v: typeof videos[number]) =>
    `- "${v.title.replace(/"/g, '\\"')}" · ${v.isShort ? "Short" : "Long"} · ${v.views.toLocaleString()} views · ${v.engagement.toFixed(1)}% eng`;

  const system = [
    `You are a YouTube growth strategist for ${DMG_BRAND} (${DMG_HANDLE}).`,
    "You will be handed the channel's full analytics surface.",
    "Your job: propose ONE specific video that has the strongest viral potential for THIS channel.",
    "Be concrete and channel-specific. Reference actual patterns you see in the data.",
    "Do NOT recommend a video that obviously duplicates a recent upload.",
    "",
    "Choose:",
    "- format: pick the one that performs better on this channel.",
    "- post_day + post_time: pick from the channel's best slots in their local timezone.",
    "- title: align with the title patterns that work (length, question/no, number/no).",
    "- hook: first 5-10 seconds spoken aloud. Specific words.",
    "- outline: 4-6 short beats, one line each.",
    "- thumbnail_concept: one sentence visual direction (no emojis).",
    "- viral_thesis: 2-3 sentences. Reference real numbers and titles you saw.",
    "- risk_note: 1 honest sentence about what could go wrong or why this might fail.",
    "- tags: 4-7 relevant tags.",
    "",
    "Tone: blunt, specific, no marketing-speak. No em-dashes. No 'leverage', 'unlock', 'level up'.",
    "",
    "Return ONLY JSON: {\"title\":\"\",\"format\":\"long|short|either\",\"post_day\":\"\",\"post_time\":\"\",\"hook\":\"\",\"outline\":\"\",\"thumbnail_concept\":\"\",\"viral_thesis\":\"\",\"risk_note\":\"\",\"tags\":[\"\"]}",
  ].join("\n");

  const user = [
    `Channel: ${channel.title} (${channel.handle})`,
    channel.description ? `Identity: ${channel.description.slice(0, 400)}` : "",
    `Subs: ${channel.subscribers.toLocaleString()} · Total videos: ${channel.totalVideos.toLocaleString()} · Total views: ${channel.totalViews.toLocaleString()}`,
    `Local timezone: ${CHANNEL_TIMEZONE}`,
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
    "Now produce the single most viral pitch for THIS channel.",
  ]
    .filter(Boolean)
    .join("\n");

  const { data, modelUsed } = await chatJson<GeneratedPick>({
    model: MODEL,
    system,
    user,
    temperature: 0.75,
  });

  if (!data?.title) throw new Error("Model returned no title.");

  return db.viralPick.create({
    data: {
      channelId: channelRow.id,
      title: data.title.slice(0, 200),
      format:
        data.format === "long" || data.format === "short" || data.format === "either"
          ? data.format
          : "either",
      postDay: data.post_day || null,
      postTime: data.post_time || null,
      hook: data.hook || "",
      outline: normalizeOutline(data.outline),
      thumbnailConcept: data.thumbnail_concept || null,
      viralThesis: data.viral_thesis || null,
      riskNote: data.risk_note || null,
      tags: Array.isArray(data.tags) ? data.tags.slice(0, 8).map((t) => String(t).slice(0, 40)) : [],
      signalUsed: {
        topSlots: posting.topSlots,
        formatPerf: { long: fmt.long, short: fmt.short, recommendation: fmt.recommendation },
        titleSignals: sig,
      },
      modelUsed,
    },
  });
}

export async function getLatestViralPick() {
  try {
    return await db.viralPick.findFirst({
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return null;
  }
}

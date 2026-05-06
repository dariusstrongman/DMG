// Weekly AI digest: GPT analyzes the past 7 days of channel + uploads
// and returns a short, channel-specific summary with concrete next steps.
// Stored in dmg_ai_reports so we can show the latest one without
// regenerating on every page load.

import { db } from "./db";
import { fetchDmgSnapshot } from "./youtube";
import { chatJson } from "./openai";
import { DMG_BRAND, DMG_HANDLE } from "./config";

const MODEL = "gpt-4o-mini";

type DigestPayload = {
  summary: string;
  observations: string[];
  recommendations: string[];
  concerns: string[];
};

export async function generateWeeklyDigest() {
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

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const lastWeek = videos.filter((v) => +new Date(v.publishedAt) >= weekAgo);
  const recentForContext = videos.slice(0, 25);

  const fmt = (v: typeof videos[number]) => {
    const ageDays = Math.max(0, Math.round((Date.now() - +new Date(v.publishedAt)) / (24 * 60 * 60 * 1000)));
    return `- "${v.title.replace(/"/g, '\\"')}" · ${v.isShort ? "Short" : "Long"} · ${v.views.toLocaleString()} views · ${ageDays}d ago · ${v.engagement.toFixed(1)}% eng`;
  };

  // Pull last 7 days of channel snapshots for sub deltas.
  const snapshots = await db.channelSnapshot.findMany({
    where: { channelId: channelRow.id, capturedAt: { gte: new Date(weekAgo) } },
    orderBy: { capturedAt: "asc" },
    select: { subscribers: true, totalViews: true, capturedAt: true },
  });
  let weeklyDeltaSubs: number | null = null;
  let weeklyDeltaViews: number | null = null;
  if (snapshots.length >= 2) {
    weeklyDeltaSubs = Number(snapshots[snapshots.length - 1].subscribers) - Number(snapshots[0].subscribers);
    weeklyDeltaViews = Number(snapshots[snapshots.length - 1].totalViews) - Number(snapshots[0].totalViews);
  }

  const todayLong = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const todayIso = new Date().toISOString().slice(0, 10);

  const system = [
    `Today is ${todayLong} (${todayIso}). Treat this as the present. Your training data may be older — do not assume any year other than the one above.`,
    "",
    `You are a YouTube growth analyst for ${DMG_BRAND} (${DMG_HANDLE}).`,
    "Write a sharp weekly digest. Be specific. Cite real numbers from the data shown. Reference real video titles when relevant.",
    "Tone: like a smart friend who watches the channel. No marketing-speak. No em-dashes. No 'leverage', 'unlock', 'streamline', 'level up'.",
    "Sections required in JSON:",
    "- summary: 2-3 sentences, the week in a glance.",
    "- observations: 2-4 bullets, things you literally see in the data (top performer, format split, cadence).",
    "- recommendations: 2-4 bullets, concrete things to try next week. Each must be filmable now.",
    "- concerns: 0-2 bullets, real risks you can see (drop in cadence, low engagement on a format, etc). If none, return [].",
    "",
    "Return ONLY JSON: {\"summary\":\"\",\"observations\":[],\"recommendations\":[],\"concerns\":[]}",
  ].join("\n");

  const user = [
    `Channel: ${channel.title} (${channel.handle})`,
    channel.description ? `Description: ${channel.description.slice(0, 400)}` : "",
    `Subscribers now: ${channel.subscribers.toLocaleString()} · Total videos: ${channel.totalVideos.toLocaleString()} · Total views: ${channel.totalViews.toLocaleString()}`,
    weeklyDeltaSubs !== null ? `Last 7 days subs delta: ${weeklyDeltaSubs >= 0 ? "+" : ""}${weeklyDeltaSubs.toLocaleString()}` : "Last 7 days subs delta: not enough snapshot history yet.",
    weeklyDeltaViews !== null ? `Last 7 days views delta: ${weeklyDeltaViews >= 0 ? "+" : ""}${weeklyDeltaViews.toLocaleString()}` : "",
    "",
    `UPLOADS THIS WEEK (${lastWeek.length}):`,
    lastWeek.length === 0 ? "- (none)" : lastWeek.map(fmt).join("\n"),
    "",
    `RECENT 25 UPLOADS FOR CONTEXT:`,
    recentForContext.map(fmt).join("\n"),
  ]
    .filter(Boolean)
    .join("\n");

  const { data, modelUsed } = await chatJson<DigestPayload>({
    model: MODEL,
    system,
    user,
    temperature: 0.5,
  });

  const now = new Date();
  return db.aiReport.create({
    data: {
      channelId: channelRow.id,
      period: "weekly",
      startsAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      endsAt: now,
      summary: data?.summary ?? "",
      details: {
        observations: data?.observations ?? [],
        recommendations: data?.recommendations ?? [],
        concerns: data?.concerns ?? [],
      },
      modelUsed,
    },
  });
}

export async function getLatestWeeklyDigest() {
  try {
    return await db.aiReport.findFirst({
      where: { period: "weekly" },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return null;
  }
}

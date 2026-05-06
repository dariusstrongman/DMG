// YouTube Data API v3 client.
//
// Single-tenant: every fetch resolves the channel handle from src/lib/config.ts
// (currently @dmgdaily). No DB — these helpers fetch on every request, then
// rely on Next.js's `fetch` cache (5-minute revalidate) to keep quota cheap.
//
// Quota: each call below is 1 unit. Daily quota is 10,000 units, so even at
// one render per minute we're at ~432 units/day worst case.

import { DMG_HANDLE } from "./config";

const YT_API = "https://www.googleapis.com/youtube/v3";
const REVALIDATE_SECONDS = 300; // 5 min

export class YouTubeError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "YouTubeError";
  }
}

function apiKey(): string {
  const k = process.env.YOUTUBE_API_KEY;
  if (!k) {
    throw new YouTubeError(
      "YOUTUBE_API_KEY is not set. Add it to .env.local — see README."
    );
  }
  return k;
}

async function ytFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${YT_API}/${path}`);
  url.searchParams.set("key", apiKey());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      detail = body?.error?.message ?? "";
    } catch {
      // ignore parse failure
    }
    throw new YouTubeError(
      `YouTube API ${res.status}${detail ? `: ${detail}` : ""}`,
      res.status
    );
  }

  return (await res.json()) as T;
}

// ─────────── Types ───────────

export type ChannelStats = {
  id: string;
  handle: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  bannerUrl?: string;
  country?: string;
  publishedAt: string;
  uploadsPlaylistId: string;
  subscribers: number;
  totalViews: number;
  totalVideos: number;
  hiddenSubscriberCount: boolean;
};

export type VideoStats = {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  durationSec: number;
  isShort: boolean;
  views: number;
  likes: number;
  comments: number;
  engagement: number; // (likes + comments) / views * 100
};

// ─────────── Public helpers ───────────

export async function getChannelByHandle(handle: string = DMG_HANDLE): Promise<ChannelStats> {
  const cleanHandle = handle.startsWith("@") ? handle : `@${handle}`;
  const data = await ytFetch<{
    items?: Array<{
      id: string;
      snippet: {
        title: string;
        description: string;
        publishedAt: string;
        country?: string;
        thumbnails?: { high?: { url: string }; default?: { url: string } };
      };
      statistics: {
        viewCount: string;
        subscriberCount: string;
        videoCount: string;
        hiddenSubscriberCount?: boolean;
      };
      contentDetails: {
        relatedPlaylists: { uploads: string };
      };
      brandingSettings?: { image?: { bannerExternalUrl?: string } };
    }>;
  }>("channels", {
    part: "snippet,statistics,contentDetails,brandingSettings",
    forHandle: cleanHandle,
  });

  const item = data.items?.[0];
  if (!item) {
    throw new YouTubeError(`Channel ${cleanHandle} not found.`, 404);
  }

  return {
    id: item.id,
    handle: cleanHandle,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnailUrl:
      item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.default?.url ?? "",
    bannerUrl: item.brandingSettings?.image?.bannerExternalUrl,
    country: item.snippet.country,
    publishedAt: item.snippet.publishedAt,
    uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
    subscribers: Number(item.statistics.subscriberCount ?? 0),
    totalViews: Number(item.statistics.viewCount ?? 0),
    totalVideos: Number(item.statistics.videoCount ?? 0),
    hiddenSubscriberCount: Boolean(item.statistics.hiddenSubscriberCount),
  };
}

export async function getRecentUploads(
  uploadsPlaylistId: string,
  max = 50
): Promise<VideoStats[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;

  while (ids.length < max) {
    const resp = await ytFetch<{
      items?: Array<{ contentDetails: { videoId: string } }>;
      nextPageToken?: string;
    }>("playlistItems", {
      part: "contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: String(Math.min(50, max - ids.length)),
      ...(pageToken ? { pageToken } : {}),
    });

    for (const it of resp.items ?? []) {
      ids.push(it.contentDetails.videoId);
    }
    if (!resp.nextPageToken || ids.length >= max) break;
    pageToken = resp.nextPageToken;
  }

  if (ids.length === 0) return [];

  // videos.list accepts up to 50 ids per call.
  const out: VideoStats[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50).join(",");
    const resp = await ytFetch<{
      items?: Array<{
        id: string;
        snippet: {
          title: string;
          description: string;
          publishedAt: string;
          thumbnails?: { high?: { url: string }; medium?: { url: string }; default?: { url: string } };
        };
        contentDetails: { duration: string };
        statistics: {
          viewCount?: string;
          likeCount?: string;
          commentCount?: string;
        };
      }>;
    }>("videos", { part: "snippet,statistics,contentDetails", id: batch });

    for (const v of resp.items ?? []) {
      const durationSec = parseISO8601Duration(v.contentDetails.duration);
      const views = Number(v.statistics.viewCount ?? 0);
      const likes = Number(v.statistics.likeCount ?? 0);
      const comments = Number(v.statistics.commentCount ?? 0);
      out.push({
        id: v.id,
        title: v.snippet.title,
        description: v.snippet.description,
        thumbnailUrl:
          v.snippet.thumbnails?.high?.url ??
          v.snippet.thumbnails?.medium?.url ??
          v.snippet.thumbnails?.default?.url ??
          "",
        publishedAt: v.snippet.publishedAt,
        durationSec,
        // YouTube raised the Shorts cap to 3 minutes (180s) in 2024.
        // The Data API doesn't expose an `isShort` flag, so duration is
        // our best heuristic. Aspect ratio would be more accurate, but
        // it isn't returned by the Data API. False positives are rare:
        // most long-form videos run well over 3 minutes.
        isShort: durationSec <= 180,
        views,
        likes,
        comments,
        engagement: views > 0 ? ((likes + comments) / views) * 100 : 0,
      });
    }
  }

  out.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
  return out;
}

// Fetches channel + recent uploads in one go. Used by every page that needs
// real data. Returns null if YOUTUBE_API_KEY is missing so the UI can render
// a setup-required state instead of crashing.
export type DmgSnapshot = { channel: ChannelStats; videos: VideoStats[] };

export async function fetchDmgSnapshot(maxVideos = 50): Promise<DmgSnapshot | { error: string }> {
  try {
    const channel = await getChannelByHandle();
    const videos = await getRecentUploads(channel.uploadsPlaylistId, maxVideos);
    return { channel, videos };
  } catch (e) {
    if (e instanceof YouTubeError) return { error: e.message };
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ─────────── Helpers ───────────

// "PT15M30S" → 930. Handles hours/minutes/seconds, including missing parts.
export function parseISO8601Duration(iso: string): number {
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  const h = Number(m[1] ?? 0);
  const min = Number(m[2] ?? 0);
  const s = Number(m[3] ?? 0);
  return h * 3600 + min * 60 + s;
}

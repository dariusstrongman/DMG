// TikTok Display API + OAuth client.
//
// We use:
//   POST https://www.tiktok.com/v2/auth/authorize/   (consent redirect)
//   POST https://open.tiktokapis.com/v2/oauth/token/  (code → token)
//   GET  https://open.tiktokapis.com/v2/user/info/    (profile + stats)
//   POST https://open.tiktokapis.com/v2/video/list/   (creator's videos)
//
// Tokens last 24h (access) and 365d (refresh). getValidAccessToken()
// transparently refreshes when needed.

const TT_AUTH_BASE = "https://www.tiktok.com/v2/auth/authorize/";
const TT_API_BASE = "https://open.tiktokapis.com/v2";

export const TIKTOK_SCOPES = [
  "user.info.basic",
  "user.info.profile",
  "user.info.stats",
  "video.list",
] as const;

export function getTiktokConfig() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;
  if (!clientKey || !clientSecret || !redirectUri) {
    throw new Error(
      "TikTok credentials not configured. Set TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REDIRECT_URI.",
    );
  }
  return { clientKey, clientSecret, redirectUri };
}

// Build the consent URL the user is redirected to. The state is signed
// with the same secret the rest of the app uses, so the callback can
// verify it without a server-side session store.
export function buildAuthorizeUrl(state: string): string {
  const { clientKey, redirectUri } = getTiktokConfig();
  const params = new URLSearchParams({
    client_key: clientKey,
    response_type: "code",
    scope: TIKTOK_SCOPES.join(","),
    redirect_uri: redirectUri,
    state,
  });
  return `${TT_AUTH_BASE}?${params.toString()}`;
}

type TiktokTokenResponse = {
  access_token: string;
  expires_in: number;
  open_id: string;
  refresh_expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
};

export async function exchangeCodeForToken(code: string): Promise<TiktokTokenResponse> {
  const { clientKey, clientSecret, redirectUri } = getTiktokConfig();
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  const res = await fetch(`${TT_API_BASE}/oauth/token/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body: body.toString(),
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`TikTok token exchange failed (${res.status}): ${txt.slice(0, 300)}`);
  }
  const data = (await res.json()) as TiktokTokenResponse & { error?: string; error_description?: string };
  if (data.error) {
    throw new Error(`TikTok token error: ${data.error} ${data.error_description ?? ""}`);
  }
  return data;
}

export async function refreshAccessToken(refreshToken: string): Promise<TiktokTokenResponse> {
  const { clientKey, clientSecret } = getTiktokConfig();
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch(`${TT_API_BASE}/oauth/token/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body: body.toString(),
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`TikTok token refresh failed (${res.status}): ${txt.slice(0, 300)}`);
  }
  return (await res.json()) as TiktokTokenResponse;
}

// Fields supported by the user/info endpoint. Only request what we
// have a feature for — narrower scope reads better in app review.
const USER_INFO_FIELDS = [
  "open_id",
  "union_id",
  "avatar_url",
  "display_name",
  "username",
  "bio_description",
  "is_verified",
  "follower_count",
  "following_count",
  "likes_count",
  "video_count",
].join(",");

export type TiktokUserInfo = {
  openId: string;
  unionId: string | null;
  avatarUrl: string | null;
  displayName: string | null;
  username: string | null;
  bioDescription: string | null;
  isVerified: boolean;
  followerCount: number;
  followingCount: number;
  likesCount: number;
  videoCount: number;
};

export async function fetchUserInfo(accessToken: string): Promise<TiktokUserInfo> {
  const res = await fetch(`${TT_API_BASE}/user/info/?fields=${USER_INFO_FIELDS}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`TikTok user info failed (${res.status}): ${txt.slice(0, 300)}`);
  }
  const json = await res.json();
  const u = json?.data?.user;
  if (!u) throw new Error("TikTok user info: empty response");
  return {
    openId: u.open_id,
    unionId: u.union_id ?? null,
    avatarUrl: u.avatar_url ?? null,
    displayName: u.display_name ?? null,
    username: u.username ?? null,
    bioDescription: u.bio_description ?? null,
    isVerified: Boolean(u.is_verified),
    followerCount: Number(u.follower_count ?? 0),
    followingCount: Number(u.following_count ?? 0),
    likesCount: Number(u.likes_count ?? 0),
    videoCount: Number(u.video_count ?? 0),
  };
}

const VIDEO_FIELDS = [
  "id",
  "title",
  "video_description",
  "duration",
  "cover_image_url",
  "share_url",
  "create_time",
  "view_count",
  "like_count",
  "comment_count",
  "share_count",
].join(",");

export type TiktokVideo = {
  id: string;
  title: string | null;
  description: string | null;
  durationSec: number;
  coverImageUrl: string | null;
  shareUrl: string | null;
  createdAt: Date;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
};

// Cursor-based pagination. We only need the most recent ~50 for the
// dashboard so we cap iterations.
export async function fetchVideoList(accessToken: string, max = 50): Promise<TiktokVideo[]> {
  const out: TiktokVideo[] = [];
  let cursor: number | undefined;

  while (out.length < max) {
    const res = await fetch(`${TT_API_BASE}/video/list/?fields=${VIDEO_FIELDS}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ max_count: Math.min(20, max - out.length), cursor }),
      cache: "no-store",
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`TikTok video list failed (${res.status}): ${txt.slice(0, 300)}`);
    }
    const json = await res.json();
    const videos: Array<Record<string, unknown>> = json?.data?.videos ?? [];
    for (const v of videos) {
      out.push({
        id: String(v.id),
        title: (v.title as string) ?? null,
        description: (v.video_description as string) ?? null,
        durationSec: Number(v.duration ?? 0),
        coverImageUrl: (v.cover_image_url as string) ?? null,
        shareUrl: (v.share_url as string) ?? null,
        createdAt: new Date(Number(v.create_time ?? 0) * 1000),
        viewCount: Number(v.view_count ?? 0),
        likeCount: Number(v.like_count ?? 0),
        commentCount: Number(v.comment_count ?? 0),
        shareCount: Number(v.share_count ?? 0),
      });
    }
    if (!json?.data?.has_more) break;
    cursor = json.data.cursor;
    if (typeof cursor !== "number") break;
  }

  return out;
}

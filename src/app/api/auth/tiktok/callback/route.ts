// TikTok OAuth callback. Verifies state, exchanges code for token,
// upserts the account on the active channel, primes the user info +
// video list from Display API, then redirects to /dashboard/tiktok.

import { NextResponse } from "next/server";
import { exchangeCodeForToken, fetchUserInfo, fetchVideoList } from "@/lib/tiktok";
import { db } from "@/lib/db";
import { getActiveChannelDbId } from "@/lib/active-channel";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function back(url: URL, params: Record<string, string>) {
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url, { status: 303 });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const dest = new URL("/dashboard/tiktok", url);

  if (oauthError) {
    return back(dest, { connected: "denied" });
  }
  if (!code || !state) {
    return back(dest, { connected: "missing" });
  }

  // CSRF check.
  const cookieHeader = request.headers.get("cookie") ?? "";
  const stateCookieMatch = cookieHeader.match(/(?:^|;\s*)dmg_tt_state=([^;]+)/);
  if (!stateCookieMatch || stateCookieMatch[1] !== state) {
    return back(dest, { connected: "state" });
  }

  const channelId = await getActiveChannelDbId();
  if (!channelId) {
    return back(dest, { connected: "no-channel" });
  }

  let tokens;
  try {
    tokens = await exchangeCodeForToken(code);
  } catch (e) {
    return back(dest, {
      connected: "token-error",
      detail: (e instanceof Error ? e.message : "unknown").slice(0, 120),
    });
  }

  let userInfo;
  try {
    userInfo = await fetchUserInfo(tokens.access_token);
  } catch (e) {
    return back(dest, {
      connected: "userinfo-error",
      detail: (e instanceof Error ? e.message : "unknown").slice(0, 120),
    });
  }

  const now = Date.now();
  const account = await db.tiktokAccount.upsert({
    where: { channelId },
    create: {
      channelId,
      openId: userInfo.openId,
      unionId: userInfo.unionId,
      username: userInfo.username,
      displayName: userInfo.displayName,
      avatarUrl: userInfo.avatarUrl,
      bioDescription: userInfo.bioDescription,
      isVerified: userInfo.isVerified,
      followerCount: userInfo.followerCount,
      followingCount: userInfo.followingCount,
      likesCount: BigInt(userInfo.likesCount),
      videoCount: userInfo.videoCount,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accessExpiresAt: new Date(now + tokens.expires_in * 1000),
      refreshExpiresAt: new Date(now + tokens.refresh_expires_in * 1000),
      scope: tokens.scope,
      lastSyncedAt: new Date(),
    },
    update: {
      openId: userInfo.openId,
      username: userInfo.username,
      displayName: userInfo.displayName,
      avatarUrl: userInfo.avatarUrl,
      bioDescription: userInfo.bioDescription,
      isVerified: userInfo.isVerified,
      followerCount: userInfo.followerCount,
      followingCount: userInfo.followingCount,
      likesCount: BigInt(userInfo.likesCount),
      videoCount: userInfo.videoCount,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accessExpiresAt: new Date(now + tokens.expires_in * 1000),
      refreshExpiresAt: new Date(now + tokens.refresh_expires_in * 1000),
      scope: tokens.scope,
      lastSyncedAt: new Date(),
    },
  });

  // Initial video pull. Best-effort: connection should still succeed
  // even if video list fails (creator may not have any videos).
  try {
    const videos = await fetchVideoList(tokens.access_token, 50);
    for (const v of videos) {
      await db.tiktokVideo.upsert({
        where: { ttVideoId: v.id },
        create: {
          accountId: account.id,
          ttVideoId: v.id,
          title: v.title,
          description: v.description,
          coverImageUrl: v.coverImageUrl,
          shareUrl: v.shareUrl,
          durationSec: v.durationSec,
          createdAtTt: v.createdAt,
          viewCount: BigInt(v.viewCount),
          likeCount: BigInt(v.likeCount),
          commentCount: BigInt(v.commentCount),
          shareCount: BigInt(v.shareCount),
          lastSyncedAt: new Date(),
        },
        update: {
          title: v.title,
          description: v.description,
          coverImageUrl: v.coverImageUrl,
          shareUrl: v.shareUrl,
          viewCount: BigInt(v.viewCount),
          likeCount: BigInt(v.likeCount),
          commentCount: BigInt(v.commentCount),
          shareCount: BigInt(v.shareCount),
          lastSyncedAt: new Date(),
        },
      });
    }
  } catch {
    // ignore — page will show profile/stats even with no videos
  }

  // Drop the state cookie regardless.
  const res = back(dest, { connected: "ok" });
  res.cookies.set("dmg_tt_state", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

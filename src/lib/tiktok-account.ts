// DB-side TikTok account helpers. Encapsulates token rotation so route
// handlers and dashboard pages don't need to think about expiry.

import { db } from "./db";
import { refreshAccessToken } from "./tiktok";

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh 5min before actual expiry

// Returns a valid access token for the channel's connected account, or
// null if no account / refresh failed. Persists the new token.
export async function getValidAccessToken(channelId: string): Promise<string | null> {
  const acct = await db.tiktokAccount.findUnique({
    where: { channelId },
  });
  if (!acct) return null;

  if (acct.accessExpiresAt.getTime() - Date.now() > REFRESH_BUFFER_MS) {
    return acct.accessToken;
  }

  // Access token expired or close to it — try refresh.
  if (acct.refreshExpiresAt.getTime() <= Date.now()) {
    // Refresh token also expired. User must reconnect.
    return null;
  }

  try {
    const refreshed = await refreshAccessToken(acct.refreshToken);
    const now = Date.now();
    await db.tiktokAccount.update({
      where: { id: acct.id },
      data: {
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token,
        accessExpiresAt: new Date(now + refreshed.expires_in * 1000),
        refreshExpiresAt: new Date(now + refreshed.refresh_expires_in * 1000),
        scope: refreshed.scope,
      },
    });
    return refreshed.access_token;
  } catch {
    return null;
  }
}

export async function getTiktokAccount(channelId: string) {
  return db.tiktokAccount.findUnique({
    where: { channelId },
    include: {
      videos: {
        orderBy: { createdAtTt: "desc" },
        take: 50,
      },
    },
  });
}

export async function disconnectTiktok(channelId: string): Promise<void> {
  await db.tiktokAccount.deleteMany({ where: { channelId } });
}

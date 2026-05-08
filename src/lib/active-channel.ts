// Reads the active channel from the `dmg_channel` cookie and returns
// its config. Falls back to DEFAULT_CHANNEL if the cookie is missing or
// names a personal channel without a valid personal session.
//
// Server-component / route-handler use only — depends on next/headers.

import { cache } from "react";
import { cookies } from "next/headers";
import {
  CHANNELS,
  DEFAULT_CHANNEL,
  getChannelBySlug,
  type ChannelConfig,
} from "./config";
import { verifyPersonalSessionToken, PERSONAL_SESSION_COOKIE } from "./auth";

const ACTIVE_CHANNEL_COOKIE = "dmg_channel";

export { ACTIVE_CHANNEL_COOKIE };

// Wrapped in React cache() so multiple call sites within the same
// request share the same result. Every server component reaches for
// this at least once and a few reach for it 2-3x via lib helpers.
export const getActiveChannel = cache(async (): Promise<ChannelConfig> => {
  const jar = await cookies();
  const slug = jar.get(ACTIVE_CHANNEL_COOKIE)?.value ?? null;
  const ch = getChannelBySlug(slug);
  if (!ch.personal) return ch;
  const tok = jar.get(PERSONAL_SESSION_COOKIE)?.value ?? null;
  const ok = await verifyPersonalSessionToken(tok);
  return ok ? ch : DEFAULT_CHANNEL;
});

export async function getActiveChannelHandle(): Promise<string> {
  return (await getActiveChannel()).handle;
}

// All channels are listable; personal ones bounce through the password
// gate when clicked rather than being hidden from the switcher.
export async function listAvailableChannels(): Promise<ChannelConfig[]> {
  return CHANNELS;
}

// Resolves the active channel's DB row id. Looks up by handle directly
// (dmg_channels.handle is the same string the cookie config carries),
// so no YouTube API roundtrip is needed — previously this re-fetched
// the channel from YouTube every time it was called, which was 2-3x
// per page render.
//
// Memoized per request via cache().
export const getActiveChannelDbId = cache(async (): Promise<string | null> => {
  try {
    const ch = await getActiveChannel();
    const { db } = await import("./db");
    const row = await db.channel.findFirst({
      where: { handle: ch.handle },
      select: { id: true },
    });
    return row?.id ?? null;
  } catch {
    return null;
  }
});

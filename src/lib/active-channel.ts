// Reads the active channel from the `dmg_channel` cookie and returns
// its config. Falls back to DEFAULT_CHANNEL if the cookie is missing or
// names a personal channel without a valid personal session.
//
// Server-component / route-handler use only — depends on next/headers.

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

export async function getActiveChannel(): Promise<ChannelConfig> {
  const jar = await cookies();
  const slug = jar.get(ACTIVE_CHANNEL_COOKIE)?.value ?? null;
  const ch = getChannelBySlug(slug);
  if (!ch.personal) return ch;
  // Personal channels require a valid personal-session cookie. If the
  // user's session lapses we silently fall back to DMG so the dashboard
  // never renders empty data for someone who can't access it.
  const tok = jar.get(PERSONAL_SESSION_COOKIE)?.value ?? null;
  const ok = await verifyPersonalSessionToken(tok);
  return ok ? ch : DEFAULT_CHANNEL;
}

export async function getActiveChannelHandle(): Promise<string> {
  return (await getActiveChannel()).handle;
}

export async function listAvailableChannels(): Promise<ChannelConfig[]> {
  const jar = await cookies();
  const tok = jar.get(PERSONAL_SESSION_COOKIE)?.value ?? null;
  const personalOk = await verifyPersonalSessionToken(tok);
  return CHANNELS.filter((c) => !c.personal || personalOk);
}

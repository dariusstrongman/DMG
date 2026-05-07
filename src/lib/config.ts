// Channel registry. Each entry is one YouTube channel that has a row in
// the `dmg_channels` table. The single-channel constants below
// (DMG_HANDLE, DMG_BRAND, etc.) point at the default channel for
// backward-compat; new code should use CHANNELS or getActiveChannel().

export type ChannelConfig = {
  slug: string;             // URL-safe id used by the switcher
  handle: string;           // YouTube @handle
  brand: string;            // display name
  timezone: string;         // IANA tz for posting-time analytics
  subscriberGoal: number;
  subscriberGoalDeadline: string | null;
  // If true, requires the personal password gate (PERSONAL_PASSWORD env)
  // on top of the regular DMG password.
  personal: boolean;
};

export const CHANNELS: ChannelConfig[] = [
  {
    slug: "dmg",
    handle: "@dmgdaily",
    brand: "DMG Daily",
    timezone: "America/Chicago",
    subscriberGoal: 10_000,
    subscriberGoalDeadline: null,
    personal: false,
  },
  {
    slug: "rush",
    handle: "@RushToons",
    brand: "Rush Toons",
    timezone: "America/Chicago",
    subscriberGoal: 1_000,
    subscriberGoalDeadline: null,
    personal: true,
  },
];

export const DEFAULT_CHANNEL: ChannelConfig = CHANNELS[0];

export function getChannelBySlug(slug: string | null | undefined): ChannelConfig {
  if (!slug) return DEFAULT_CHANNEL;
  return CHANNELS.find((c) => c.slug === slug) ?? DEFAULT_CHANNEL;
}

// ─── legacy single-channel exports (kept so existing imports compile) ───
export const DMG_HANDLE = DEFAULT_CHANNEL.handle;
export const DMG_BRAND = DEFAULT_CHANNEL.brand;
export const SUBSCRIBER_GOAL = DEFAULT_CHANNEL.subscriberGoal;
export const SUBSCRIBER_GOAL_DEADLINE: string | null = DEFAULT_CHANNEL.subscriberGoalDeadline;
export const CHANNEL_TIMEZONE = DEFAULT_CHANNEL.timezone;

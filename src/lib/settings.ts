// Runtime-mutable settings. Defaults live in config.ts; user overrides
// live in dmg_settings. Server-only.

import { db } from "./db";
import {
  SUBSCRIBER_GOAL,
  SUBSCRIBER_GOAL_DEADLINE,
  CHANNEL_TIMEZONE,
} from "./config";

export type Settings = {
  subscriberGoal: number;
  subscriberGoalDeadline: string | null; // yyyy-mm-dd or null
  channelTimezone: string;
};

const KEY = {
  SUBSCRIBER_GOAL: "subscriber_goal",
  SUBSCRIBER_GOAL_DEADLINE: "subscriber_goal_deadline",
  CHANNEL_TIMEZONE: "channel_timezone",
} as const;

const DEFAULTS: Settings = {
  subscriberGoal: SUBSCRIBER_GOAL,
  subscriberGoalDeadline: SUBSCRIBER_GOAL_DEADLINE,
  channelTimezone: CHANNEL_TIMEZONE,
};

let cache: { value: Settings; at: number } | null = null;
const CACHE_MS = 60_000; // 1 min — settings change rarely

export async function getSettings(): Promise<Settings> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  try {
    const rows = await db.setting.findMany();
    const map: Record<string, unknown> = {};
    for (const r of rows) map[r.key] = r.value;
    const merged: Settings = {
      subscriberGoal:
        typeof map[KEY.SUBSCRIBER_GOAL] === "number"
          ? (map[KEY.SUBSCRIBER_GOAL] as number)
          : DEFAULTS.subscriberGoal,
      subscriberGoalDeadline: (() => {
        const raw = map[KEY.SUBSCRIBER_GOAL_DEADLINE];
        if (typeof raw !== "string" || raw === "") return DEFAULTS.subscriberGoalDeadline;
        return raw;
      })(),
      channelTimezone:
        typeof map[KEY.CHANNEL_TIMEZONE] === "string"
          ? (map[KEY.CHANNEL_TIMEZONE] as string)
          : DEFAULTS.channelTimezone,
    };
    cache = { value: merged, at: Date.now() };
    return merged;
  } catch {
    return DEFAULTS;
  }
}

export async function updateSettings(partial: Partial<Settings>): Promise<void> {
  const writes: Array<Promise<unknown>> = [];

  if (partial.subscriberGoal !== undefined) {
    writes.push(
      db.setting.upsert({
        where: { key: KEY.SUBSCRIBER_GOAL },
        create: { key: KEY.SUBSCRIBER_GOAL, value: partial.subscriberGoal },
        update: { value: partial.subscriberGoal },
      })
    );
  }
  if (partial.subscriberGoalDeadline !== undefined) {
    // Prisma JSON columns expect a sentinel for explicit null.
    const v = partial.subscriberGoalDeadline ?? "";
    writes.push(
      db.setting.upsert({
        where: { key: KEY.SUBSCRIBER_GOAL_DEADLINE },
        create: { key: KEY.SUBSCRIBER_GOAL_DEADLINE, value: v },
        update: { value: v },
      })
    );
  }
  if (partial.channelTimezone !== undefined) {
    writes.push(
      db.setting.upsert({
        where: { key: KEY.CHANNEL_TIMEZONE },
        create: { key: KEY.CHANNEL_TIMEZONE, value: partial.channelTimezone },
        update: { value: partial.channelTimezone },
      })
    );
  }
  await Promise.all(writes);
  cache = null; // invalidate
}

// A short list of common timezones for the settings dropdown. The
// user can paste any IANA string anyway, this is just convenience.
export const COMMON_TIMEZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
];

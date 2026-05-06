// The single channel this dashboard tracks. Used by every server-side
// fetch. No DB lookup needed, DMG is single-tenant.
export const DMG_HANDLE = "@dmgdaily";
export const DMG_BRAND = "DMG Daily";

// Subscriber milestone shown on the dashboard. When crossed, bump it
// to the next round number (50k, 100k, ...).
export const SUBSCRIBER_GOAL = 10_000;

// Optional ISO date (yyyy-mm-dd) for "on pace / behind / ahead" framing.
// Leave null to just show ETA without pass/fail framing.
export const SUBSCRIBER_GOAL_DEADLINE: string | null = null;

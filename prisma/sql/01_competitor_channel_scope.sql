-- Creates dmg_competitors + dmg_competitor_snapshots from scratch.
-- Both tables are tenant-scoped: every row carries a channelId, so each
-- channel has its own competitor list. The (channelId, ytChannelId)
-- composite uniqueness lets two channels track the same competitor
-- independently.
--
-- Idempotent — uses IF NOT EXISTS so it's safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS dmg_competitors (
  id            TEXT PRIMARY KEY,
  "channelId"   TEXT NOT NULL,
  "ytChannelId" TEXT NOT NULL,
  title         TEXT NOT NULL,
  handle        TEXT,
  "thumbnailUrl" TEXT,
  notes         TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dmg_competitors_channelId_ytChannelId_key UNIQUE ("channelId", "ytChannelId"),
  CONSTRAINT dmg_competitors_channelId_fkey FOREIGN KEY ("channelId")
    REFERENCES dmg_channels(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS dmg_competitors_channelId_idx
  ON dmg_competitors ("channelId");

CREATE TABLE IF NOT EXISTS dmg_competitor_snapshots (
  id             TEXT PRIMARY KEY,
  "competitorId" TEXT NOT NULL,
  "capturedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  subscribers    BIGINT NOT NULL,
  "totalViews"   BIGINT NOT NULL,
  "totalVideos"  INTEGER NOT NULL,
  CONSTRAINT dmg_competitor_snapshots_competitorId_fkey FOREIGN KEY ("competitorId")
    REFERENCES dmg_competitors(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS dmg_competitor_snapshots_competitorId_capturedAt_idx
  ON dmg_competitor_snapshots ("competitorId", "capturedAt");

COMMIT;

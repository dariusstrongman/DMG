-- Scope dmg_competitors by channelId so each tenant has its own list.
-- Existing rows are assigned to the @dmgdaily channel, which is the
-- only channel that's been adding competitors so far.

BEGIN;

ALTER TABLE dmg_competitors
  ADD COLUMN IF NOT EXISTS "channelId" TEXT;

UPDATE dmg_competitors c
   SET "channelId" = ch.id
  FROM dmg_channels ch
 WHERE c."channelId" IS NULL
   AND ch."handle" = '@dmgdaily';

-- Drop old unique on ytChannelId; recreate as composite per-tenant.
ALTER TABLE dmg_competitors
  DROP CONSTRAINT IF EXISTS dmg_competitors_ytChannelId_key;

ALTER TABLE dmg_competitors
  ALTER COLUMN "channelId" SET NOT NULL;

ALTER TABLE dmg_competitors
  ADD CONSTRAINT dmg_competitors_channelId_ytChannelId_key
  UNIQUE ("channelId", "ytChannelId");

ALTER TABLE dmg_competitors
  ADD CONSTRAINT dmg_competitors_channelId_fkey
  FOREIGN KEY ("channelId") REFERENCES dmg_channels(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS dmg_competitors_channelId_idx
  ON dmg_competitors ("channelId");

COMMIT;

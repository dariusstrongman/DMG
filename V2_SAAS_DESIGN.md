# DMG v2: SaaS design doc

This is the plan for converting DMG (currently a single-tenant analytics dashboard for the @dmgdaily channel) into a multi-tenant SaaS that any YouTube creator or team can sign up for.

Written before any v2 code exists. Treat as a living doc, not a contract. When you start building, fork this and update as you learn.

## What we're building

**One-line pitch:** Linear-grade analytics + AI ideation for YouTube creators, with team workspaces and a collab directory.

**Buyer:** Mid-tier YouTubers (10k-500k subs) and small creator teams (creator + editor + manager). The big guys have TubeBuddy / VidIQ / Spotter; the bottom has YouTube Studio. The middle is underserved on tools that combine real analytics with actually-useful AI suggestions.

**Wedge:** The current DMG dashboard already does things VidIQ doesn't (viral pick of the week with reasoning, Shorts-vs-Long classification via redirect probe, weekly digest, posting-time heatmap that updates with new data). v2 just lets other people use it.

**Pricing target (placeholder):**
- Free: 1 workspace, 1 channel connected, 7-day data history, 3 AI ideas / week
- Pro: $19/mo per workspace, unlimited history, unlimited AI, weekly digest emails, viral pick generator
- Team: $49/mo, up to 10 members, multi-channel workspaces (an agency managing 3 channels)

Validate prices with 10 users before locking in.

## What NOT to build (decided)

- **No community / feed / messaging.** Social products are winner-takes-most and the conversation already happens on Twitter and Discord. We're a tool, not a network.
- **No competitor comparison feature** beyond what exists today. Scope creep.
- **No video editor, thumbnail generator, or scheduler.** Those are full products.
- **No GoHighLevel.** Self-serve online SaaS, no need for SMS/CRM/booking.

## Core architectural shift: workspaces, not users

Today: hardcoded to @dmgdaily. v2: every customer has a **workspace** that owns the YouTube connection, the data, the subscription, and a list of human members.

Why workspaces and not "shared logins":
- Password resets shouldn't kick out the whole team
- We need an audit trail of who ran what AI feature (cost gating later)
- Google OAuth refresh tokens are per-account; a workspace owns the token, members borrow it
- Agencies managing multiple channels become natural multi-workspace users

### Tables (Postgres / Supabase)

```sql
-- A workspace owns one YouTube channel and one Stripe subscription.
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,                    -- "DMG Daily" or whatever
  owner_id uuid not null references auth.users(id),
  youtube_channel_id text,               -- once connected
  youtube_channel_title text,
  google_refresh_token text,             -- encrypted (pgcrypto or app-side)
  google_access_token text,              -- short-lived cache
  google_token_expires_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free',     -- 'free' | 'pro' | 'team'
  created_at timestamptz default now()
);

-- Members of a workspace, with roles.
create table workspace_members (
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','editor','viewer')),
  invited_by uuid references auth.users(id),
  joined_at timestamptz default now(),
  primary key (workspace_id, user_id)
);

-- All analytics data scopes to workspace_id.
-- Existing DMG tables get migrated by adding workspace_id and backfilling
-- the @dmgdaily workspace.
alter table videos add column workspace_id uuid references workspaces(id);
alter table video_stats_daily add column workspace_id uuid references workspaces(id);
alter table channel_stats_daily add column workspace_id uuid references workspaces(id);
alter table viral_picks add column workspace_id uuid references workspaces(id);
alter table ideas add column workspace_id uuid references workspaces(id);
-- Then NOT NULL after backfill.

-- AI usage tracking (cost gating + analytics).
create table ai_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id),
  user_id uuid not null references auth.users(id),
  feature text not null,                 -- 'idea' | 'viral_pick' | 'digest'
  prompt_tokens int,
  completion_tokens int,
  cost_usd numeric(10,5),
  created_at timestamptz default now()
);
create index on ai_runs (workspace_id, created_at desc);
```

### Row-level security

```sql
alter table workspaces enable row level security;
alter table workspace_members enable row level security;

-- A user sees workspaces they're a member of.
create policy workspaces_member_read on workspaces for select using (
  id in (select workspace_id from workspace_members where user_id = auth.uid())
);

-- Only owners can update/delete their workspace.
create policy workspaces_owner_write on workspaces for update using (owner_id = auth.uid());

-- Members see fellow members.
create policy members_read on workspace_members for select using (
  workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
);

-- Only owners invite.
create policy members_owner_insert on workspace_members for insert with check (
  workspace_id in (select id from workspaces where owner_id = auth.uid())
);
```

Repeat the "member of workspace_id" pattern on every analytics table.

### Roles (keep it dumb)

- **owner**: billing, invite/remove members, disconnect YouTube, delete workspace
- **editor**: run AI features, edit settings, see everything
- **viewer**: read-only on analytics, no AI runs (AI costs money per call)

Three roles is enough. Don't build a permission matrix UI.

## YouTube OAuth: per-workspace, not per-user

This is the part that takes longest because of Google's review process.

### Why per-workspace
- One workspace = one channel connection = one quota bucket
- Members of a workspace use the workspace's tokens, not their own
- An agency with 3 channels has 3 workspaces, 3 separate Google OAuth grants

### Scopes needed
- `https://www.googleapis.com/auth/youtube.readonly` (analytics + video lists) — this is "sensitive" and requires Google verification
- Don't ask for `youtube.force-ssl` or `youtubepartner` unless we add posting features (we won't in v2)

### Verification gotcha
Google takes **2-6 weeks** to verify apps with sensitive scopes. Apply the day you start v2 dev. You'll need:
- Privacy policy URL (already have one for ResumeGo, mirror for DMG)
- Demo video showing what we do with the data
- Justification for each scope

Until verified you can use the app with up to 100 test users (manually whitelisted in the GCP console). That's enough for closed beta.

### Token storage
Encrypt `google_refresh_token` at rest. Easiest path: use Supabase Vault, or do AES-256 with a key from env vars. Don't store plaintext tokens even though RLS protects them — service role bypasses RLS and a leaked SUPABASE_SERVICE_ROLE_KEY would expose every customer's YouTube account.

### Quota math
YouTube Data API gives 10,000 units/day per project. Common operations:
- search.list: 100 units
- videos.list: 1 unit per video
- channels.list: 1 unit
- playlistItems.list: 1 unit per item

Per-workspace daily refresh of last 50 videos + analytics ≈ 60 units. At 10k units/day that's 166 workspaces before you hit the cap. Apply for a quota increase (Google grants up to 1M units freely if you ask) before you cross 100 paying customers.

## Onboarding flow

1. User lands on `/signup`, enters email, gets magic link (Supabase Auth)
2. After auth, redirect to `/onboarding/workspace`
3. Form: workspace name + "Connect YouTube channel" button
4. Google OAuth consent screen
5. Callback stores the refresh token on the workspace, fetches channel id + title
6. Trigger initial backfill (last 90 days of videos + analytics, queued as a background job)
7. Redirect to `/dashboard` with a "Backfilling… check back in 5 min" banner
8. When backfill completes, full dashboard renders

Backfill takes 1-3 minutes for a typical channel. Don't block the redirect on it.

## Multi-tenancy in queries

Every server-side query filters by `workspace_id`. Pattern:

```ts
// Get current user's active workspace from the URL slug or a session cookie.
const workspaceId = await getActiveWorkspaceId();
const videos = await supabase
  .from('videos')
  .select('*')
  .eq('workspace_id', workspaceId);
```

A user with 3 workspaces switches via a workspace picker in the nav. Store the active id in a cookie or in the URL path (`/w/[workspaceId]/dashboard`). Both work; URL path is more shareable.

## Cron + background jobs

Today the DMG cron runs against one channel. v2 fans out:

```ts
// /api/cron/refresh-all (every hour)
const workspaces = await db.workspaces.findMany({
  where: { plan: { in: ['free','pro','team'] }, youtube_channel_id: { not: null } },
});
for (const ws of workspaces) {
  await refreshOne(ws.id);  // serial; bump to parallel batches when scale demands
}
```

When this gets slow (>50 workspaces), switch to a queue (Inngest, Trigger.dev, or a Postgres `jobs` table consumed by a separate worker). Don't build a queue on day one.

## Stripe

- Stripe Customer per workspace (not per user). The owner email is the billing email.
- Subscription tied to `stripe_subscription_id` on the workspace row.
- Webhook flips `plan` on `customer.subscription.updated` / `.deleted`.
- Use Stripe Customer Portal for cancellations and payment method updates. Don't build self-serve cancellation.

## AI feature cost gating

OpenAI tokens are real money. Without limits, one user generating 500 ideas eats your margin.

```ts
async function canRunAI(workspaceId: string, feature: string) {
  const ws = await getWorkspace(workspaceId);
  if (ws.plan === 'free') {
    const used = await db.ai_runs.count({
      where: { workspace_id: workspaceId, feature, created_at: { gte: weekAgo } },
    });
    if (feature === 'idea' && used >= 3) return { ok: false, reason: 'free tier: 3 ideas/week' };
    if (feature !== 'idea') return { ok: false, reason: 'pro feature' };
  }
  return { ok: true };
}
```

Track every run in `ai_runs` even on Pro — it's how you'll find your margin and detect abuse.

## Collab directory (after launch)

Once you have ~50 active workspaces, add a `directory_listings` table:

```sql
create table directory_listings (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  niche text[],                          -- ['gaming','tech','finance']
  collab_intent text,                    -- short blurb
  audience_size_bucket text,             -- '10k-50k', '50k-200k', etc
  contact_method text,                   -- 'email' | 'twitter' | 'discord'
  contact_value text,
  active boolean default true,
  created_at timestamptz default now()
);
```

`/directory` page: filter by niche + size, "Reach out" button deep-links to the contact_method. No messaging system, no profiles, no DMs. One page, one feature.

## Migration path from current DMG

The current DMG repo is single-tenant. Two options:

**Option A — fork into a new repo `dmg-saas`.** Copy the analytics queries and components, rebuild the auth/workspace shell from scratch in a clean Next.js project. Recommended. Keeps the personal DMG dashboard as a known-working artifact you don't risk breaking, and avoids dragging hardcoded `@dmgdaily` assumptions through the codebase.

**Option B — migrate in place.** Add workspace tables, backfill `@dmgdaily` as workspace_id #1, and refactor every query. Higher risk; you'll spend a week chasing places where channel id was assumed.

Pick A. Cost: a weekend to clone the dashboard; benefit: you keep your personal channel's analytics running through the v2 build.

## Build order

Strict order. Don't skip ahead.

1. **Auth + workspaces + members.** No YouTube. Just signup, create workspace, invite members. Confirm RLS works (members of A can't see B's workspace).
2. **Google OAuth flow + token storage.** Single button: "Connect YouTube." Verify token refresh works on its own.
3. **Port one analytics query** (e.g., 30-day views) to read by workspace_id. Confirm two workspaces show different data.
4. **Port the rest of the dashboard.** Best posting times, engagement trend, performance buckets, etc.
5. **Stripe sub + plan gating.** Free = limited, Pro = full.
6. **AI features behind plan + usage caps.**
7. **Onboarding polish:** workspace picker, invite emails, settings page.
8. **Collab directory** as separate page.
9. **Marketing site / landing page.** Don't build this first; you'll redesign it after onboarding 5 users anyway.

## Open questions to answer when you start

- Do we use Prisma (current DMG stack) or Drizzle / raw Supabase queries? Prisma needs a database URL with direct access; Supabase pooler can be flaky. Worth re-evaluating.
- Workspace slug vs uuid in URLs. Slug is prettier, uuid is collision-free. Probably slug with uniqueness constraint.
- How do we handle a user who connects YouTube to two workspaces with the same channel? Block it (one channel = one workspace) is simplest.
- Do agencies want billing rolled up across workspaces? Probably yes eventually. v1: separate sub per workspace; v2: org-level billing.

## Things to skip (write down so you don't second-guess later)

- White-label / custom domains
- API for third parties
- Mobile apps (responsive web is enough)
- Slack integration
- Browser extension
- Multi-language support

Write it down, then ignore it. These are the kinds of things you'll talk yourself into during slow weeks. Don't.

---

When you're ready to start, delete every section that's no longer accurate and check this back in. The doc only matters if it stays current.

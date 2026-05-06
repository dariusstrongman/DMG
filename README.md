# DMG Analytics

> AI-powered creator intelligence for YouTube. A Stromation product.
> Live at [dmg.stromation.com](https://dmg.stromation.com).

This repo is the production codebase for DMG Analytics — Pass 1 ships the
auth + landing + empty dashboard skeleton. Pass 2 wires the YouTube Data
API. Pass 3 layers in AI scoring, competitor tracking, and automations.

---

## What's in Pass 1

- **Next.js 15 + React 19 + TypeScript** with the App Router
- **TailwindCSS 3.4** with a dark-only design system (glassmorphism, gradient text, custom scrollbar, KPI shimmer)
- **shadcn/ui-style primitives** (Button, Card, Skeleton) — copy-pasted, not installed
- **Supabase Auth** with Google OAuth (`@supabase/ssr` cookie-based session)
- **Auth-gated routes**: middleware redirects unauthenticated users from `/dashboard/*`, `/settings`, `/team`
- **Prisma schema** for `dmg_profiles`, `dmg_teams`, `dmg_team_members`, `dmg_channels`, `dmg_channel_snapshots`, `dmg_videos`, `dmg_video_snapshots`, `dmg_competitors`, `dmg_ai_reports`, `dmg_alerts`
- **Landing page**: hero, animated dashboard preview (Recharts + Framer Motion), feature grid, AI highlight card, CTA, footer
- **Login page**: Google OAuth, error handling, Suspense-wrapped
- **Dashboard shell**: sidebar nav + topbar with avatar/sign-out + welcome state with "connect channel" CTA
- **Stub pages** for /videos, /analytics, /ai, /competitors, /automations, /settings — all wired in the sidebar

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | TailwindCSS + shadcn-style components |
| Animation | Framer Motion |
| Charts | Recharts |
| Icons | Lucide |
| Auth | Supabase Auth (Google OAuth) |
| DB | Supabase Postgres + Prisma |
| Hosting | Vercel (recommended) |

---

## Setup

### 1. Install

```bash
cd DMG
npm install
```

The `postinstall` script runs `prisma generate` automatically.

### 2. Environment

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

You need:
- **Supabase URL + anon key + service role key** — from Supabase → Settings → API. This project shares the `fggruozgfyyheflktcqc` Supabase instance with Domain Pulse; tables are prefixed `dmg_*` to coexist safely.
- **DATABASE_URL + DIRECT_URL** — Supabase → Settings → Database → Connection string. Use the **Transaction** pooler (port 6543) for `DATABASE_URL` and the **Session** pooler (port 5432) for `DIRECT_URL`.
- **GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET** — Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client. **Authorized redirect URI must be**: `https://fggruozgfyyheflktcqc.supabase.co/auth/v1/callback`. Add this provider in Supabase → Auth → Providers → Google.
- **YOUTUBE_API_KEY** — Google Cloud Console → APIs & Services → Credentials → Create API Key. Restrict to YouTube Data API v3. Used in Pass 2.
- **OPENAI_API_KEY** — for Pass 3 AI scoring.

### 3. Database

```bash
npm run db:push
```

This creates the 10 `dmg_*` tables in your Supabase project. Verify in Supabase → Table Editor that they appear and don't collide with any existing Domain Pulse tables.

The `Profile` model is keyed by the same UUID as `auth.users` so you can join. Recommended Supabase trigger to auto-insert on signup:

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.dmg_profiles (id, email, "displayName", "avatarUrl", "createdAt", "updatedAt")
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    now(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>. Click "Get started" → sign in with Google → land on `/dashboard`.

---

## Pass 1 verification checklist

After install + env + db push:

- [ ] `npm run dev` boots without errors
- [ ] Landing page at `/` renders with the animated dashboard preview chart
- [ ] `/login` shows the "Continue with Google" card
- [ ] Google sign-in completes and lands on `/dashboard`
- [ ] Sidebar links work (each renders the "Pass 2 / Pass 3" stub)
- [ ] Sign-out button in topbar returns you to `/`
- [ ] Visiting `/dashboard` while signed out redirects to `/login?next=/dashboard`

---

## Deployment (Vercel + dmg.stromation.com)

1. Push this repo to GitHub: `git push -u origin main`.
2. **Vercel → New Project → Import** from `dariusstrongman/DMG`.
3. **Environment Variables**: paste the same keys as `.env.local` (production values).
4. **Add domain**: Vercel project → Domains → Add `dmg.stromation.com`. Vercel will give you a CNAME to point at `cname.vercel-dns.com`.
5. **DNS**: in Stromation's DNS provider, add `CNAME dmg → cname.vercel-dns.com`.
6. **Update Google OAuth redirect URI** to allow `https://dmg.stromation.com/auth/callback` AND keep `https://fggruozgfyyheflktcqc.supabase.co/auth/v1/callback`.
7. **Update Supabase Auth → URL Configuration**:
   - Site URL: `https://dmg.stromation.com`
   - Redirect URLs: `https://dmg.stromation.com/auth/callback`, `http://localhost:3000/auth/callback`

---

## Pass 2 (next)

When you're ready, ping me with "start Pass 2" and I'll add:

- Real YouTube OAuth flow on the "Connect channel" button (incremental scopes — read-only `youtube.readonly` first, `yt-analytics.readonly` later)
- Channel + video sync via YouTube Data API v3 (no quota approval needed for public metadata)
- Real KPI cards on `/dashboard` driven by `dmg_channel_snapshots`
- Charts on `/dashboard/analytics` driven by `dmg_video_snapshots`
- Searchable + sortable video table on `/dashboard/videos`
- Daily snapshot cron via Vercel Cron Functions

## Pass 3 (after Pass 2)

- AI virality scorer (OpenAI on title + transcript) → fills `viralityScore`, `hookScore`, `retentionRisk`, `seoScore`
- Retention analyzer (transcript → drop-off timestamps + edit suggestions)
- Competitor tracker (`dmg_competitors` write path + comparison charts)
- Automations (`dmg_alerts` evaluator + Discord/Email/Telegram delivery)
- Daily/weekly/monthly AI reports (`dmg_ai_reports`)

---

## Project structure

```
src/
├── app/
│   ├── auth/
│   │   ├── callback/route.ts    OAuth callback handler
│   │   └── signout/route.ts     POST sign-out
│   ├── dashboard/
│   │   ├── layout.tsx           Sidebar + Topbar wrapper
│   │   ├── page.tsx             Overview (Pass 1: empty state)
│   │   ├── videos/page.tsx
│   │   ├── analytics/page.tsx
│   │   ├── ai/page.tsx
│   │   ├── competitors/page.tsx
│   │   └── automations/page.tsx
│   ├── login/page.tsx
│   ├── settings/page.tsx
│   ├── globals.css              Design tokens + glass + grid + scrollbar
│   ├── layout.tsx               Root: fonts, metadata, toaster
│   └── page.tsx                 Landing page
├── components/
│   ├── ui/                      Button, Card, Skeleton (shadcn-style)
│   ├── dashboard/               Sidebar, Topbar, ComingSoon
│   └── landing/                 LandingPreview (Recharts hero chart)
├── lib/
│   ├── supabase/                client.ts, server.ts, middleware.ts
│   ├── db.ts                    Prisma singleton
│   └── utils.ts                 cn(), formatNumber, formatDuration, …
└── middleware.ts                Auth gating
prisma/
└── schema.prisma                10 `dmg_*` models
```

---

## Stromation

Built by [Stromation](https://stromation.com). Sister products: ATSHack, ContractReview, PolicyBot, Domain Pulse.

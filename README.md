# DMG Analytics

> AI-powered creator intelligence for the DMG YouTube channel. A Stromation product.
> Live at [dmg.stromation.com](https://dmg.stromation.com).

Private dashboard — gated by a single shared password. No public signups,
no per-user accounts. Anyone with the password can view stats.

---

## Pass 1 (this commit)

- **Next.js 16 + React 19 + TypeScript** with the App Router
- **TailwindCSS 3.4** dark-only design system (glassmorphism, gradient text, KPI shimmer, custom scrollbar)
- **shadcn/ui-style primitives** (Button, Card, Skeleton)
- **Password-gate auth** — single shared password, HMAC-signed cookie session, 30-day TTL, no database table needed for auth
- **Auth-gated routes**: middleware redirects unauthenticated visitors from `/dashboard/*` and `/settings`
- **Prisma schema** for `dmg_channels`, `dmg_channel_snapshots`, `dmg_videos`, `dmg_video_snapshots`, `dmg_competitors`, `dmg_ai_reports`, `dmg_alerts` — all prefixed `dmg_*` to coexist with Domain Pulse on the shared `fggruozgfyyheflktcqc` Supabase project
- **Landing page**: hero, animated dashboard preview (Recharts + Framer Motion), feature grid, AI highlight, CTA, footer
- **Login page**: single password input
- **Dashboard shell**: sidebar nav + topbar + welcome state with "connect channel" CTA
- **Stub pages** for /videos, /analytics, /ai, /competitors, /automations, /settings — all wired in the sidebar

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | TailwindCSS + shadcn-style components |
| Animation | Framer Motion |
| Charts | Recharts |
| Icons | Lucide |
| Auth | Single password + HMAC-signed cookie (no third-party auth) |
| DB | Supabase Postgres + Prisma |
| Hosting | Vercel |

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
- **`DMG_PASSWORD`** — the shared password your friends use. Default in the example is `dmg123!` — change it before going public.
- **`DMG_AUTH_SECRET`** — random 48-byte hex string used to sign session cookies. Generate with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
  Rotating this secret invalidates all existing sessions immediately.
- **`DATABASE_URL` + `DIRECT_URL`** — Supabase → Settings → Database → Connection string. Use the **Transaction** pooler (port 6543) for `DATABASE_URL` and the **Session** pooler (port 5432) for `DIRECT_URL`. The Supabase project ref is `fggruozgfyyheflktcqc` (shared with Domain Pulse).
- **`YOUTUBE_API_KEY`** — Pass 2. Google Cloud Console → Credentials → Create API Key, restricted to YouTube Data API v3.
- **`GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`** — Pass 2. For YouTube Analytics OAuth (private metrics).
- **`OPENAI_API_KEY`** — Pass 3 AI scoring.

### 3. Database

```bash
npm run db:push
```

Creates 7 `dmg_*` tables in your Supabase project. Verify in Supabase → Table Editor that they appear and don't collide with any existing Domain Pulse tables.

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>. Click "Get started" → enter the password → land on `/dashboard`.

---

## Pass 1 verification checklist

After install + env + db push:

- [ ] `npm run dev` boots without errors
- [ ] Landing page at `/` renders with the animated dashboard preview chart
- [ ] `/login` shows the password card
- [ ] Wrong password bounces back with a "wrong password" toast
- [ ] Right password lands you on `/dashboard`
- [ ] Sidebar links work (each renders the "Pass 2 / Pass 3" stub)
- [ ] "Sign out" button in topbar clears your session and returns you to `/`
- [ ] Visiting `/dashboard` while signed out redirects to `/login?next=/dashboard`

---

## Deployment (Vercel + dmg.stromation.com)

1. Push this repo to GitHub: already done.
2. **Vercel → New Project → Import** from `dariusstrongman/DMG`.
3. **Environment Variables** — paste the same keys as `.env.local`. Make sure `DMG_PASSWORD` and `DMG_AUTH_SECRET` are set; the build will throw at runtime without them.
4. **Add domain**: Vercel project → Domains → Add `dmg.stromation.com`. Vercel will give you a CNAME target.
5. **DNS**: in Stromation's DNS provider, add `CNAME dmg → cname.vercel-dns.com`.

That's it. No OAuth callback URLs to configure for the password gate; the YouTube OAuth bit comes in Pass 2 and uses `https://dmg.stromation.com/auth/youtube/callback`.

---

## Rotating the password

Update `DMG_PASSWORD` in Vercel env vars and redeploy. Existing sessions stay valid until they expire (30 days). To force everyone out immediately, also rotate `DMG_AUTH_SECRET`.

---

## Pass 2 (next)

Ping me with "start Pass 2" and I'll add:

- Real YouTube OAuth flow on the "Connect channel" button (incremental scopes — `youtube.readonly` first, `yt-analytics.readonly` later)
- Channel + video sync via YouTube Data API v3
- Real KPI cards on `/dashboard` driven by `dmg_channel_snapshots`
- Charts on `/dashboard/analytics` driven by `dmg_video_snapshots`
- Searchable + sortable video table on `/dashboard/videos`
- Daily snapshot cron via Vercel Cron Functions

## Pass 3 (after Pass 2)

- AI virality scorer (OpenAI on title + transcript)
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
│   │   ├── login/route.ts        Password POST handler
│   │   └── signout/route.ts      Clears session cookie
│   ├── dashboard/
│   │   ├── layout.tsx            Sidebar + Topbar wrapper
│   │   ├── page.tsx              Overview (Pass 1: empty state)
│   │   ├── videos/page.tsx
│   │   ├── analytics/page.tsx
│   │   ├── ai/page.tsx
│   │   ├── competitors/page.tsx
│   │   └── automations/page.tsx
│   ├── login/page.tsx
│   ├── settings/page.tsx
│   ├── globals.css               Design tokens
│   ├── layout.tsx                Root: fonts, metadata, toaster
│   └── page.tsx                  Landing page
├── components/
│   ├── ui/                       Button, Card, Skeleton
│   ├── dashboard/                Sidebar, Topbar, ComingSoon
│   └── landing/                  LandingPreview
├── lib/
│   ├── auth.ts                   HMAC-signed session + password check
│   ├── db.ts                     Prisma singleton
│   └── utils.ts                  cn(), formatNumber, formatDuration, …
└── middleware.ts                 Auth gating
prisma/
└── schema.prisma                 7 `dmg_*` models
```

---

Built by [Stromation](https://stromation.com). Sister products: ATSHack, ContractReview, PolicyBot, Domain Pulse.

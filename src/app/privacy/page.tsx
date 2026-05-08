import Link from "next/link";

export const metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for Channelboard / Stromation Analytics.",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-foreground/90">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Home
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight mt-6 mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: 2026-05-08</p>

      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold mb-2">Who we are</h2>
          <p>
            Channelboard is a creator analytics dashboard operated by Stromation
            (stromation.com). It helps creators see how their content performs
            on platforms they connect, including YouTube and TikTok.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">What we collect</h2>
          <p className="mb-2">When you connect a platform we read:</p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>
              <strong>YouTube</strong> — channel metadata (title, handle, avatar,
              subscriber count, total views, total videos), video metadata
              (title, description, thumbnail, duration, format, published date,
              tags), and aggregate per-video stats (views, likes, comments).
            </li>
            <li>
              <strong>TikTok</strong> — basic profile (display name, username,
              avatar, bio, verification status), aggregate stats (follower,
              following, likes, video counts), and public video metadata
              (title, cover image, duration, view/like/comment/share counts,
              publish date) for your most recent videos.
            </li>
          </ul>
          <p className="mt-2">
            We do not collect private messages, ad data, payment information,
            email contents, or any data outside the explicit scopes you
            authorize during connection.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Why we collect it</h2>
          <p>
            To render the dashboard charts and AI-generated insights you came
            for. Stats are stored over time so we can show growth trends, hits
            vs flops comparisons, and pacing predictions. None of the data is
            used to train external AI models or sold to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">How we store it</h2>
          <p>
            Connected platform data is stored in our managed Postgres database
            (Neon, US-East). OAuth refresh tokens are stored encrypted at rest.
            We do not store passwords for connected platforms — authentication
            goes through each platform's official OAuth flow.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Who we share it with</h2>
          <p className="mb-2">No one for marketing or resale. Specific operational subprocessors:</p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>Vercel (hosting)</li>
            <li>Neon (database)</li>
            <li>OpenAI (only when you explicitly trigger an AI feature; we send the minimum data needed for that single request)</li>
          </ul>
          <p className="mt-2">
            We never share your data with advertisers, data brokers, or other
            creators. If we ever change subprocessors we'll update this page.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">How long we keep it</h2>
          <p>
            For as long as your account is connected. When you disconnect a
            platform from inside the dashboard, the corresponding OAuth tokens
            and stored data are deleted within 24 hours. To delete everything
            sooner, email <a className="text-primary underline" href="mailto:darius@stromation.com">darius@stromation.com</a> and we'll process the request within 7 days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Your rights</h2>
          <p>
            You can disconnect any platform at any time from the dashboard,
            request a copy of stored data, or request deletion. If you're in
            the EU/UK/California you have additional rights under GDPR/CCPA;
            email us and we'll respond within the statutory timeframe.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Cookies</h2>
          <p>
            We use first-party cookies for authentication (the signed session
            cookie that keeps you logged in) and for the active-channel switcher.
            We do not use tracking cookies or third-party advertising cookies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Contact</h2>
          <p>
            Questions, takedown requests, or data subject requests: <a className="text-primary underline" href="mailto:darius@stromation.com">darius@stromation.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
}

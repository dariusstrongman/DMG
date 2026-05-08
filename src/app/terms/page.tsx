import Link from "next/link";

export const metadata = {
  title: "Terms of Service",
  description: "Terms of service for Channelboard / Stromation Analytics.",
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-foreground/90">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Home
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight mt-6 mb-2">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: 2026-05-08</p>

      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold mb-2">The deal</h2>
          <p>
            Channelboard is provided by Stromation (the "Service"). By connecting
            a platform or signing in, you agree to these terms. If you don't
            agree, don't use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">What you can do</h2>
          <p>
            View analytics for platforms you own or are authorized to manage.
            Use AI-generated insights to inform your own content decisions.
            Disconnect at any time.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">What you can't do</h2>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>Connect platforms you don't own or have permission to access.</li>
            <li>Use the Service to harass, impersonate, or violate the terms of any connected platform (YouTube, TikTok, etc.).</li>
            <li>Reverse-engineer, resell access to, or scrape data from the Service.</li>
            <li>Use the Service to generate content that violates platform policies.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Connected platforms</h2>
          <p>
            When you connect YouTube, TikTok, or any other platform, you're
            also subject to that platform's developer policies and terms of
            service. Channelboard does not control those platforms and is not
            responsible for their availability or behavior.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">AI-generated content</h2>
          <p>
            Insights, ideas, and other AI-generated outputs are best-effort
            recommendations based on your data. They aren't guaranteed to be
            accurate, complete, or to result in any particular outcome (more
            views, more subscribers, etc.). Use your judgment.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Availability</h2>
          <p>
            We try to keep the Service running but don't guarantee uptime. We
            may modify, suspend, or shut down features at any time. If we shut
            down something you depend on, we'll give reasonable notice when we
            can.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Liability</h2>
          <p>
            The Service is provided "as is." Stromation isn't liable for any
            indirect, incidental, or consequential damages, or for lost data,
            lost views, lost revenue, or lost time. If we are ever found liable,
            our total liability is capped at the amount you paid us in the
            prior 12 months (which is zero for free users).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Changes</h2>
          <p>
            We may update these terms. We'll bump the "Last updated" date at
            the top. Continuing to use the Service after a change means you
            accept the new terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Contact</h2>
          <p>
            <a className="text-primary underline" href="mailto:darius@stromation.com">darius@stromation.com</a>
          </p>
        </section>
      </div>
    </main>
  );
}

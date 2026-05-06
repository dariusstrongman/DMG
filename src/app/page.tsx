import Link from "next/link";
import { ArrowRight, Sparkles, LineChart, Eye, Bot, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingPreview } from "@/components/landing/preview";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Decorative grid + glow */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 -top-40 h-[600px] bg-[radial-gradient(closest-side,hsl(var(--primary)/0.25),transparent)]" aria-hidden />

      {/* NAV */}
      <header className="relative z-10 px-6 py-5">
        <div className="container flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center font-bold text-sm text-primary-foreground">
              D
            </div>
            <span className="font-semibold tracking-tight">DMG Analytics</span>
            <span className="text-xs text-muted-foreground font-mono ml-2 hidden sm:inline">by Stromation</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#ai" className="hover:text-foreground transition">AI</a>
            <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/login">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 px-6 pt-12 sm:pt-20 pb-16">
        <div className="container max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1 text-xs font-mono text-muted-foreground mb-8 animate-pulse-soft">
            <Sparkles className="size-3 text-accent" />
            AI-powered creator intelligence
          </div>
          <h1 className="text-5xl sm:text-7xl font-semibold tracking-tight leading-[1.05]">
            Predict virality.
            <br />
            <span className="gradient-text">Before you publish.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Real-time YouTube analytics with AI virality scoring, retention
            drop-off detection, and competitor tracking. Built for creators who
            don't guess.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 items-center justify-center">
            <Link href="/login">
              <Button size="lg" className="min-w-[200px]">
                Connect your channel
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="min-w-[200px]">
                See features
              </Button>
            </a>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            Google sign-in · YouTube OAuth on connect · No credit card to start
          </p>
        </div>

        {/* Floating dashboard preview */}
        <div className="container max-w-6xl mt-16 sm:mt-20">
          <LandingPreview />
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative z-10 px-6 py-24">
        <div className="container max-w-6xl">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest font-mono text-accent mb-3">Capabilities</p>
            <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight">
              The whole creator stack, in one place.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon={LineChart}
              title="Real-time analytics"
              text="Subs, views, watch-time, CTR — refreshed every minute. See what's happening on your channel right now, not yesterday."
            />
            <FeatureCard
              icon={Bot}
              title="AI virality scorer"
              text="Score titles, hooks, and thumbnails before you publish. Know which video is going to underperform before it goes live."
            />
            <FeatureCard
              icon={Eye}
              title="Retention analyzer"
              text="Upload a transcript, get timestamped drop-off predictions and concrete edit suggestions for the boring parts."
            />
            <FeatureCard
              icon={Sparkles}
              title="Competitor tracker"
              text="Watch any channel: their cadence, top videos, thumbnail patterns, growth curve. Spot what's working before they do."
            />
            <FeatureCard
              icon={Zap}
              title="Smart automations"
              text="Discord pings on viral spikes. Email reports on milestones. Webhook your stack when CTR drops."
            />
            <FeatureCard
              icon={Shield}
              title="Built for teams"
              text="Workspaces, roles, shared dashboards. Editors and managers see what they need, no more, no less."
            />
          </div>
        </div>
      </section>

      {/* AI HIGHLIGHT */}
      <section id="ai" className="relative z-10 px-6 py-24">
        <div className="container max-w-5xl">
          <div className="glass-strong rounded-2xl p-8 sm:p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(var(--primary)/0.18),transparent_50%)]" />
            <div className="relative">
              <p className="text-xs uppercase tracking-widest font-mono text-primary mb-3">
                AI-first
              </p>
              <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight max-w-3xl">
                Insights you can <span className="gradient-text">actually act on</span>.
              </h2>
              <p className="mt-5 text-lg text-muted-foreground max-w-2xl">
                Every metric is paired with a reason and a fix. No vanity charts.
                Real recommendations, generated by GPT-4 from your channel's
                actual performance.
              </p>
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <AiBullet score={92} label="Virality score" sub="Strong hook, weak title" />
                <AiBullet score={71} label="Retention risk" sub="Drop-off at 0:48" />
                <AiBullet score={84} label="SEO score" sub="Add keyword: 'react 19'" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 py-24">
        <div className="container max-w-3xl text-center">
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight">
            Stop guessing.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Connect your channel. See your real numbers. Get your first AI report
            in under a minute.
          </p>
          <div className="mt-8">
            <Link href="/login">
              <Button size="lg" className="min-w-[220px]">
                Get started for free
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 px-6 py-12 border-t border-border/60">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <div className="size-6 rounded-md bg-gradient-to-br from-primary to-accent grid place-items-center text-xs font-bold text-primary-foreground">
              D
            </div>
            <span>DMG Analytics</span>
            <span className="text-muted-foreground/60">·</span>
            <span className="text-muted-foreground/60">a Stromation product</span>
          </div>
          <div className="flex gap-6">
            <a href="https://stromation.com" className="hover:text-foreground transition">
              Stromation
            </a>
            <Link href="/privacy" className="hover:text-foreground transition">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  text
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="glass rounded-xl p-6 hover:border-primary/40 transition group">
      <div className="size-10 rounded-lg bg-secondary grid place-items-center mb-4 group-hover:bg-primary/10 transition">
        <Icon className="size-5 text-primary" />
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}

function AiBullet({ score, label, sub }: { score: number; label: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-5">
      <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
        {label}
      </p>
      <p className="mt-2 text-4xl font-semibold tabular-nums">
        <span
          className={
            score >= 80
              ? "text-success"
              : score >= 60
                ? "text-warning"
                : "text-destructive"
          }
        >
          {score}
        </span>
        <span className="text-muted-foreground text-2xl">/100</span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

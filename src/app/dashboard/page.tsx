import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, Youtube, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DashboardOverview() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-rise">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
          DMG Analytics
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Channel dashboard.
        </h1>
        <p className="text-muted-foreground mt-1">
          Connect the DMG channel to see real-time analytics and AI insights.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="relative">
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,hsl(var(--primary)/0.18),transparent_50%)]"
            aria-hidden
          />
          <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <div className="size-14 rounded-xl bg-secondary grid place-items-center shrink-0">
              <Youtube className="size-7 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">Connect the DMG YouTube channel</h2>
              <p className="text-muted-foreground mt-1 max-w-xl">
                Authorize once. We'll pull channel info, recent videos, and start
                tracking analytics. Only the scopes we need.
              </p>
            </div>
            <Button size="lg" disabled title="OAuth flow ships in Pass 2">
              <Plus className="size-4" />
              Connect channel
            </Button>
          </div>
        </div>
      </Card>

      <div>
        <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-4">
          Coming in Pass 2
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <PreviewCard
            title="Real-time KPIs"
            text="Subscribers, views, watch-time, CTR, average view duration, returning viewers."
          />
          <PreviewCard
            title="Live charts"
            text="Growth over time, top videos, traffic sources, geo, devices, retention trends."
          />
          <PreviewCard
            title="AI virality scoring"
            icon={<Sparkles className="size-4 text-primary" />}
            text="Score titles, hooks, and thumbnails before publishing. Get concrete suggestions."
          />
          <PreviewCard
            title="Retention analyzer"
            text="Upload transcript, see timestamped drop-off predictions and edit recommendations."
          />
          <PreviewCard
            title="Competitor tracker"
            text="Watch any channel — cadence, top videos, growth curve, thumbnail patterns."
          />
          <PreviewCard
            title="Automations"
            text="Discord webhook on viral spike. Email report weekly. CTR-drop alert."
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Set up checklist</CardTitle>
          <CardDescription>
            Once these are configured, the connect-channel button comes alive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Item done text="Password gate live (you're past it)" />
          <Item text="Add YouTube Data API v3 key to .env.local (YOUTUBE_API_KEY)" />
          <Item text="Configure Google OAuth client for YouTube (Pass 2 scope flow)" />
          <Item text="Run database migration (npm run db:push)" />
          <Item text="Deploy to Vercel + point dmg.stromation.com at it" />
          <div className="pt-2">
            <Link href="https://github.com/dariusstrongman/DMG#setup" className="inline-flex items-center gap-1.5 text-primary hover:underline">
              Setup guide in README
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PreviewCard({
  title,
  text,
  icon
}: {
  title: string;
  text: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}

function Item({ done, text }: { done?: boolean; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div
        className={`size-4 rounded-full mt-0.5 shrink-0 ${
          done ? "bg-success" : "border border-border"
        }`}
      />
      <span className={done ? "text-foreground/90" : "text-muted-foreground"}>{text}</span>
    </div>
  );
}

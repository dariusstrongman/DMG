import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { fetchDmgSnapshot } from "@/lib/youtube";
import { getActiveChannel } from "@/lib/active-channel";
import { formatNumber, formatDuration } from "@/lib/utils";
import { CadenceChart, EngagementScatter, ViewsBarChart } from "./analytics-charts";
import { Sparkles } from "lucide-react";
import { BestPostingTimes } from "@/components/dashboard/best-posting-times";
import { FormatComparison } from "@/components/dashboard/format-comparison";
import { TitlePatterns } from "@/components/dashboard/analytics/title-patterns";
import { PerformanceBuckets } from "@/components/dashboard/analytics/performance-buckets";
import { EngagementTrendChart } from "@/components/dashboard/analytics/engagement-trend";
import { SubHistoryChart } from "@/components/dashboard/sub-history-chart";
import { getSubscriberHistory } from "@/lib/snapshots";
import { project, projectedLine } from "@/lib/projections";
import { getSettings } from "@/lib/settings";
import { engagementTrend } from "@/lib/analytics-aggregates";

export const metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const __ch = await getActiveChannel();
  const snap = await fetchDmgSnapshot(50, __ch.handle);

  if ("error" in snap) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardDescription>Setup needed</CardDescription>
          <CardTitle>YouTube API key not configured</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p className="font-mono text-xs bg-secondary border border-border rounded-md p-3">
            {snap.error}
          </p>
          <p className="mt-3">
            Head back to <Link href="/dashboard" className="text-primary underline">the overview</Link> for setup instructions.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { channel, videos } = snap;
  const settings = await getSettings();
  const SUBSCRIBER_GOAL = settings.subscriberGoal;

  // Subscriber history.
  const history = await getSubscriberHistory(channel.id, 90);
  const liveSeed =
    history.length === 0
      ? [{ subscribers: channel.subscribers, capturedAt: new Date() }]
      : history;
  const proj = project(liveSeed, SUBSCRIBER_GOAL);
  const primaryPace =
    proj.pace30d.perDay && proj.pace30d.perDay > 0
      ? proj.pace30d.perDay
      : proj.paceLifetime.perDay && proj.paceLifetime.perDay > 0
      ? proj.paceLifetime.perDay
      : null;
  const projLine = primaryPace
    ? projectedLine(channel.subscribers, primaryPace, SUBSCRIBER_GOAL).map((p) => ({
        capturedAt: p.capturedAt.toISOString(),
        subscribers: p.subscribers,
      }))
    : [];

  // Aggregates.
  const totalViewsInWindow = videos.reduce((s, v) => s + v.views, 0);
  const totalLikes = videos.reduce((s, v) => s + v.likes, 0);
  const totalComments = videos.reduce((s, v) => s + v.comments, 0);
  const avgViews = videos.length > 0 ? Math.round(totalViewsInWindow / videos.length) : 0;
  const avgEngagement =
    videos.length > 0 ? videos.reduce((s, v) => s + v.engagement, 0) / videos.length : 0;
  const avgDuration =
    videos.length > 0 ? Math.round(videos.reduce((s, v) => s + v.durationSec, 0) / videos.length) : 0;
  const topVideo = [...videos].sort((a, b) => b.views - a.views)[0];
  const trendPoints = engagementTrend(videos);

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-rise">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
          {channel.handle} · Analytics
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Channel analytics</h1>
        <p className="text-muted-foreground mt-1">
          Across the latest {videos.length} uploads.
        </p>
      </div>

      {/* Aggregate KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Window views" value={formatNumber(totalViewsInWindow)} />
        <Kpi label="Avg views / video" value={formatNumber(avgViews)} />
        <Kpi label="Avg engagement" value={`${avgEngagement.toFixed(2)}%`} />
        <Kpi label="Avg duration" value={formatDuration(avgDuration)} />
      </div>

      {/* Section 1: Where you are */}
      <Section title="Where you are" subtitle="Subscriber growth + projection to goal.">
        <SubHistoryChart
          history={history.map((h) => ({
            capturedAt: h.capturedAt.toISOString(),
            subscribers: h.subscribers,
          }))}
          projected={projLine}
          goal={SUBSCRIBER_GOAL}
        />
      </Section>

      {/* Section 2: What works */}
      <Section title="What works" subtitle="Patterns across your uploads. The data tells you where to lean.">
        <div className="space-y-4">
          <BestPostingTimes videos={videos} timezone={settings.channelTimezone} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FormatComparison videos={videos} />
            <PerformanceBuckets videos={videos} />
          </div>
          <TitlePatterns videos={videos} />
        </div>
      </Section>

      {/* Section 3: Trends */}
      <Section title="Trends" subtitle="Are you holding attention as the channel grows?">
        <Card>
          <CardHeader>
            <CardDescription className="font-mono uppercase tracking-widest text-xs">
              Engagement rate per upload
            </CardDescription>
            <CardTitle className="text-base">Engagement over time</CardTitle>
          </CardHeader>
          <CardContent>
            <EngagementTrendChart points={trendPoints} />
            <p className="text-[11px] text-muted-foreground font-mono mt-2">
              Each dot is one video. Blue = long-form, purple = Short. Dashed line = channel average.
            </p>
          </CardContent>
        </Card>
      </Section>

      {/* Section 4: Scale */}
      <Section title="Scale" subtitle="Top videos, cadence, engagement vs reach.">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 videos by views</CardTitle>
            <CardDescription>Long-form in violet, Shorts in cyan.</CardDescription>
          </CardHeader>
          <CardContent>
            <ViewsBarChart videos={videos} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Engagement vs reach</CardTitle>
              <CardDescription>Each dot is a video. Log scale on views.</CardDescription>
            </CardHeader>
            <CardContent>
              <EngagementScatter videos={videos} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload cadence</CardTitle>
              <CardDescription>Uploads per ISO week.</CardDescription>
            </CardHeader>
            <CardContent>
              <CadenceChart videos={videos} />
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* Top performer */}
      {topVideo ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> Top performer in window
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/dashboard/videos/${topVideo.id}`} className="block group">
              <div className="font-medium group-hover:text-primary transition line-clamp-2">
                {topVideo.title}
              </div>
              <div className="grid grid-cols-4 gap-3 mt-3 text-sm">
                <SmallStat label="Views" value={formatNumber(topVideo.views)} />
                <SmallStat label="Likes" value={formatNumber(topVideo.likes)} />
                <SmallStat label="Comments" value={formatNumber(topVideo.comments)} />
                <SmallStat label="Engagement" value={`${topVideo.engagement.toFixed(2)}%`} />
              </div>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-xs text-muted-foreground font-mono">
        Likes &amp; comments: {formatNumber(totalLikes)} / {formatNumber(totalComments)} across the window.
      </p>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">{title}</h2>
        {subtitle ? <p className="text-xs text-muted-foreground/80 mt-0.5">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl p-5">
      <div className="text-muted-foreground text-xs font-mono uppercase tracking-widest mb-2">
        {label}
      </div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="text-base font-semibold mt-0.5">{value}</div>
    </div>
  );
}

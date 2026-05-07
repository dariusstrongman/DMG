import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, Eye, Film, PlayCircle, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { fetchDmgSnapshot } from "@/lib/youtube";
import { DMG_HANDLE } from "@/lib/config";
import { getActiveChannel } from "@/lib/active-channel";
import { getSettings } from "@/lib/settings";
import { formatNumber, formatDuration, timeAgo } from "@/lib/utils";
import {
  recordChannelSnapshot,
  getSubscriberHistory,
  getChannelDeltas,
} from "@/lib/snapshots";
import { project, projectedLine } from "@/lib/projections";
import { GoalTracker } from "@/components/dashboard/goal-tracker";
import { VelocityStrip } from "@/components/dashboard/velocity-strip";
import { SubHistoryChart } from "@/components/dashboard/sub-history-chart";
import { TopPerformers } from "@/components/dashboard/top-performers";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export default async function DashboardOverview() {
  const activeChannel = await getActiveChannel();
  const [snap, settings] = await Promise.all([
    fetchDmgSnapshot(50, activeChannel.handle),
    getSettings(),
  ]);

  if ("error" in snap) {
    return <SetupRequired error={snap.error} />;
  }

  const { channel, videos } = snap;
  const SUBSCRIBER_GOAL = settings.subscriberGoal;

  // Persist a snapshot (throttled to ~1/hour) so projections have history.
  // Fire-and-forget shape: failures are swallowed inside the helper.
  await recordChannelSnapshot(channel, videos);

  const [history, deltas] = await Promise.all([
    getSubscriberHistory(channel.id, 90),
    getChannelDeltas(channel.id),
  ]);

  // If DB is empty but we have a current count, seed history with the
  // live point so the projection card shows a sensible "current" value.
  const liveSeed =
    history.length === 0
      ? [{ subscribers: channel.subscribers, capturedAt: new Date() }]
      : history;
  const projection = project(liveSeed, SUBSCRIBER_GOAL);

  // Build the projected line for the chart using the best pace we have.
  const primaryPace =
    projection.pace30d.perDay && projection.pace30d.perDay > 0
      ? projection.pace30d.perDay
      : projection.paceLifetime.perDay && projection.paceLifetime.perDay > 0
      ? projection.paceLifetime.perDay
      : null;

  const projLine = primaryPace
    ? projectedLine(channel.subscribers, primaryPace, SUBSCRIBER_GOAL).map((p) => ({
        capturedAt: p.capturedAt.toISOString(),
        subscribers: p.subscribers,
      }))
    : [];
  const histForChart = history.map((h) => ({
    capturedAt: h.capturedAt.toISOString(),
    subscribers: h.subscribers,
  }));

  const recent = videos.slice(0, 6);
  const latestUpload = videos[0];
  const last30 = videos.filter(
    (v) => Date.now() - +new Date(v.publishedAt) < 30 * 24 * 60 * 60 * 1000
  );
  const avgViews30d =
    last30.length > 0 ? Math.round(last30.reduce((s, v) => s + v.views, 0) / last30.length) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-rise">
      {/* Header */}
      <div className="flex items-start gap-4">
        {channel.thumbnailUrl ? (
          <Image
            src={channel.thumbnailUrl}
            alt={channel.title}
            width={56}
            height={56}
            className="rounded-full ring-1 ring-border"
          />
        ) : null}
        <div className="flex-1">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
            {channel.handle}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{channel.title}</h1>
          {channel.description ? (
            <p className="text-muted-foreground mt-1 max-w-2xl line-clamp-2">
              {channel.description}
            </p>
          ) : null}
        </div>
      </div>

      {/* Goal tracker (10k projection) */}
      <GoalTracker projection={projection} goalDeadline={settings.subscriberGoalDeadline} />

      {/* Velocity strip (24h / 7d / 30d deltas) */}
      <VelocityStrip deltas={deltas} />

      {/* Subscriber history + projection chart */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
            Subscriber trend · 90d + projection
          </h2>
          <Link
            href="/dashboard/analytics"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            Detailed analytics <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
        <SubHistoryChart history={histForChart} projected={projLine} goal={SUBSCRIBER_GOAL} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          icon={<Users className="size-4" />}
          label="Subscribers"
          value={channel.hiddenSubscriberCount ? "Hidden" : channel.subscribers.toLocaleString()}
        />
        <Kpi
          icon={<Eye className="size-4" />}
          label="Total views"
          value={formatNumber(channel.totalViews)}
        />
        <Kpi
          icon={<Film className="size-4" />}
          label="Videos"
          value={formatNumber(channel.totalVideos)}
        />
        <Kpi
          icon={<PlayCircle className="size-4" />}
          label="Avg views (last 30d)"
          value={formatNumber(avgViews30d)}
          sub={`${last30.length} upload${last30.length === 1 ? "" : "s"}`}
        />
      </div>

      {/* Top performers (last 30d) */}
      <TopPerformers videos={videos} days={30} limit={5} />

      {/* Latest video */}
      {latestUpload ? (
        <Card>
          <CardHeader>
            <CardDescription className="font-mono uppercase tracking-widest text-xs">
              Latest upload
            </CardDescription>
            <CardTitle className="text-base">{latestUpload.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href={`https://youtube.com/watch?v=${latestUpload.id}`}
                target="_blank"
                className="relative shrink-0 group"
              >
                <Image
                  src={latestUpload.thumbnailUrl}
                  alt={latestUpload.title}
                  width={320}
                  height={180}
                  className="rounded-lg ring-1 ring-border group-hover:ring-primary transition"
                />
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-xs font-mono">
                  {formatDuration(latestUpload.durationSec)}
                </div>
              </Link>
              <div className="flex-1 grid grid-cols-3 gap-3 sm:gap-4 self-center">
                <Stat label="Views" value={formatNumber(latestUpload.views)} />
                <Stat label="Likes" value={formatNumber(latestUpload.likes)} />
                <Stat label="Comments" value={formatNumber(latestUpload.comments)} />
                <Stat label="Engagement" value={`${latestUpload.engagement.toFixed(2)}%`} />
                <Stat label="Published" value={timeAgo(latestUpload.publishedAt)} />
                <Stat label="Format" value={latestUpload.isShort ? "Short" : "Long"} />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Recent uploads grid */}
      {recent.length > 1 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
              Recent uploads
            </h2>
            <Link
              href="/dashboard/videos"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              All videos <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recent.slice(1).map((v) => (
              <VideoTile key={v.id} v={v} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono uppercase tracking-widest mb-2">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      {sub ? <div className="text-xs text-muted-foreground mt-1">{sub}</div> : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="text-base font-semibold mt-0.5">{value}</div>
    </div>
  );
}

function VideoTile({ v }: { v: { id: string; title: string; thumbnailUrl: string; views: number; publishedAt: string; durationSec: number } }) {
  return (
    <Link
      href={`https://youtube.com/watch?v=${v.id}`}
      target="_blank"
      className="glass rounded-xl overflow-hidden block group hover:ring-1 hover:ring-primary transition"
    >
      <div className="relative aspect-video bg-secondary">
        <Image src={v.thumbnailUrl} alt={v.title} fill className="object-cover" />
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-xs font-mono">
          {formatDuration(v.durationSec)}
        </div>
      </div>
      <div className="p-3">
        <div className="font-medium text-sm line-clamp-2 group-hover:text-primary transition">
          {v.title}
        </div>
        <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-2">
          <span>{formatNumber(v.views)} views</span>
          <span>·</span>
          <span>{timeAgo(v.publishedAt)}</span>
        </div>
      </div>
    </Link>
  );
}

function SetupRequired({ error }: { error: string }) {
  return (
    <div className="max-w-2xl mx-auto animate-rise">
      <Card>
        <CardHeader>
          <CardDescription className="font-mono uppercase tracking-widest text-xs text-yellow-400">
            Setup needed
          </CardDescription>
          <CardTitle>Can&apos;t reach the YouTube API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p className="text-foreground/90 font-mono text-xs bg-secondary rounded-md p-3 border border-border">
            {error}
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              Go to <Link className="text-primary underline" target="_blank" href="https://console.cloud.google.com/apis/credentials">Google Cloud → Credentials</Link>, create an API key.
            </li>
            <li>
              Restrict it to <span className="font-mono text-foreground/90">YouTube Data API v3</span>.
            </li>
            <li>
              Add to <span className="font-mono text-foreground/90">.env.local</span>:
              <pre className="mt-1 bg-secondary rounded-md p-3 text-xs font-mono text-foreground/90 border border-border">YOUTUBE_API_KEY=AIza...</pre>
            </li>
            <li>
              Restart the dev server. Currently tracking <span className="font-mono text-foreground/90">{DMG_HANDLE}</span>.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

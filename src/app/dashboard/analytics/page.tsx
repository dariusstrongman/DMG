import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { fetchDmgSnapshot } from "@/lib/youtube";
import { formatNumber, formatDuration } from "@/lib/utils";
import { CadenceChart, EngagementScatter, ViewsBarChart } from "./analytics-charts";
import { Activity, Sparkles } from "lucide-react";

export const metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";
export const revalidate = 300;

export default async function AnalyticsPage() {
  const snap = await fetchDmgSnapshot(50);

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

  // Aggregates.
  const totalViewsInWindow = videos.reduce((s, v) => s + v.views, 0);
  const totalLikes = videos.reduce((s, v) => s + v.likes, 0);
  const totalComments = videos.reduce((s, v) => s + v.comments, 0);
  const avgViews = videos.length > 0 ? Math.round(totalViewsInWindow / videos.length) : 0;
  const avgEngagement =
    videos.length > 0
      ? videos.reduce((s, v) => s + v.engagement, 0) / videos.length
      : 0;
  const avgDuration =
    videos.length > 0
      ? Math.round(videos.reduce((s, v) => s + v.durationSec, 0) / videos.length)
      : 0;
  const shortsCount = videos.filter((v) => v.isShort).length;
  const longCount = videos.length - shortsCount;
  const topVideo = [...videos].sort((a, b) => b.views - a.views)[0];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-rise">
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

      {/* Mix + top */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Format mix</CardTitle>
            <CardDescription>Long-form vs Shorts in this window.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div>
                <div className="text-3xl font-semibold tracking-tight">{longCount}</div>
                <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mt-1">
                  Long
                </div>
              </div>
              <div className="text-muted-foreground">/</div>
              <div>
                <div className="text-3xl font-semibold tracking-tight">{shortsCount}</div>
                <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mt-1">
                  Shorts
                </div>
              </div>
            </div>
            <div className="h-2 rounded-full bg-secondary mt-5 overflow-hidden flex">
              <div
                className="bg-primary"
                style={{
                  width: `${videos.length ? (longCount / videos.length) * 100 : 0}%`,
                }}
              />
              <div
                className="bg-accent"
                style={{
                  width: `${videos.length ? (shortsCount / videos.length) * 100 : 0}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> Top performer
            </CardTitle>
            <CardDescription>Most-viewed in this window.</CardDescription>
          </CardHeader>
          <CardContent>
            {topVideo ? (
              <Link
                href={`https://youtube.com/watch?v=${topVideo.id}`}
                target="_blank"
                className="block group"
              >
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
            ) : (
              <p className="text-muted-foreground">No videos yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 10 videos by views</CardTitle>
          <CardDescription>
            Long-form in violet, Shorts in cyan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ViewsBarChart videos={videos} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Engagement vs reach</CardTitle>
            <CardDescription>
              Each dot is a video. Log scale on views.
            </CardDescription>
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

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="flex items-start gap-3 pt-6">
          <Activity className="size-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Time-series charts unlock with daily snapshots.</p>
            <p className="text-muted-foreground mt-1">
              Subscribers-over-time, view velocity, and CTR trends need the
              dashboard to record a snapshot once per day. We'll add that with a
              cron job — no manual work.
            </p>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground font-mono">
        Likes &amp; comments: {formatNumber(totalLikes)} / {formatNumber(totalComments)} across the window.
      </p>
    </div>
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

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, TrendingUp } from "lucide-react";
import { fetchDmgSnapshot } from "@/lib/youtube";
import { getVideoHistory } from "@/lib/video-snapshots";
import { formatNumber, formatDuration, timeAgo } from "@/lib/utils";
import { VideoSnapshotChart } from "@/components/dashboard/video-snapshot-chart";

export const dynamic = "force-dynamic";

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const snap = await fetchDmgSnapshot(50);
  if ("error" in snap) {
    return <p className="text-sm text-muted-foreground">Cannot load: {snap.error}</p>;
  }
  const video = snap.videos.find((v) => v.id === id);
  if (!video) notFound();

  const history = await getVideoHistory(id, 90);

  let delta24h: number | null = null;
  if (history.length >= 2) {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const past = history.find((h) => h.capturedAt.getTime() >= dayAgo - 6 * 60 * 60 * 1000 && h.capturedAt.getTime() <= dayAgo + 6 * 60 * 60 * 1000);
    if (past) {
      delta24h = video.views - past.views;
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-rise">
      <Link
        href="/dashboard/videos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="size-3.5" /> All videos
      </Link>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-5">
            <Link
              href={`https://youtube.com/watch?v=${video.id}`}
              target="_blank"
              className="relative shrink-0 group block"
            >
              <Image
                src={video.thumbnailUrl}
                alt={video.title}
                width={400}
                height={225}
                className="rounded-lg ring-1 ring-border group-hover:ring-primary transition"
              />
              <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-xs font-mono">
                {formatDuration(video.durationSec)}
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
                {video.isShort ? "Short" : "Long-form"} · {timeAgo(video.publishedAt)}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight">{video.title}</h1>
              <Link
                href={`https://youtube.com/watch?v=${video.id}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
              >
                Watch on YouTube <ExternalLink className="size-3" />
              </Link>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                <Stat label="Views" value={formatNumber(video.views)} />
                <Stat label="Likes" value={formatNumber(video.likes)} />
                <Stat label="Comments" value={formatNumber(video.comments)} />
                <Stat label="Engagement" value={`${video.engagement.toFixed(2)}%`} />
              </div>
              {delta24h !== null ? (
                <div className="mt-4 inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                  <TrendingUp className="size-3.5" />
                  {delta24h >= 0 ? "+" : ""}{formatNumber(delta24h)} views in last 24h
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-3">
          Views over time
        </h2>
        <VideoSnapshotChart
          history={history.map((h) => ({
            capturedAt: h.capturedAt.toISOString(),
            views: h.views,
            likes: h.likes,
            comments: h.comments,
          }))}
        />
      </div>

      {video.description ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap font-sans text-sm text-muted-foreground">
              {video.description}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-base font-semibold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

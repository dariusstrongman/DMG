import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { fetchDmgSnapshot } from "@/lib/youtube";
import { getActiveChannel } from "@/lib/active-channel";
import { formatNumber, formatDuration, timeAgo } from "@/lib/utils";
import { ExternalLink, TrendingUp } from "lucide-react";
import { getVideoSpikes24h } from "@/lib/video-snapshots";
import { projectVideo } from "@/lib/video-projections";
import { getFittedTaus } from "@/lib/video-curve-fit";

export const metadata = { title: "Videos" };
export const dynamic = "force-dynamic";

type FormatFilter = "all" | "long" | "short";

function isFormatFilter(s: string | undefined): s is FormatFilter {
  return s === "all" || s === "long" || s === "short";
}

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const format: FormatFilter = isFormatFilter(sp.format) ? sp.format : "all";
  const sort: "views" | "engagement" | "recent" =
    sp.sort === "views" ? "views" : sp.sort === "engagement" ? "engagement" : "recent";

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
          <p className="font-mono text-xs bg-secondary border border-border rounded-md p-3">{snap.error}</p>
          <p className="mt-3">
            Head back to <Link href="/dashboard" className="text-primary underline">the overview</Link>.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { channel, videos } = snap;
  const filtered =
    format === "long"
      ? videos.filter((v) => !v.isShort)
      : format === "short"
      ? videos.filter((v) => v.isShort)
      : videos;
  const sorted =
    sort === "views"
      ? [...filtered].sort((a, b) => b.views - a.views)
      : sort === "engagement"
      ? [...filtered].sort((a, b) => b.engagement - a.engagement)
      : filtered;

  const [spikes, taus] = await Promise.all([
    getVideoSpikes24h(filtered.map((v) => v.id)),
    getFittedTaus(),
  ]);

  const counts = {
    all: videos.length,
    long: videos.filter((v) => !v.isShort).length,
    short: videos.filter((v) => v.isShort).length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-rise">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
          {channel.handle} · Videos
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">All uploads</h1>
        <p className="text-muted-foreground mt-1">
          Latest {videos.length} videos. Click a row to drill in.
        </p>
        <p className="text-[11px] font-mono text-muted-foreground/70 mt-1.5">
          Projections · long-form τ={taus.tauLong.toFixed(1)}d{" "}
          <span className={taus.source.long === "fitted" ? "text-emerald-400" : "text-muted-foreground/50"}>
            ({taus.source.long === "fitted" ? `fitted from ${taus.longSamples} videos` : "default — need 3+ matured videos"})
          </span>
          {" · "}Shorts τ={taus.tauShort.toFixed(1)}d{" "}
          <span className={taus.source.short === "fitted" ? "text-emerald-400" : "text-muted-foreground/50"}>
            ({taus.source.short === "fitted" ? `fitted from ${taus.shortSamples} videos` : "default — need 3+ matured Shorts"})
          </span>
        </p>
      </div>

      {/* Filter tabs + sort */}
      <div className="flex items-center gap-1 flex-wrap border-b border-border">
        {(["all", "long", "short"] as const).map((f) => (
          <Link
            key={f}
            href={`/dashboard/videos?format=${f}${sort !== "recent" ? `&sort=${sort}` : ""}`}
            className={`px-3 py-2 text-sm border-b-2 -mb-px transition ${
              format === f
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "all" ? "All" : f === "long" ? "Long-form" : "Shorts"}
            <span className="ml-1.5 text-xs font-mono text-muted-foreground/70 tabular-nums">
              {counts[f]}
            </span>
          </Link>
        ))}
        <div className="ml-auto flex items-center gap-1 text-xs font-mono text-muted-foreground">
          Sort:
          <Link
            href={`/dashboard/videos?format=${format}&sort=recent`}
            className={sort === "recent" ? "text-foreground underline" : "hover:text-foreground"}
          >
            Recent
          </Link>
          <span>·</span>
          <Link
            href={`/dashboard/videos?format=${format}&sort=views`}
            className={sort === "views" ? "text-foreground underline" : "hover:text-foreground"}
          >
            Views
          </Link>
          <span>·</span>
          <Link
            href={`/dashboard/videos?format=${format}&sort=engagement`}
            className={sort === "engagement" ? "text-foreground underline" : "hover:text-foreground"}
          >
            Engagement
          </Link>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-xs font-mono uppercase tracking-widest text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Video</th>
                <th className="text-left px-4 py-3 font-medium">Published</th>
                <th className="text-left px-4 py-3 font-medium">Length</th>
                <th className="text-right px-4 py-3 font-medium">Views</th>
                <th className="text-right px-4 py-3 font-medium">24h</th>
                <th className="text-right px-4 py-3 font-medium">Likes</th>
                <th className="text-right px-4 py-3 font-medium">Engagement</th>
                <th className="text-right px-3 py-3 font-medium" title="Projected views by day 7. (actual) once the video is past 7 days old.">Proj 7d</th>
                <th className="text-right px-3 py-3 font-medium" title="Projected views by day 15.">Proj 15d</th>
                <th className="text-right px-3 py-3 font-medium" title="Projected views by day 30. Based on view-decay curve: long-form τ=14d, Shorts τ=5d.">Proj 30d</th>
                <th className="px-2 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((v) => {
                const spike = spikes[v.id];
                return (
                  <tr key={v.id} className="border-b border-border/50 hover:bg-secondary/30 transition">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/videos/${v.id}`} className="flex items-center gap-3 min-w-0 group">
                        <div className="relative w-24 aspect-video shrink-0 rounded overflow-hidden bg-secondary">
                          <Image src={v.thumbnailUrl} alt={v.title} fill className="object-cover" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium line-clamp-2 group-hover:text-primary transition">{v.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {v.isShort ? "Short" : "Long-form"}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{timeAgo(v.publishedAt)}</td>
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{formatDuration(v.durationSec)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatNumber(v.views)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {spike === null ? (
                        <span className="text-muted-foreground/50">—</span>
                      ) : spike > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-emerald-300">
                          <TrendingUp className="size-3" />+{formatNumber(spike)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{formatNumber(spike)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatNumber(v.likes)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{v.engagement.toFixed(2)}%</td>
                    {(() => {
                      const p = projectVideo({
                        views: v.views,
                        publishedAt: v.publishedAt,
                        isShort: v.isShort,
                        tauLong: taus.tauLong,
                        tauShort: taus.tauShort,
                      });
                      const baseClass = p.confidence === "low" ? "text-muted-foreground" : "text-foreground";
                      const cell = (val: number | null, milestone: number) => {
                        if (val === null) return <span className="text-muted-foreground/50">—</span>;
                        const isPast = milestone <= p.ageDays;
                        return (
                          <span
                            className={isPast ? "text-muted-foreground" : baseClass}
                            title={isPast ? "Already past this milestone — actual views" : `Confidence: ${p.confidence}`}
                          >
                            {formatNumber(val)}
                          </span>
                        );
                      };
                      return (
                        <>
                          <td className="px-3 py-3 text-right tabular-nums">{cell(p.proj7, 7)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{cell(p.proj15, 15)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{cell(p.proj30, 30)}</td>
                        </>
                      );
                    })()}
                    <td className="px-2 py-3">
                      <Link
                        href={`https://youtube.com/watch?v=${v.id}`}
                        target="_blank"
                        className="text-muted-foreground hover:text-primary transition inline-flex"
                        aria-label="Open on YouTube"
                      >
                        <ExternalLink className="size-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

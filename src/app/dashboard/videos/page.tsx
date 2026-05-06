import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { fetchDmgSnapshot } from "@/lib/youtube";
import { formatNumber, formatDuration, timeAgo } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

export const metadata = { title: "Videos" };
export const dynamic = "force-dynamic";
export const revalidate = 300;

export default async function VideosPage() {
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

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-rise">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
          {channel.handle} · Videos
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">All uploads</h1>
        <p className="text-muted-foreground mt-1">
          Latest {videos.length} videos. Sorted by publish date — newest first.
        </p>
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
                <th className="text-right px-4 py-3 font-medium">Likes</th>
                <th className="text-right px-4 py-3 font-medium">Comments</th>
                <th className="text-right px-4 py-3 font-medium">Engagement</th>
                <th className="px-2 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {videos.map((v) => (
                <tr key={v.id} className="border-b border-border/50 hover:bg-secondary/30 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-24 aspect-video shrink-0 rounded overflow-hidden bg-secondary">
                        <Image src={v.thumbnailUrl} alt={v.title} fill className="object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium line-clamp-2">{v.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {v.isShort ? "Short" : "Long-form"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {timeAgo(v.publishedAt)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                    {formatDuration(v.durationSec)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatNumber(v.views)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatNumber(v.likes)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatNumber(v.comments)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {v.engagement.toFixed(2)}%
                  </td>
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
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

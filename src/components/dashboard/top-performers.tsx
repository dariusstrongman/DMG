import Link from "next/link";
import Image from "next/image";
import { Trophy } from "lucide-react";
import { formatNumber, formatDuration, timeAgo } from "@/lib/utils";
import type { VideoStats } from "@/lib/youtube";

export function TopPerformers({ videos, days = 30, limit = 5 }: { videos: VideoStats[]; days?: number; limit?: number }) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const top = videos
    .filter((v) => +new Date(v.publishedAt) >= cutoff)
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);

  if (top.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="size-4 text-yellow-300" />
        <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
          Top performers · last {days}d
        </h2>
      </div>
      <div className="rounded-xl border border-border bg-secondary/30 divide-y divide-border overflow-hidden">
        {top.map((v, i) => (
          <Link
            key={v.id}
            href={`https://youtube.com/watch?v=${v.id}`}
            target="_blank"
            className="flex items-center gap-3 p-3 hover:bg-secondary/60 transition group"
          >
            <span className="font-mono text-xs text-muted-foreground w-6 tabular-nums">#{i + 1}</span>
            <div className="relative shrink-0 w-24 aspect-video rounded overflow-hidden ring-1 ring-border">
              <Image src={v.thumbnailUrl} alt={v.title} fill className="object-cover" />
              <div className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/80 text-[10px] font-mono">
                {formatDuration(v.durationSec)}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium line-clamp-1 group-hover:text-primary transition">
                {v.title}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono">
                <span>{formatNumber(v.views)} views</span>
                <span>{v.engagement.toFixed(1)}% engagement</span>
                <span className="text-muted-foreground/70">{timeAgo(v.publishedAt)}</span>
                <span className={v.isShort ? "text-purple-300" : "text-blue-300"}>
                  {v.isShort ? "Short" : "Long"}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

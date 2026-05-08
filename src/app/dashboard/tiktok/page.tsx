// TikTok analytics. Mirrors the YouTube overview's information density:
// header card (profile + verification), KPI strip (followers, likes,
// following, videos), then a video list with thumbnails and per-video
// stats. Renders a Connect CTA when no account is linked.

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Heart, MessageCircle, Play, Share2, Users, Video, ShieldCheck, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getActiveChannelDbId } from "@/lib/active-channel";
import { getTiktokAccount } from "@/lib/tiktok-account";
import { formatNumber, formatDuration, timeAgo } from "@/lib/utils";

export const metadata = { title: "TikTok" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ connected?: string; detail?: string }>;

export default async function TiktokPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const channelId = await getActiveChannelDbId();
  const account = channelId ? await getTiktokAccount(channelId) : null;

  if (!account) {
    return <ConnectCta connected={sp.connected} detail={sp.detail} />;
  }

  const videos = account.videos;
  const totalLikes = videos.reduce((s, v) => s + Number(v.likeCount), 0);
  const totalComments = videos.reduce((s, v) => s + Number(v.commentCount), 0);
  const totalShares = videos.reduce((s, v) => s + Number(v.shareCount), 0);
  const recentEng =
    videos.length > 0
      ? (totalLikes + totalComments) /
        Math.max(1, videos.reduce((s, v) => s + Number(v.viewCount), 0)) *
        100
      : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-rise">
      {/* Header */}
      <div className="flex items-start gap-4">
        {account.avatarUrl ? (
          // TikTok avatar URLs are absolute and expire — we render via
          // the standard Image component. If the URL has expired we
          // fall back to the initials.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={account.avatarUrl}
            alt={account.displayName ?? account.username ?? "TikTok"}
            width={56}
            height={56}
            className="size-14 rounded-full ring-1 ring-border object-cover"
          />
        ) : (
          <div className="size-14 rounded-full ring-1 ring-border grid place-items-center bg-secondary text-foreground font-semibold">
            {(account.displayName ?? account.username ?? "T").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-2">
            TikTok · @{account.username ?? "—"}
            {account.isVerified ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-blue-300 bg-blue-400/10 px-1.5 py-0.5 rounded">
                <ShieldCheck className="size-3" /> Verified
              </span>
            ) : null}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{account.displayName ?? account.username ?? "TikTok"}</h1>
          {account.bioDescription ? (
            <p className="text-muted-foreground mt-1 max-w-2xl line-clamp-2">{account.bioDescription}</p>
          ) : null}
          <p className="text-[11px] font-mono text-muted-foreground/80 mt-1.5">
            Connected {timeAgo(account.connectedAt)}
            {account.lastSyncedAt ? <> · Synced {timeAgo(account.lastSyncedAt)}</> : null}
          </p>
        </div>
        <form action="/api/auth/tiktok/disconnect" method="POST">
          <Button type="submit" variant="ghost" size="sm">
            Disconnect
          </Button>
        </form>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<Users className="size-4" />} label="Followers" value={formatNumber(account.followerCount)} />
        <Kpi icon={<Heart className="size-4" />} label="Total likes" value={formatNumber(Number(account.likesCount))} />
        <Kpi icon={<Video className="size-4" />} label="Videos" value={formatNumber(account.videoCount)} />
        <Kpi icon={<Play className="size-4" />} label="Following" value={formatNumber(account.followingCount)} />
      </div>

      {videos.length > 0 ? (
        <Card>
          <CardHeader>
            <CardDescription className="font-mono uppercase tracking-widest text-xs">
              Recent uploads
            </CardDescription>
            <CardTitle className="text-base">Per-video performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-[11px] text-muted-foreground">
              Across the {videos.length} most recent videos: {formatNumber(totalLikes)} likes, {formatNumber(totalComments)} comments, {formatNumber(totalShares)} shares · {recentEng.toFixed(2)}% engagement
            </div>
            <div className="space-y-2">
              {videos.map((v) => (
                <VideoRow key={v.id} v={v} />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            No videos returned. If you've posted on TikTok, this can take a few minutes after connecting — try refreshing the page.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono uppercase tracking-widest mb-2">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

type VideoRowProps = {
  v: {
    id: string;
    title: string | null;
    coverImageUrl: string | null;
    shareUrl: string | null;
    durationSec: number;
    createdAtTt: Date;
    viewCount: bigint;
    likeCount: bigint;
    commentCount: bigint;
    shareCount: bigint;
  };
};

function VideoRow({ v }: VideoRowProps) {
  const views = Number(v.viewCount);
  const likes = Number(v.likeCount);
  const comments = Number(v.commentCount);
  const shares = Number(v.shareCount);
  const engagement = views > 0 ? ((likes + comments + shares) / views) * 100 : 0;
  return (
    <Link
      href={v.shareUrl ?? "#"}
      target="_blank"
      rel="noreferrer"
      className="flex items-stretch gap-3 rounded-lg border border-border bg-secondary/20 p-2 hover:bg-secondary/40 transition group"
    >
      <div className="relative h-20 w-14 shrink-0 rounded-md overflow-hidden bg-secondary">
        {v.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.coverImageUrl} alt="" className="size-full object-cover" />
        ) : null}
        <span className="absolute bottom-1 right-1 text-[10px] font-mono px-1 py-0.5 rounded bg-black/70">
          {formatDuration(v.durationSec)}
        </span>
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div className="text-sm text-foreground/95 line-clamp-2 group-hover:text-primary transition">
          {v.title || "Untitled"}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-mono text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Play className="size-3" />{formatNumber(views)}</span>
          <span className="inline-flex items-center gap-1"><Heart className="size-3" />{formatNumber(likes)}</span>
          <span className="inline-flex items-center gap-1"><MessageCircle className="size-3" />{formatNumber(comments)}</span>
          <span className="inline-flex items-center gap-1"><Share2 className="size-3" />{formatNumber(shares)}</span>
          <span>{engagement.toFixed(1)}% eng</span>
          <span className="text-muted-foreground/70">{timeAgo(v.createdAtTt)}</span>
        </div>
      </div>
    </Link>
  );
}

function ConnectCta({ connected, detail }: { connected?: string; detail?: string }) {
  const errorMap: Record<string, string> = {
    denied: "You declined the consent screen.",
    missing: "TikTok didn't return an authorization code.",
    state: "Security check failed. Try again.",
    "no-channel": "No active channel found. Reload the dashboard and try again.",
    "token-error": "Couldn't exchange the code for a token.",
    "userinfo-error": "Got the token but couldn't read your profile.",
  };
  const errMsg = connected && connected !== "ok" ? errorMap[connected] ?? `Error: ${connected}` : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-rise">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">TikTok</p>
        <h1 className="text-3xl font-semibold tracking-tight">Connect your TikTok</h1>
        <p className="text-muted-foreground mt-1">
          One-click sign-in via TikTok. We'll read your profile, follower stats, and your most recent videos so you can see growth and per-video performance over time. Read-only — we can't post on your behalf.
        </p>
      </div>

      {errMsg ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-start gap-2">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            {errMsg}
            {detail ? <div className="text-[11px] font-mono mt-1 text-destructive/80">{detail}</div> : null}
          </div>
        </div>
      ) : null}

      <Card>
        <CardContent className="py-8 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted-foreground max-w-md">
            We use TikTok's official Display API. Your data stays on this dashboard, isn't shared with anyone else, and you can disconnect at any time.
          </p>
          <Link
            href="/api/auth/tiktok/start"
            className="inline-flex items-center gap-2 rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition"
          >
            Connect TikTok <ArrowUpRight className="size-3.5" />
          </Link>
        </CardContent>
      </Card>

      <div className="text-[11px] text-muted-foreground space-y-1.5">
        <p className="font-mono uppercase tracking-widest">What we access</p>
        <ul className="list-disc list-inside space-y-0.5 pl-1">
          <li>Profile basics: username, display name, avatar, bio</li>
          <li>Aggregate stats: follower count, following, total likes, video count</li>
          <li>Public video metadata: title, cover, duration, view/like/comment/share counts</li>
        </ul>
        <p className="pt-1">No private messages. No posting. No ad data.</p>
      </div>
    </div>
  );
}

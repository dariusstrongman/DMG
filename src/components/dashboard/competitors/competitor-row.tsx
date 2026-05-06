"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trash2, ExternalLink, Users, Eye, Film, ArrowUp, ArrowDown } from "lucide-react";
import { formatNumber, timeAgo } from "@/lib/utils";
import { removeCompetitorAction } from "@/app/dashboard/competitors/actions";

type Row = {
  id: string;
  ytChannelId: string;
  title: string;
  handle: string | null;
  thumbnailUrl: string | null;
  latest: {
    capturedAt: Date | string;
    subscribers: number;
    totalViews: number;
    totalVideos: number;
  } | null;
  delta7d: { subscribers: number | null; totalViews: number | null };
};

export function CompetitorRow({ row, channelSubs }: { row: Row; channelSubs: number }) {
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!confirm(`Stop tracking ${row.title}?`)) return;
    startTransition(async () => {
      await removeCompetitorAction(row.id);
    });
  }

  const ratio = row.latest && channelSubs > 0 ? row.latest.subscribers / channelSubs : null;

  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4 flex items-start gap-4">
      {row.thumbnailUrl ? (
        <Image
          src={row.thumbnailUrl}
          alt={row.title}
          width={48}
          height={48}
          className="rounded-full ring-1 ring-border shrink-0"
        />
      ) : (
        <div className="size-12 rounded-full bg-secondary shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className="font-semibold truncate">{row.title}</h3>
          {row.handle ? (
            <span className="text-xs font-mono text-muted-foreground">{row.handle}</span>
          ) : null}
        </div>
        {row.latest ? (
          <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
            <Cell
              icon={<Users className="size-3.5" />}
              label="Subs"
              value={formatNumber(row.latest.subscribers)}
              delta={row.delta7d.subscribers}
            />
            <Cell
              icon={<Eye className="size-3.5" />}
              label="Views"
              value={formatNumber(row.latest.totalViews)}
              delta={row.delta7d.totalViews}
            />
            <Cell
              icon={<Film className="size-3.5" />}
              label="Videos"
              value={formatNumber(row.latest.totalVideos)}
            />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">Snapshot pending. Refresh in ~1 minute.</p>
        )}
        {ratio !== null && row.latest ? (
          <p className="text-xs text-muted-foreground mt-2 font-mono">
            {ratio >= 1
              ? `${ratio.toFixed(1)}x your subs`
              : `${(ratio * 100).toFixed(0)}% of your subs`}
            {" · last snapshot " + timeAgo(row.latest.capturedAt)}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1 items-end shrink-0">
        <Link
          href={`https://youtube.com/${row.handle ?? `channel/${row.ytChannelId}`}`}
          target="_blank"
          className="text-muted-foreground hover:text-primary transition inline-flex items-center gap-1 text-xs"
        >
          YouTube <ExternalLink className="size-3" />
        </Link>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-300 transition disabled:opacity-50"
        >
          <Trash2 className="size-3" /> Remove
        </button>
      </div>
    </div>
  );
}

function Cell({
  icon,
  label,
  value,
  delta,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta?: number | null;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        {icon} {label}
      </div>
      <div className="text-sm font-semibold tabular-nums mt-0.5">{value}</div>
      {delta !== undefined && delta !== null ? (
        <div
          className={`text-[10px] font-mono mt-0.5 inline-flex items-center gap-0.5 ${
            delta > 0 ? "text-emerald-300" : delta < 0 ? "text-rose-300" : "text-muted-foreground"
          }`}
        >
          {delta > 0 ? <ArrowUp className="size-2.5" /> : delta < 0 ? <ArrowDown className="size-2.5" /> : null}
          {delta >= 0 ? "+" : ""}
          {formatNumber(delta)} (7d)
        </div>
      ) : null}
    </div>
  );
}

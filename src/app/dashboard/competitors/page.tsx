import { Users } from "lucide-react";
import { after } from "next/server";
import {
  listCompetitorsWithLatest,
  refreshCompetitorSnapshots,
  getCompetitorHistory,
} from "@/lib/competitors";
import { fetchDmgSnapshot } from "@/lib/youtube";
import { getActiveChannel } from "@/lib/active-channel";
import { getSubscriberHistory } from "@/lib/snapshots";
import { AddCompetitorForm } from "@/components/dashboard/competitors/add-competitor-form";
import { CompetitorRow } from "@/components/dashboard/competitors/competitor-row";
import {
  CompetitorComparisonChart,
  CHART_COLORS,
} from "@/components/dashboard/competitors/comparison-chart";

export const metadata = { title: "Competitors" };
export const dynamic = "force-dynamic";

export default async function CompetitorsPage() {
  // Snapshot refresh hits YouTube once per competitor — push to after()
  // so the page renders from the existing rows immediately. Next view
  // will see the freshened data.
  after(async () => {
    try {
      await refreshCompetitorSnapshots();
    } catch {
      // ignore
    }
  });

  const __ch = await getActiveChannel();
  const [rows, snap] = await Promise.all([
    listCompetitorsWithLatest(),
    fetchDmgSnapshot(1, __ch.handle),
  ]);
  const channelSubs = "error" in snap ? 0 : snap.channel.subscribers;
  const channelTitle = "error" in snap ? "You" : snap.channel.title;
  const channelId = "error" in snap ? null : snap.channel.id;

  // Build comparison series: your channel + each competitor.
  const yourHistory = channelId ? await getSubscriberHistory(channelId, 90) : [];
  const competitorSeries = await Promise.all(
    rows.map(async (r, i) => ({
      name: r.title,
      color: CHART_COLORS[(i + 1) % CHART_COLORS.length], // skip 0 (reserved for "you")
      points: (await getCompetitorHistory(r.id, 90)).map((p) => ({
        capturedAt: p.capturedAt.toISOString(),
        subscribers: p.subscribers,
      })),
    }))
  );
  const series = [
    {
      name: channelTitle,
      color: CHART_COLORS[0],
      points: yourHistory.map((p) => ({
        capturedAt: p.capturedAt.toISOString(),
        subscribers: p.subscribers,
      })),
    },
    ...competitorSeries,
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-rise">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-2">
            <Users className="size-3.5" /> Competitors
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Channels you watch</h1>
          <p className="text-muted-foreground mt-1 max-w-xl">
            Track up to a dozen channels. Stats refresh hourly so you can spot what they&apos;re doing differently.
          </p>
        </div>
        <AddCompetitorForm />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-secondary/30 p-10 text-center">
          <Users className="size-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            No competitors tracked yet. Click &quot;Add competitor&quot; and paste a YouTube handle.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {rows.map((row) => (
              <CompetitorRow key={row.id} row={row} channelSubs={channelSubs} />
            ))}
          </div>

          <div>
            <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-3">
              Subscriber growth · 90d
            </h2>
            <CompetitorComparisonChart series={series} />
            <p className="text-[11px] text-muted-foreground/70 mt-2 font-mono">
              Lines fill in over the next few days as snapshots accumulate. New competitors start at the moment they&apos;re added.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

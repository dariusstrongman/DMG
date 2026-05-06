import { Users } from "lucide-react";
import {
  listCompetitorsWithLatest,
  refreshCompetitorSnapshots,
} from "@/lib/competitors";
import { fetchDmgSnapshot } from "@/lib/youtube";
import { AddCompetitorForm } from "@/components/dashboard/competitors/add-competitor-form";
import { CompetitorRow } from "@/components/dashboard/competitors/competitor-row";

export const metadata = { title: "Competitors" };
export const dynamic = "force-dynamic";

export default async function CompetitorsPage() {
  // Refresh stats up to once per hour, then load.
  await refreshCompetitorSnapshots();
  const [rows, snap] = await Promise.all([
    listCompetitorsWithLatest(),
    fetchDmgSnapshot(1),
  ]);
  const channelSubs = "error" in snap ? 0 : snap.channel.subscribers;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-rise">
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
        <div className="space-y-3">
          {rows.map((row) => (
            <CompetitorRow key={row.id} row={row} channelSubs={channelSubs} />
          ))}
        </div>
      )}
    </div>
  );
}

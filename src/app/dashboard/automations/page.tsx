import { Bell, Sparkles, Target } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Automations" };

export default function AutomationsPage() {
  return (
    <div className="max-w-3xl mx-auto animate-rise space-y-5">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-2">
          <Bell className="size-3.5" /> Automations
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Alerts & milestones</h1>
        <p className="text-muted-foreground mt-1 max-w-xl">
          Honest take: a single creator checking the dashboard daily doesn&apos;t need a separate alerts engine. The two pieces that matter most live elsewhere on this site.
        </p>
      </div>

      <Link
        href="/dashboard"
        className="block rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 transition p-5"
      >
        <div className="flex items-start gap-3">
          <Target className="size-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Goal Tracker</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Progress to the next subscriber milestone, with ETA and pace breakdown. On the Overview page.
            </p>
          </div>
        </div>
      </Link>

      <Link
        href="/dashboard/ai"
        className="block rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 transition p-5"
      >
        <div className="flex items-start gap-3">
          <Sparkles className="size-5 text-yellow-300 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Weekly AI digest</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              GPT reads the channel and surfaces what worked, what to try, what to watch. Better signal than a webhook ping.
            </p>
          </div>
        </div>
      </Link>

      <p className="text-xs text-muted-foreground font-mono pt-2">
        If you scale to multiple channels or want Discord/email pings, this page is where they&apos;d live. Holler when you need it.
      </p>
    </div>
  );
}

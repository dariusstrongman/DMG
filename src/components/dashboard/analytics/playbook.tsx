// Production playbook. Three concrete prescriptions derived from
// hits-vs-flops + posting-time analysis. Designed so the creator can
// open this card, pick one card, and start filming — no "interpret
// the chart" step.

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Calendar, Clock, Type, Video, Film } from "lucide-react";
import { productionPlaybook } from "@/lib/analytics-aggregates";
import type { VideoStats } from "@/lib/youtube";

export function Playbook({ videos, timezone }: { videos: VideoStats[]; timezone?: string }) {
  const cards = productionPlaybook(videos, timezone);

  return (
    <Card>
      <CardHeader>
        <CardDescription className="font-mono uppercase tracking-widest text-xs flex items-center gap-2">
          <Sparkles className="size-3.5" /> Production playbook
        </CardDescription>
        <CardTitle className="text-base">Three videos to make next, ranked by risk</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {cards.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Need at least 6 mature videos (14+ days old) to generate a playbook. Once you've got that base of data, this card will give you specific prescriptions: format, day, hour, title shape, the whole brief.
          </p>
        ) : (
          <div className="space-y-3">
            {cards.map((c, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2.5"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Card {i + 1}
                  </span>
                  <span className="text-[10px] font-mono text-foreground/80 bg-secondary/60 px-1.5 py-0.5 rounded">
                    {c.format === "short" ? <><Film className="size-2.5 inline mr-0.5" /> Short</> : c.format === "long" ? <><Video className="size-2.5 inline mr-0.5" /> Long</> : "Long or Short"}
                  </span>
                </div>
                <div className="text-sm text-foreground/95 font-medium">{c.topicHint}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <Field icon={<Calendar className="size-3" />} label="Post day" val={c.postingDay} />
                  <Field icon={<Clock className="size-3" />} label="Post time" val={c.postingHourLabel} />
                  <Field icon={<Type className="size-3" />} label="Title length" val={c.titleLength} />
                  <Field icon={<Type className="size-3" />} label="Title shape" val={c.titleShape} />
                </div>
                <div className="text-[11px] text-muted-foreground italic border-t border-border/60 pt-2">
                  {c.rationale}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ icon, label, val }: { icon: React.ReactNode; label: string; val: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-muted-foreground flex items-center gap-1 shrink-0">{icon}{label}:</span>
      <span className="text-foreground/90">{val}</span>
    </div>
  );
}

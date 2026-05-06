import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { listIdeas, countIdeasByStatus } from "@/lib/ideas";
import { db } from "@/lib/db";
import { IdeaCard } from "@/components/dashboard/ideas/idea-card";
import { GenerateButton } from "@/components/dashboard/ideas/generate-button";
import { ManualIdeaForm } from "@/components/dashboard/ideas/manual-idea-form";
import { ScoreUnscoredButton } from "@/components/dashboard/ideas/score-unscored-button";

export const dynamic = "force-dynamic";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "produced", label: "Produced" },
  { key: "rejected", label: "Rejected" },
] as const;

type Status = "all" | "pending" | "accepted" | "produced" | "rejected";

function isStatus(s: string | undefined): s is Status {
  return s === "all" || s === "pending" || s === "accepted" || s === "produced" || s === "rejected";
}

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status: Status = isStatus(sp.status) ? sp.status : "pending";

  const [ideas, counts, unscored] = await Promise.all([
    listIdeas({ status: status === "all" ? "all" : status }),
    countIdeasByStatus(),
    db.videoIdea.count({ where: { aiScore: null } }).catch(() => 0),
  ]);
  const total = counts.pending + counts.accepted + counts.produced + counts.rejected;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-rise">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-2">
            <Lightbulb className="size-3.5" /> Ideas
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Video ideas</h1>
          <p className="text-muted-foreground mt-1 max-w-xl">
            AI reads your last 50 uploads, learns the channel&apos;s style, then proposes new videos. Manual entries welcome.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <GenerateButton defaultCount={5} />
          <ManualIdeaForm />
        </div>
      </div>

      <ScoreUnscoredButton count={unscored} />

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        {STATUS_TABS.map((t) => {
          const active = status === t.key;
          const n = t.key === "all" ? total : counts[t.key as keyof typeof counts] ?? 0;
          return (
            <Link
              key={t.key}
              href={`/dashboard/ideas?status=${t.key}`}
              className={`px-3 py-2 text-sm border-b-2 -mb-px transition ${
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-xs font-mono text-muted-foreground/70 tabular-nums">{n}</span>
            </Link>
          );
        })}
      </div>

      {ideas.length === 0 ? (
        <div className="rounded-xl border border-border bg-secondary/30 p-10 text-center">
          <Lightbulb className="size-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            {total === 0
              ? "No ideas yet. Hit \"Generate ideas\" and the model will propose 5 fresh ones based on your channel's style."
              : `Nothing in "${status}" right now. Check another tab or generate more.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {ideas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={{
                id: idea.id,
                title: idea.title,
                hook: idea.hook,
                outline: idea.outline,
                rationale: idea.rationale,
                format: idea.format,
                tags: idea.tags,
                status: idea.status,
                source: idea.source,
                submittedBy: idea.submittedBy,
                aiScore: idea.aiScore,
                modelUsed: idea.modelUsed,
                createdAt: idea.createdAt,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

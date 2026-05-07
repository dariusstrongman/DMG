import Link from "next/link";
import { ChevronLeft, ChevronRight, Lightbulb } from "lucide-react";
import { listIdeas, countIdeasByStatus } from "@/lib/ideas";
import { db } from "@/lib/db";
import { IdeaCard } from "@/components/dashboard/ideas/idea-card";
import { GenerateButton } from "@/components/dashboard/ideas/generate-button";
import { ManualIdeaForm } from "@/components/dashboard/ideas/manual-idea-form";
import { ScoreUnscoredButton } from "@/components/dashboard/ideas/score-unscored-button";

export const dynamic = "force-dynamic";

const STATUS_TABS = [
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "produced", label: "Produced" },
  { key: "rejected", label: "Rejected" },
] as const;

type Status = "pending" | "accepted" | "produced" | "rejected";

function isStatus(s: string | undefined): s is Status {
  return s === "pending" || s === "accepted" || s === "produced" || s === "rejected";
}

const PER_PAGE = 10;

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const status: Status = isStatus(sp.status) ? sp.status : "pending";
  const pageParam = Number.parseInt(sp.page ?? "1", 10);
  const requestedPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const [list, counts, unscored] = await Promise.all([
    listIdeas({
      status,
      page: requestedPage,
      perPage: PER_PAGE,
    }),
    countIdeasByStatus(),
    db.videoIdea.count({ where: { aiScore: null } }).catch(() => 0),
  ]);
  const ideas = list.items;
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
          const n = counts[t.key];
          return (
            <Link
              key={t.key}
              href={`/dashboard/ideas?status=${t.key}&page=1`}
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
        <>
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
          <Pagination
            status={status}
            page={list.page}
            totalPages={list.totalPages}
            total={list.total}
            perPage={list.perPage}
          />
        </>
      )}
    </div>
  );
}

function Pagination({
  status,
  page,
  totalPages,
  total,
  perPage,
}: {
  status: Status;
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
}) {
  if (totalPages <= 1) {
    return (
      <p className="text-xs text-muted-foreground font-mono text-center">
        {total} idea{total === 1 ? "" : "s"}
      </p>
    );
  }

  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  // Build a windowed page list around the current page so we don't render
  // 50 buttons when there are 50 pages. Always include first + last.
  const windowSize = 1;
  const pages: Array<number | "..."> = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= windowSize) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  const linkFor = (n: number) => `/dashboard/ideas?status=${status}&page=${n}`;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
      <p className="text-xs text-muted-foreground font-mono">
        Showing {start}–{end} of {total}
      </p>
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <PageBtn href={page > 1 ? linkFor(page - 1) : null} aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </PageBtn>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`gap-${i}`} className="px-2 text-xs text-muted-foreground/60 font-mono">
              …
            </span>
          ) : (
            <PageBtn key={p} href={linkFor(p)} active={p === page}>
              {p}
            </PageBtn>
          )
        )}
        <PageBtn href={page < totalPages ? linkFor(page + 1) : null} aria-label="Next page">
          <ChevronRight className="size-4" />
        </PageBtn>
      </nav>
    </div>
  );
}

function PageBtn({
  href,
  active,
  children,
  ...rest
}: {
  href: string | null;
  active?: boolean;
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  const cls = `inline-flex items-center justify-center min-w-[34px] h-9 px-2.5 rounded text-sm transition border ${
    active
      ? "bg-primary text-primary-foreground border-primary"
      : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
  }`;
  if (!href) {
    return (
      <span className={`${cls} opacity-40 pointer-events-none`} {...rest}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}

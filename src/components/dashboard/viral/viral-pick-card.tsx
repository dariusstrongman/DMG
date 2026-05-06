import { Flame, Calendar, Clock, Image as ImageIcon, AlertTriangle, Lightbulb } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { GenerateViralPickButton } from "./generate-viral-pick-button";
import { CopyPickButton } from "./copy-pick-button";

type Pick = {
  id: string;
  title: string;
  format: "long" | "short" | "either";
  postDay: string | null;
  postTime: string | null;
  hook: string;
  outline: string;
  thumbnailConcept: string | null;
  viralThesis: string | null;
  riskNote: string | null;
  tags: string[];
  modelUsed: string | null;
  createdAt: Date | string;
};

export function ViralPickCard({ pick }: { pick: Pick | null }) {
  if (!pick) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.06] via-transparent to-emerald-500/[0.04] p-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="size-9 rounded-lg bg-primary/15 grid place-items-center">
            <Flame className="size-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-mono uppercase tracking-widest text-primary/80">Viral pick</p>
            <h2 className="text-xl font-semibold">Find the next video most likely to pop</h2>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          The model reads top performers, best posting slots, title patterns, and format mix, then proposes ONE specific pitch: title, day, time, hook, thumbnail concept, and an honest risk note.
        </p>
        <GenerateViralPickButton label="Generate viral pick" />
      </div>
    );
  }

  const fmtBadge =
    pick.format === "short"
      ? { label: "Short", cls: "text-purple-300 border-purple-500/30 bg-purple-500/10" }
      : pick.format === "long"
      ? { label: "Long-form", cls: "text-blue-300 border-blue-500/30 bg-blue-500/10" }
      : { label: "Long or Short", cls: "text-muted-foreground border-border bg-secondary" };

  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.06] via-transparent to-emerald-500/[0.04] overflow-hidden">
      <div className="p-6 pb-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="size-9 rounded-lg bg-primary/15 grid place-items-center shrink-0">
            <Flame className="size-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono uppercase tracking-widest text-primary/80 flex items-center gap-2">
              Viral pick
              <span className="text-muted-foreground/70 normal-case tracking-normal">
                · generated {timeAgo(pick.createdAt)}
              </span>
            </p>
            <h2 className="text-2xl font-semibold tracking-tight mt-1 leading-tight">{pick.title}</h2>
          </div>
        </div>

        {/* Where + when + format chips */}
        <div className="flex flex-wrap gap-2 mb-5">
          {pick.postDay ? (
            <Chip icon={<Calendar className="size-3.5" />}>{pick.postDay}</Chip>
          ) : null}
          {pick.postTime ? (
            <Chip icon={<Clock className="size-3.5" />}>{pick.postTime}</Chip>
          ) : null}
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono uppercase tracking-wider border ${fmtBadge.cls}`}>
            {fmtBadge.label}
          </span>
        </div>

        {/* Hook */}
        {pick.hook ? (
          <Block label="Hook (first 5-10 seconds)">
            <p className="text-foreground/95 leading-relaxed italic">&ldquo;{pick.hook}&rdquo;</p>
          </Block>
        ) : null}

        {/* Outline */}
        {pick.outline ? (
          <Block label="Outline">
            <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/90">{pick.outline}</pre>
          </Block>
        ) : null}

        {/* Thumbnail */}
        {pick.thumbnailConcept ? (
          <Block label="Thumbnail concept" icon={<ImageIcon className="size-3.5" />}>
            <p className="text-sm text-foreground/90">{pick.thumbnailConcept}</p>
          </Block>
        ) : null}

        {/* Why it'll work */}
        {pick.viralThesis ? (
          <Block label="Why it'll work" icon={<Lightbulb className="size-3.5 text-yellow-300" />}>
            <p className="text-sm text-foreground/90 leading-relaxed">{pick.viralThesis}</p>
          </Block>
        ) : null}

        {/* Risk */}
        {pick.riskNote ? (
          <div className="mt-4 rounded-md border border-rose-500/30 bg-rose-500/[0.04] p-3 flex gap-2 items-start">
            <AlertTriangle className="size-3.5 text-rose-300 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-rose-300/80">Honest risk</p>
              <p className="text-sm text-foreground/90 mt-0.5">{pick.riskNote}</p>
            </div>
          </div>
        ) : null}

        {/* Tags */}
        {pick.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1 mt-4">
            {pick.tags.map((t) => (
              <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="border-t border-primary/20 bg-background/30 px-5 py-3 flex items-center gap-2 flex-wrap">
        <GenerateViralPickButton label="Regenerate" small />
        <CopyPickButton pick={pick} />
        {pick.modelUsed ? (
          <span className="text-[10px] font-mono text-muted-foreground/60 ml-auto">{pick.modelUsed}</span>
        ) : null}
      </div>
    </div>
  );
}

function Block({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
        {icon} {label}
      </div>
      {children}
    </div>
  );
}

function Chip({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
      {icon}
      {children}
    </span>
  );
}

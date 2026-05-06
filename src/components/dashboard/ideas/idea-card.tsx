"use client";

import { useState, useTransition } from "react";
import {
  Check,
  X,
  Trash2,
  Clapperboard,
  RotateCcw,
  Copy,
  ChevronDown,
} from "lucide-react";
import { setStatusAction, deleteIdeaAction } from "@/app/dashboard/ideas/actions";

type IdeaRow = {
  id: string;
  title: string;
  hook: string;
  outline: string | null;
  rationale: string | null;
  format: "long" | "short" | "either";
  tags: string[];
  status: "pending" | "accepted" | "rejected" | "produced";
  source: string;
  submittedBy: string | null;
  aiScore: number | null;
  modelUsed: string | null;
  createdAt: Date;
};

const STATUS_STYLES: Record<IdeaRow["status"], string> = {
  pending: "bg-muted/30 text-muted-foreground border-border",
  accepted: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rejected: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  produced: "bg-blue-500/15 text-blue-300 border-blue-500/30",
};

const FORMAT_STYLES: Record<IdeaRow["format"], string> = {
  long: "text-blue-300",
  short: "text-purple-300",
  either: "text-muted-foreground",
};

export function IdeaCard({ idea }: { idea: IdeaRow }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function setStatus(status: IdeaRow["status"]) {
    startTransition(async () => {
      await setStatusAction(idea.id, status);
    });
  }
  function remove() {
    if (!confirm(`Delete "${idea.title}"?`)) return;
    startTransition(async () => {
      await deleteIdeaAction(idea.id);
    });
  }
  function copy() {
    const text = [
      `Title: ${idea.title}`,
      "",
      `Hook: ${idea.hook}`,
      "",
      idea.outline ? `Outline:\n${idea.outline}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-xl border border-border bg-secondary/30 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${STATUS_STYLES[idea.status]}`}
              >
                {idea.status}
              </span>
              <span className={`text-[10px] font-mono uppercase tracking-wider ${FORMAT_STYLES[idea.format]}`}>
                {idea.format === "either" ? "Long or Short" : idea.format === "long" ? "Long" : "Short"}
              </span>
              {idea.aiScore !== null ? <ScoreBadge score={idea.aiScore} /> : null}
              {idea.source === "ai" ? (
                <span className="text-[10px] font-mono uppercase tracking-wider text-primary/80 px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                  Generated
                </span>
              ) : null}
              {idea.source === "manual" && idea.submittedBy ? (
                <span className="text-[10px] font-mono text-muted-foreground/80">
                  by <span className="text-foreground/90">{idea.submittedBy}</span>
                </span>
              ) : idea.source === "manual" ? (
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 px-1.5 py-0.5 rounded bg-secondary border border-border">
                  Manual
                </span>
              ) : null}
            </div>
            <h3 className="font-semibold text-base leading-snug">{idea.title}</h3>
            {idea.hook ? (
              <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70 mr-1.5">Hook</span>
                {idea.hook}
              </p>
            ) : null}
          </div>
        </div>

        {idea.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1 mt-3">
            {idea.tags.map((t) => (
              <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
        ) : null}

        {(idea.outline || idea.rationale) ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
          >
            <ChevronDown className={`size-3.5 transition ${open ? "rotate-180" : ""}`} />
            {open ? "Hide details" : "Show details"}
          </button>
        ) : null}

        {open ? (
          <div className="mt-3 space-y-3 text-sm">
            {idea.outline ? (
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Outline</div>
                <pre className="whitespace-pre-wrap font-sans text-foreground/90">{idea.outline}</pre>
              </div>
            ) : null}
            {idea.rationale ? (
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Why this fits</div>
                <p className="text-muted-foreground">{idea.rationale}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="border-t border-border bg-background/40 px-3 py-2 flex flex-wrap items-center gap-1">
        <ActionBtn onClick={copy} disabled={pending} icon={<Copy className="size-3.5" />}>
          {copied ? "Copied" : "Copy"}
        </ActionBtn>
        {idea.status !== "accepted" ? (
          <ActionBtn
            onClick={() => setStatus("accepted")}
            disabled={pending}
            icon={<Check className="size-3.5" />}
            tone="emerald"
          >
            Accept
          </ActionBtn>
        ) : null}
        {idea.status !== "produced" ? (
          <ActionBtn
            onClick={() => setStatus("produced")}
            disabled={pending}
            icon={<Clapperboard className="size-3.5" />}
            tone="blue"
          >
            Mark produced
          </ActionBtn>
        ) : null}
        {idea.status !== "rejected" ? (
          <ActionBtn
            onClick={() => setStatus("rejected")}
            disabled={pending}
            icon={<X className="size-3.5" />}
            tone="rose"
          >
            Reject
          </ActionBtn>
        ) : (
          <ActionBtn
            onClick={() => setStatus("pending")}
            disabled={pending}
            icon={<RotateCcw className="size-3.5" />}
          >
            Reopen
          </ActionBtn>
        )}
        <ActionBtn
          onClick={remove}
          disabled={pending}
          icon={<Trash2 className="size-3.5" />}
          tone="rose"
          className="ml-auto"
        >
          Delete
        </ActionBtn>
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 8 ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" :
    score >= 6 ? "border-blue-500/40 bg-blue-500/10 text-blue-300" :
    score >= 4 ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-300" :
    "border-rose-500/40 bg-rose-500/10 text-rose-300";
  return (
    <span
      title={`AI score · predicted viral potential for this channel`}
      className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${tone}`}
    >
      AI <span className="font-semibold">{score}/10</span>
    </span>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
  icon,
  tone,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  tone?: "emerald" | "rose" | "blue";
  className?: string;
}) {
  const toneClass =
    tone === "emerald" ? "hover:bg-emerald-500/10 hover:text-emerald-300" :
    tone === "rose" ? "hover:bg-rose-500/10 hover:text-rose-300" :
    tone === "blue" ? "hover:bg-blue-500/10 hover:text-blue-300" :
    "hover:bg-secondary hover:text-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground transition disabled:opacity-50 ${toneClass} ${className ?? ""}`}
    >
      {icon}
      {children}
    </button>
  );
}

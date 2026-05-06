"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

type Pick = {
  title: string;
  postDay: string | null;
  postTime: string | null;
  format: string;
  hook: string;
  outline: string;
  thumbnailConcept: string | null;
  viralThesis: string | null;
  riskNote: string | null;
  tags: string[];
};

export function CopyPickButton({ pick }: { pick: Pick }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    const text = [
      `Title: ${pick.title}`,
      pick.postDay || pick.postTime ? `Post: ${[pick.postDay, pick.postTime].filter(Boolean).join(" ")}` : "",
      `Format: ${pick.format}`,
      "",
      pick.hook ? `HOOK\n"${pick.hook}"` : "",
      pick.outline ? `\nOUTLINE\n${pick.outline}` : "",
      pick.thumbnailConcept ? `\nTHUMBNAIL\n${pick.thumbnailConcept}` : "",
      pick.viralThesis ? `\nWHY IT WORKS\n${pick.viralThesis}` : "",
      pick.riskNote ? `\nRISK\n${pick.riskNote}` : "",
      pick.tags.length ? `\nTAGS: ${pick.tags.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition"
    >
      {copied ? <Check className="size-3.5 text-emerald-300" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy as brief"}
    </button>
  );
}

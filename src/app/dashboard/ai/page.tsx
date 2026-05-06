import { Sparkles, AlertTriangle, Lightbulb, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLatestWeeklyDigest } from "@/lib/ai-digest";
import { GenerateDigestButton } from "@/components/dashboard/ai/generate-digest-button";
import { timeAgo } from "@/lib/utils";

export const metadata = { title: "AI Insights" };
export const dynamic = "force-dynamic";

type Details = {
  observations?: string[];
  recommendations?: string[];
  concerns?: string[];
};

export default async function AiPage() {
  const latest = await getLatestWeeklyDigest();
  const details = (latest?.details ?? {}) as Details;
  const observations = Array.isArray(details.observations) ? details.observations : [];
  const recommendations = Array.isArray(details.recommendations) ? details.recommendations : [];
  const concerns = Array.isArray(details.concerns) ? details.concerns : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-rise">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-2">
            <Sparkles className="size-3.5" /> AI Insights
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Weekly digest</h1>
          <p className="text-muted-foreground mt-1 max-w-xl">
            GPT reads the channel&apos;s last 7 days and writes a focused brief: what worked, what to try, what to watch.
          </p>
        </div>
        <GenerateDigestButton label={latest ? "Regenerate" : "Generate weekly digest"} />
      </div>

      {!latest ? (
        <div className="rounded-xl border border-border bg-secondary/30 p-10 text-center">
          <Sparkles className="size-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            No digest yet. Click &quot;Generate weekly digest&quot; to create the first one. Costs &lt;$0.01 in tokens.
          </p>
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardDescription className="font-mono uppercase tracking-widest text-xs">
                Summary · generated {timeAgo(latest.createdAt)} · {latest.modelUsed}
              </CardDescription>
              <CardTitle className="text-base leading-relaxed font-medium">
                {latest.summary || "No summary content."}
              </CardTitle>
            </CardHeader>
          </Card>

          <Section
            icon={<Eye className="size-4 text-blue-300" />}
            title="What we observed"
            items={observations}
          />
          <Section
            icon={<Lightbulb className="size-4 text-yellow-300" />}
            title="What to try"
            items={recommendations}
            tone="primary"
          />
          {concerns.length > 0 ? (
            <Section
              icon={<AlertTriangle className="size-4 text-rose-300" />}
              title="Watch out for"
              items={concerns}
              tone="rose"
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  items,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  tone?: "primary" | "rose";
}) {
  if (items.length === 0) return null;
  const ringClass =
    tone === "primary"
      ? "ring-primary/30 bg-primary/[0.04]"
      : tone === "rose"
      ? "ring-rose-500/30 bg-rose-500/[0.04]"
      : "ring-border bg-secondary/30";
  return (
    <div className={`rounded-xl ring-1 ${ringClass} p-5`}>
      <div className="flex items-center gap-2 mb-3 text-sm font-mono uppercase tracking-widest text-muted-foreground">
        {icon} {title}
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm flex gap-2">
            <span className="text-muted-foreground/70 mt-0.5">·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

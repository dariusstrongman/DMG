import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export function ComingSoon({
  title,
  blurb
}: {
  title: string;
  blurb: string;
}) {
  return (
    <div className="max-w-3xl mx-auto py-12 animate-rise">
      <Card>
        <CardContent className="p-10 text-center">
          <div className="size-12 rounded-xl bg-primary/10 grid place-items-center mx-auto mb-5">
            <Sparkles className="size-6 text-primary" />
          </div>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
            Pass 2
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto leading-relaxed">
            {blurb}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

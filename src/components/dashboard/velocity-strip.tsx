import { Users, Eye } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import type { DeltaWindow } from "@/lib/snapshots";

const LABELS: Record<number, string> = {
  24: "24h",
  [7 * 24]: "7d",
  [30 * 24]: "30d",
};

export function VelocityStrip({ deltas }: { deltas: DeltaWindow[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {deltas.map((d) => (
        <div key={d.windowHours} className="rounded-xl border border-border bg-secondary/30 p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
            Velocity · {LABELS[d.windowHours] ?? `${d.windowHours}h`}
          </div>
          <div className="space-y-1.5">
            <Row icon={<Users className="size-3.5" />} value={d.subsDelta} unit="subs" />
            <Row icon={<Eye className="size-3.5" />} value={d.viewsDelta} unit="views" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Row({ icon, value, unit }: { icon: React.ReactNode; value: number | null; unit: string }) {
  if (value === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon} <span className="font-mono">— {unit}</span>
      </div>
    );
  }
  const sign = value > 0 ? "+" : value < 0 ? "" : "";
  const cls =
    value > 0 ? "text-emerald-300" :
    value < 0 ? "text-rose-300" :
    "text-foreground";
  return (
    <div className={`flex items-center gap-2 text-sm tabular-nums ${cls}`}>
      {icon}
      <span className="font-semibold">{sign}{formatNumber(value)}</span>
      <span className="text-muted-foreground">{unit}</span>
    </div>
  );
}

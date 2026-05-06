import { ComingSoon } from "@/components/dashboard/coming-soon";

export const metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <ComingSoon
      title="Channel analytics"
      blurb="Growth over time, top videos, traffic sources, audience geography, devices, retention trends. Driven by daily snapshots from the YouTube Analytics API. Ships in Pass 2."
    />
  );
}

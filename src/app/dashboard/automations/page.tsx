import { ComingSoon } from "@/components/dashboard/coming-soon";

export const metadata = { title: "Automations" };

export default function AutomationsPage() {
  return (
    <ComingSoon
      title="Automations"
      blurb="Discord pings on viral spikes. Email reports on milestones. Webhooks when CTR drops below threshold. Daily, weekly, monthly AI summaries. Ships in Pass 3."
    />
  );
}

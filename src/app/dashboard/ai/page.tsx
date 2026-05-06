import { ComingSoon } from "@/components/dashboard/coming-soon";

export const metadata = { title: "AI Insights" };

export default function AiPage() {
  return (
    <ComingSoon
      title="AI virality engine"
      blurb="Score titles, hooks, thumbnails, and transcripts. Get concrete, actionable suggestions from GPT-4. Predict performance before you publish. Ships in Pass 3."
    />
  );
}

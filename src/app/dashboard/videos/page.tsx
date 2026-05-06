import { ComingSoon } from "@/components/dashboard/coming-soon";

export const metadata = { title: "Videos" };

export default function VideosPage() {
  return (
    <ComingSoon
      title="Video analytics"
      blurb="Searchable, sortable table of every video on connected channels — with CTR, retention, traffic sources, AI summary, and virality score. Ships in Pass 2."
    />
  );
}

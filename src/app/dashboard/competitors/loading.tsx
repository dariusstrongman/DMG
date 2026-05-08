export default function CompetitorsLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-28 rounded bg-secondary/60" />
        <div className="h-7 w-52 rounded bg-secondary/60" />
      </div>
      <div className="rounded-xl border border-border bg-secondary/20 h-72" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-secondary/20 h-16" />
        ))}
      </div>
    </div>
  );
}

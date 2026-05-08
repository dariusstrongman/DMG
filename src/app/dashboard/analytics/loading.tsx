export default function AnalyticsLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-32 rounded bg-secondary/60" />
        <div className="h-7 w-64 rounded bg-secondary/60" />
        <div className="h-3 w-44 rounded bg-secondary/40" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass rounded-xl p-5 space-y-3">
            <div className="h-3 w-24 rounded bg-secondary/60" />
            <div className="h-7 w-20 rounded bg-secondary/70" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-secondary/20 h-72" />
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-secondary/20 h-56" />
        <div className="rounded-xl border border-border bg-secondary/20 h-72" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-secondary/20 h-56" />
          <div className="rounded-xl border border-border bg-secondary/20 h-56" />
        </div>
      </div>
    </div>
  );
}

export default function TiktokLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="size-14 rounded-full bg-secondary/60" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 rounded bg-secondary/60" />
          <div className="h-7 w-48 rounded bg-secondary/60" />
          <div className="h-3 w-72 rounded bg-secondary/40" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass rounded-xl p-5 space-y-3">
            <div className="h-3 w-24 rounded bg-secondary/60" />
            <div className="h-7 w-20 rounded bg-secondary/70" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-secondary/20 p-5 space-y-3">
        <div className="h-4 w-40 rounded bg-secondary/60" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-secondary/20 h-20" />
        ))}
      </div>
    </div>
  );
}

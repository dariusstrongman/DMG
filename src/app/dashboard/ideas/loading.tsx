export default function IdeasLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[260px] space-y-2">
          <div className="h-3 w-16 rounded bg-secondary/60" />
          <div className="h-7 w-32 rounded bg-secondary/60" />
        </div>
        <div className="h-9 w-32 rounded bg-secondary/60" />
      </div>
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-28 rounded-md bg-secondary/40" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-secondary/20 h-44" />
        ))}
      </div>
    </div>
  );
}

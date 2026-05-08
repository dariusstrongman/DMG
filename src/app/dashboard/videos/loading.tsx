export default function VideosLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-20 rounded bg-secondary/60" />
        <div className="h-7 w-44 rounded bg-secondary/60" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-secondary/20 h-20" />
        ))}
      </div>
    </div>
  );
}

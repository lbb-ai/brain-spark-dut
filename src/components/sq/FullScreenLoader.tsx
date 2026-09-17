export function FullScreenLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-background">
      <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
        <div className="size-10 animate-spin rounded-full border-4 border-primary/25 border-t-primary" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Award, Gamepad2 } from "lucide-react";
import { BAND_META } from "@/lib/sq/analysis";
import type { Band } from "@/lib/sq/types";

export function Card({
  children,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  return <As className={cn("card-base p-5", className)}>{children}</As>;
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-xl font-bold">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Meter({
  value,
  label,
  tone = "primary",
}: {
  value: number;
  label?: string;
  tone?: "primary" | "success" | "warning" | "destructive" | "cyan";
}) {
  const bg = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
    cyan: "bg-cyan",
  }[tone];
  return (
    <div>
      {label && (
        <div className="mb-1 flex justify-between text-xs font-medium text-muted-foreground">
          <span>{label}</span>
          <span>{Math.round(value)}%</span>
        </div>
      )}
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "progress"}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500", bg)}
          style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

export function BandChip({ band, className }: { band: Band; className?: string }) {
  const meta = BAND_META[band];
  const icon = band === "low" ? "✓" : band === "moderate" ? "!" : "▲";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        meta.chip,
        className,
      )}
    >
      <span aria-hidden>{icon}</span>
      {meta.label}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="card-base p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-display text-2xl font-bold", tone)}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "rounded-xl border border-border bg-muted/60 p-4 text-sm text-muted-foreground",
        className,
      )}
    >
      <strong className="text-foreground">Please read: </strong>
      This result is a screening indicator, not a medical or psychological diagnosis. If you have
      concerns about your learning experience, consider contacting the Durban University of
      Technology Disability Unit for professional assessment and support.
    </p>
  );
}

export function BadgePill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary">
      <Award className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="card-base flex flex-col items-center gap-3 p-10 text-center">
      <Gamepad2 className="h-8 w-8 text-primary" aria-hidden />
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}

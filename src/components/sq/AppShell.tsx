import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useSq, levelFromXp } from "@/lib/sq/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";

interface NavItem {
  to: string;
  label: string;
}

const STUDENT_NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/play", label: "Play" },
  { to: "/report", label: "My Report" },
  { to: "/history", label: "History" },
  { to: "/profile", label: "Profile" },
];

const STAFF_NAV: NavItem[] = [
  { to: "/staff", label: "Caseload" },
  { to: "/settings", label: "Settings" },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Admin" },
  { to: "/staff", label: "Caseload" },
  { to: "/settings", label: "Settings" },
];

export function AppShell({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  const { currentUser, progress, logout } = useSq();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  const nav =
    currentUser?.role === "admin"
      ? ADMIN_NAV
      : currentUser?.role === "staff"
        ? STAFF_NAV
        : [...STUDENT_NAV, { to: "/settings", label: "Settings" }];

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#main"
        className="sr-only-focusable focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-card/85 backdrop-blur">
        <div
          className={cn(
            "mx-auto flex h-16 items-center gap-3 px-4 sm:px-6",
            wide ? "max-w-[1400px]" : "max-w-6xl",
          )}
        >
          <Link to="/" className="flex items-center gap-2" aria-label="SkillQuest home">
            <Logo />
            <span className="font-display text-lg font-bold tracking-tight">SkillQuest</span>
          </Link>

          <nav
            aria-label="Main"
            className="ml-6 hidden items-center gap-1 md:flex"
          >
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  pathname === item.to && "bg-primary/10 text-primary",
                )}
                aria-current={pathname === item.to ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {currentUser?.role === "student" && (
              <div className="hidden items-center gap-3 rounded-full border border-border bg-muted/60 px-3 py-1.5 text-xs font-semibold sm:flex">
                <span className="text-primary">Lv {levelFromXp(progress.xp)}</span>
                <span className="text-muted-foreground">{progress.xp} XP</span>
                <span className="flex items-center gap-1 text-warning">
                  {progress.streak}
                  <Flame className="h-3.5 w-3.5" aria-hidden />
                </span>
              </div>
            )}
            {currentUser ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  logout();
                  navigate({ to: "/" });
                }}
              >
                Sign out
              </Button>
            ) : (
              <Button size="sm" onClick={() => navigate({ to: "/login" })}>
                Sign in
              </Button>
            )}
            <button
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-lg border border-border md:hidden"
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              <span aria-hidden>{open ? "✕" : "☰"}</span>
            </button>
          </div>
        </div>
        {open && (
          <nav aria-label="Mobile" className="border-t border-border bg-card px-4 py-2 md:hidden">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main
        id="main"
        className={cn("mx-auto w-full flex-1 px-4 py-8 sm:px-6", wide ? "max-w-[1400px]" : "max-w-6xl")}
      >
        {children}
      </main>

      <footer className="border-t border-border bg-card/60 py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-xs text-muted-foreground sm:px-6">
          <p>
            SkillQuest is a screening companion built for the Durban University of Technology
            Disability Unit. It does not diagnose any condition.
          </p>
          <p>Gameplay data is handled in line with POPIA principles. You control what is shared.</p>
        </div>
      </footer>
    </div>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 place-items-center rounded-xl font-display text-sm font-bold text-white",
        className,
      )}
      style={{ backgroundImage: "var(--gradient-violet)" }}
    >
      SQ
    </span>
  );
}

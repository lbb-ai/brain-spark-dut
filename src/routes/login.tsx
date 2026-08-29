import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSq } from "@/lib/sq/store";
import { Logo } from "@/components/sq/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — SkillQuest | DUT" },
      {
        name: "description",
        content: "Sign in to SkillQuest to continue your screening quest, XP and skill profile.",
      },
      { property: "og:title", content: "Sign in — SkillQuest" },
      { property: "og:description", content: "Continue your SkillQuest screening progress." },
    ],
  }),
  component: LoginPage,
});

const DEMO = [
  { email: "22001234@dut4life.ac.za", label: "Student · Lindiwe" },
  { email: "staff@dut.ac.za", label: "Disability Unit staff" },
  { email: "admin@dut.ac.za", label: "Administrator" },
];

function LoginPage() {
  const { login } = useSq();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (value: string) => {
    const user = login(value);
    if (!user) {
      setError("We couldn't find an account with that email. Check the address or register below.");
      return;
    }
    navigate({
      to: user.role === "student" ? "/dashboard" : user.role === "staff" ? "/staff" : "/admin",
    });
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="surface-night hidden flex-col justify-between p-10 lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
          <span className="font-display text-lg font-bold text-white">SkillQuest</span>
        </Link>
        <div>
          <h1 className="font-display text-4xl font-black leading-tight text-white">
            Welcome back.
            <br />
            <span className="text-gradient">Your streak is waiting.</span>
          </h1>
          <p className="mt-4 max-w-md text-white/70">
            Pick up where you left off — the games adapt to how you played last time.
          </p>
        </div>
        <p className="text-xs text-white/50">
          Screening indicator only. Not a medical or psychological diagnosis.
        </p>
      </div>

      <main className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <Logo />
            <span className="font-display text-lg font-bold">SkillQuest</span>
          </Link>
          <h2 className="font-display text-3xl font-bold">Sign in</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Use your DUT email address to continue.
          </p>

          <form
            className="mt-8 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              if (!email.trim()) {
                setError("Please enter your email address.");
                return;
              }
              submit(email);
            }}
          >
            <div>
              <Label htmlFor="email">DUT email address</Label>
              <Input
                id="email"
                type="email"
                className="mt-1.5 h-12"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                aria-describedby={error ? "login-error" : undefined}
                aria-invalid={!!error}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                className="mt-1.5 h-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Demo build: any password works.
              </p>
            </div>

            {error && (
              <p
                id="login-error"
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive"
              >
                <span aria-hidden>⚠ </span>
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="h-12 w-full">
              Sign in
            </Button>
          </form>

          <div className="mt-8 rounded-xl border border-border bg-muted/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Demo accounts
            </p>
            <div className="mt-3 grid gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => submit(d.email)}
                  className="flex min-h-11 items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-left text-sm transition-colors hover:border-primary"
                >
                  <span className="font-medium">{d.label}</span>
                  <span className="text-xs text-muted-foreground">{d.email}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/register" className="font-semibold text-primary underline-offset-2 hover:underline">
              Create a student account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

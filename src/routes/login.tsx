import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSq } from "@/lib/sq/store";
import { supabase } from "@/integrations/supabase/client";
import { seedDemoAccountsClient } from "@/lib/sq/seed-demo-accounts";
import { Logo } from "@/components/sq/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO_ACCOUNTS = [
  { label: "Student", email: "demo.student@dut4life.ac.za", password: "SkillQuestDemo1!" },
  { label: "Staff", email: "demo.staff@dut4life.ac.za", password: "SkillQuestDemo1!" },
  { label: "Admin", email: "demo.admin@dut4life.ac.za", password: "SkillQuestDemo1!" },
];

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

/** Map raw Supabase auth errors to warm, plain-language messages. */
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "That email and password don't match. Double-check both and try again.";
  if (m.includes("email not confirmed"))
    return "You need to confirm your email before signing in. Check your inbox for a verification link — it may be in your spam folder.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts in a short time. Please wait a minute before trying again.";
  if (m.includes("user already registered"))
    return "An account with this email already exists. Try signing in instead.";
  return message;
}

function LoginPage() {
  const { login } = useSq();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "reset">("signin");
  const [resetSent, setResetSent] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMsg("");
    try {
      const { results, needsConfirmation } = await seedDemoAccountsClient();
      const ok = results.filter((r) => r.status === "ok").length;
      const exists = results.filter((r) => r.status === "exists").length;
      const fail = results.filter((r) => r.status === "error");
      if (needsConfirmation) {
        setSeedMsg(
          `Accounts created but email confirmation is enabled in Supabase. Disable it in Supabase → Authentication → Providers → Email, or confirm each account via email.`,
        );
      } else if (fail.length === 0) {
        const total = ok + exists;
        setSeedMsg(
          `✓ ${total} demo account${total === 1 ? "" : "s"} ready (${ok} created, ${exists} already existed). You can sign in now.`,
        );
      } else {
        setSeedMsg(`✓ ${ok} created, ${exists} existed, ${fail.length} failed. Check console for details.`);
        console.error("Demo account seeding failures:", fail);
      }
    } catch (err) {
      setSeedMsg("Could not create demo accounts. See console for details.");
      console.error(err);
    }
    setSeeding(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "reset") {
      if (!email.trim()) {
        setError("Enter your email address and we'll send a reset link.");
        return;
      }
      setLoading(true);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });
      setLoading(false);
      if (resetError) {
        setError(friendlyAuthError(resetError.message));
        return;
      }
      setResetSent(true);
      return;
    }

    if (!email.trim() || !password) {
      setError("Please enter both your email and password.");
      return;
    }

    setLoading(true);
    const { user, error: loginError } = await login(email.trim(), password);
    setLoading(false);

    if (loginError) {
      setError(friendlyAuthError(loginError));
      return;
    }
    if (!user) {
      setError("Sign in failed. Please try again.");
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

          {mode === "reset" && resetSent ? (
            <div className="rounded-xl border border-success/30 bg-success/8 p-6 text-center">
              <h2 className="font-display text-2xl font-bold">Check your email</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                If an account exists for <strong>{email}</strong>, we've sent a password reset
                link. Click the link in the email to choose a new password.
              </p>
              <Button
                className="mt-6 w-full"
                variant="outline"
                onClick={() => {
                  setMode("signin");
                  setResetSent(false);
                  setPassword("");
                }}
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <h2 className="font-display text-3xl font-bold">
                {mode === "reset" ? "Reset your password" : "Sign in"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === "reset"
                  ? "Enter your email and we'll send you a link to set a new password."
                  : "Use your university email address to continue."}
              </p>

              <form className="mt-8 space-y-5" onSubmit={submit}>
                <div>
                  <Label htmlFor="email">Email address</Label>
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

                {mode === "signin" && (
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button
                        type="button"
                        className="text-xs text-primary underline-offset-2 hover:underline"
                        onClick={() => {
                          setMode("reset");
                          setError("");
                        }}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      className="mt-1.5 h-12"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      aria-describedby={error ? "login-error" : undefined}
                      aria-invalid={!!error}
                    />
                  </div>
                )}

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

                <Button type="submit" size="lg" className="h-12 w-full" disabled={loading}>
                  {loading
                    ? "Please wait…"
                    : mode === "reset"
                      ? "Send reset link"
                      : "Sign in"}
                </Button>
              </form>

              {mode === "reset" && (
                <button
                  type="button"
                  className="mt-4 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setMode("signin");
                    setError("");
                    setResetSent(false);
                  }}
                >
                  ← Back to sign in
                </button>
              )}

              {mode === "signin" && (
                <>
                  <p className="mt-6 text-sm text-muted-foreground">
                    New here?{" "}
                    <Link
                      to="/register"
                      className="font-semibold text-primary underline-offset-2 hover:underline"
                    >
                      Create a student account
                    </Link>
                  </p>
                  <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Demo accounts
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Click to fill credentials, then sign in.
                    </p>
                    <div className="mt-3 space-y-2">
                      {DEMO_ACCOUNTS.map((acc) => (
                        <button
                          key={acc.label}
                          type="button"
                          className="flex w-full items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent"
                          onClick={() => {
                            setEmail(acc.email);
                            setPassword(acc.password);
                          }}
                        >
                          <span className="font-medium">{acc.label}</span>
                          <span className="text-xs text-muted-foreground">{acc.email}</span>
                        </button>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full"
                      disabled={seeding}
                      onClick={handleSeed}
                    >
                      {seeding ? "Creating…" : "Create demo accounts"}
                    </Button>
                    {seedMsg && (
                      <p className="mt-2 text-xs text-muted-foreground">{seedMsg}</p>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

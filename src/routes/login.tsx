import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSq } from "@/lib/sq/store";
import { supabase } from "@/integrations/supabase/client";
import { seedDemoAccountsClient } from "@/lib/sq/seed-demo-accounts";
import { Logo } from "@/components/sq/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ADMIN_EMAIL = "22418104@dut4life.ac.za";
const ADMIN_NAME = "Mr Bhengu";
const DEMO_ACCOUNTS = [
  { role: "student", label: "Lindiwe Mkhize", email: "demo.lindiwe@dut4life.ac.za", password: "SkillQuestDemo1!" },
  { role: "student", label: "Sipho Ndlovu", email: "demo.sipho@dut4life.ac.za", password: "SkillQuestDemo1!" },
  { role: "student", label: "Nomvula Dube", email: "demo.nomvula@dut4life.ac.za", password: "SkillQuestDemo1!" },
  { role: "student", label: "Thabo Zwane", email: "demo.thabo@dut4life.ac.za", password: "SkillQuestDemo1!" },
  { role: "staff", label: "Zanele Khumalo", email: "demo.staff@dut4life.ac.za", password: "SkillQuestDemo1!" },
  { role: "admin", label: "Nomsa Dlamini", email: "demo.nomsa@dut4life.ac.za", password: "SkillQuestDemo1!" },
] as const;

type SignInRole = "student" | "staff" | "admin";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — SkillQuest | DUT" }] }),
  component: LoginPage,
});

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match. Double-check both and try again.";
  if (m.includes("email not confirmed")) return "Confirm your email before signing in, then try again.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts in a short time. Please wait a minute before trying again.";
  return message;
}

function LoginPage() {
  const { login, logout } = useSq();
  const navigate = useNavigate();
  const [role, setRole] = useState<SignInRole>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "reset">("signin");
  const [resetSent, setResetSent] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");

  const chooseRole = (nextRole: SignInRole) => {
    setRole(nextRole);
    setError("");
    if (nextRole === "admin") {
      setEmail(ADMIN_EMAIL);
      setPassword("");
      return;
    }

    const account = DEMO_ACCOUNTS.find((a) => a.role === nextRole && a.label !== "Nomsa Dlamini");
    if (account) {
      setEmail(account.email);
      setPassword(account.password);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMsg("");
    try {
      const { results, needsConfirmation } = await seedDemoAccountsClient();
      const ok = results.filter((r) => r.status === "ok").length;
      const exists = results.filter((r) => r.status === "exists").length;
      const fail = results.filter((r) => r.status === "error");
      if (needsConfirmation) setSeedMsg("Accounts created, but email confirmation is enabled in Supabase.");
      else if (!fail.length) setSeedMsg(`✓ ${ok + exists} demo account${ok + exists === 1 ? "" : "s"} ready.`);
      else setSeedMsg(`✓ ${ok} created, ${exists} existed, ${fail.length} failed. Check the console.`);
      if (fail.length) console.error("Demo account seeding failures:", fail);
    } catch (err) {
      setSeedMsg("Could not create demo accounts. See console for details.");
      console.error(err);
    } finally {
      setSeeding(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "reset") {
      if (!email.trim()) return setError("Enter your email address and we'll send a reset link.");
      setLoading(true);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/login` });
      setLoading(false);
      if (resetError) return setError(friendlyAuthError(resetError.message));
      setResetSent(true);
      return;
    }

    if (!email.trim() || !password) return setError("Please enter both your email and password.");
    if (role === "admin" && email.trim().toLowerCase() !== ADMIN_EMAIL) {
      return setError(`Only ${ADMIN_EMAIL} can sign in as administrator.`);
    }

    setLoading(true);
    const { user, error: loginError } = await login(email.trim(), password);
    setLoading(false);

    if (loginError) return setError(friendlyAuthError(loginError));
    if (!user) return setError("Sign in failed. Please try again.");

    if (role === "admin" && (user.email.toLowerCase() !== ADMIN_EMAIL || user.role !== "admin")) {
      await logout();
      return setError("This account is not authorised for administrator access.");
    }

    if (role !== "admin" && user.role === "admin") {
      await logout();
      return setError("Administrator accounts must use the administrator sign-in option.");
    }

    navigate({ to: user.role === "student" ? "/dashboard" : user.role === "staff" ? "/staff" : "/admin" });
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
        <p className="text-xs text-white/50">Screening indicator only. Not a medical or psychological diagnosis.</p>
      </div>

      <main className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <Logo />
            <span className="font-display text-lg font-bold">SkillQuest</span>
          </Link>

          {mode === "reset" && resetSent ? (
            <div className="mt-8 rounded-xl border border-success/30 bg-success/8 p-6 text-center">
              <h3 className="font-display text-xl font-bold">Check your email</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                If an account exists for <strong>{email}</strong>, we've sent a reset link.
              </p>
              <Button
                className="mt-6 w-full"
                variant="outline"
                onClick={() => {
                  setMode("signin");
                  setResetSent(false);
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
                {mode === "reset" ? "Enter your email and we'll send you a link." : "Choose how you want to sign in."}
              </p>

              {mode === "signin" && (
                <div className="mt-6 grid grid-cols-3 gap-2" role="group" aria-label="Sign in as">
                  <button type="button" className={`rounded-lg border px-3 py-3 text-sm font-semibold ${role === "student" ? "border-primary bg-primary/10 text-primary" : "border-border"}`} onClick={() => chooseRole("student")}>Student</button>
                  <button type="button" className={`rounded-lg border px-3 py-3 text-sm font-semibold ${role === "staff" ? "border-primary bg-primary/10 text-primary" : "border-border"}`} onClick={() => chooseRole("staff")}>Staff</button>
                  <button type="button" className={`rounded-lg border px-3 py-3 text-sm font-semibold ${role === "admin" ? "border-primary bg-primary/10 text-primary" : "border-border"}`} onClick={() => chooseRole("admin")}>Admin</button>
                </div>
              )}

              {mode === "signin" && role === "admin" && (
                <p className="mt-3 rounded-lg border border-warning/30 bg-warning/8 px-3 py-2 text-xs text-muted-foreground">
                  Administrator access is restricted to {ADMIN_NAME} ({ADMIN_EMAIL}).
                </p>
              )}

              <form className="mt-8 space-y-5" onSubmit={submit} noValidate>
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    className="mt-1.5 h-12"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
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
                    />
                  </div>
                )}

                {error && (
                  <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive">
                    <span aria-hidden>⚠ </span>
                    {error}
                  </p>
                )}

                <Button type="submit" size="lg" className="h-12 w-full" disabled={loading}>
                  {loading ? "Please wait…" : mode === "reset" ? "Send reset link" : `Sign in as ${role === "admin" ? ADMIN_NAME : role}`}
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
                    New here? <Link to="/register" className="font-semibold text-primary underline-offset-2 hover:underline">Create a student account</Link>
                  </p>
                  <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Demo accounts</p>
                    <p className="mt-1 text-xs text-muted-foreground">Realistic named demo profiles with play history for staff screening review.</p>
                    <div className="mt-3 space-y-2">
                      {DEMO_ACCOUNTS.map((acc) => (
                        <button
                          key={acc.email}
                          type="button"
                          className="flex w-full items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent"
                          onClick={() => {
                            setRole(acc.role);
                            setEmail(acc.email);
                            setPassword(acc.password);
                          }}
                        >
                          <span className="font-medium">{acc.label}</span>
                          <span className="text-xs text-muted-foreground">{acc.email}</span>
                        </button>
                      ))}
                    </div>
                    <Button type="button" variant="outline" size="sm" className="mt-3 w-full" disabled={seeding} onClick={handleSeed}>
                      {seeding ? "Creating…" : "Create demo accounts"}
                    </Button>
                    {seedMsg && <p className="mt-2 text-xs text-muted-foreground">{seedMsg}</p>}
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

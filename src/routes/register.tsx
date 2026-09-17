import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useSq } from "@/lib/sq/store";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/sq/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your account — SkillQuest | DUT" },
      {
        name: "description",
        content:
          "Register a SkillQuest student account to play the six screening game domains and build your skill profile.",
      },
      { property: "og:title", content: "Create your SkillQuest account" },
      {
        property: "og:description",
        content: "Join the gamified screening companion and start your first quest.",
      },
    ],
  }),
  component: RegisterPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(80),
  email: z.string().trim().email("Enter a valid email address").max(120),
  studentNumber: z
    .string()
    .trim()
    .regex(/^\d{6,10}$/, "Student number should be 6–10 digits"),
  faculty: z.string().trim().min(2, "Choose your faculty"),
  yearOfStudy: z.string().trim().min(1, "Choose your year of study"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const FACULTIES = [
  "Accounting & Informatics",
  "Applied Sciences",
  "Arts & Design",
  "Engineering & Built Environment",
  "Health Sciences",
  "Management Sciences",
];

function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered"))
    return "An account with this email already exists. Try signing in instead.";
  if (m.includes("password") && m.includes("weak"))
    return "Please choose a stronger password (at least 8 characters).";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts. Please wait a minute before trying again.";
  return message;
}

function RegisterPage() {
  const { register } = useSq();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    studentNumber: "",
    faculty: "",
    yearOfStudy: "",
    password: "",
  });
  const [consentData, setConsentData] = useState(false);
  const [consentShare, setConsentShare] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    const parsed = schema.safeParse(form);
    const next: Record<string, string> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
    }
    if (!consentData) next["consent"] = "We need your consent to record gameplay data before you play.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    const { error, needsEmailConfirmation } = await register({
      name: form.name,
      email: form.email,
      password: form.password,
      studentNumber: form.studentNumber,
      faculty: form.faculty,
      yearOfStudy: form.yearOfStudy,
      consentShare,
    });
    setLoading(false);

    if (error) {
      setServerError(friendlyError(error));
      return;
    }
    if (needsEmailConfirmation) {
      setEmailSent(true);
      return;
    }
    navigate({ to: "/dashboard" });
  };

  if (emailSent) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background px-4">
        <div className="w-full max-w-md text-center">
          <Logo className="mx-auto" />
          <h1 className="mt-6 font-display text-3xl font-bold">Check your email</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            We've sent a verification link to <strong>{form.email}</strong>. Click the link in the
            email to confirm your account, then sign in. The link may take a few minutes to arrive
            and could land in your spam folder.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button asChild size="lg">
              <Link to="/login">Go to sign in</Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                await supabase.auth.resend({ type: "signup", email: form.email });
                setLoading(false);
              }}
            >
              {loading ? "Sending…" : "Resend verification email"}
            </Button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Wrong email address?{" "}
            <button
              type="button"
              className="font-semibold text-primary underline-offset-2 hover:underline"
              onClick={() => setEmailSent(false)}
            >
              Go back and edit
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[0.9fr_1.1fr]">
      <div className="surface-night hidden flex-col justify-between p-10 lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
          <span className="font-display text-lg font-bold text-white">SkillQuest</span>
        </Link>
        <div>
          <h1 className="font-display text-4xl font-black leading-tight text-white">
            One account.
            <br />
            <span className="text-gradient">Six worlds to conquer.</span>
          </h1>
          <ul className="mt-6 space-y-3 text-white/75">
            {[
              "Adaptive levels that respond to how you play",
              "XP, streaks, badges and skill checkpoints",
              "A plain-language profile — never a diagnosis",
              "You control what the Disability Unit can see",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <span aria-hidden className="text-cyan">
                  ✦
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/50">POPIA-aligned · Data used only for screening insight</p>
      </div>

      <main className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <h2 className="font-display text-3xl font-bold">Create your student account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Takes under a minute. Nothing here is shared without your permission.
          </p>

          {serverError && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive"
            >
              <span aria-hidden>⚠ </span>
              {serverError}
            </p>
          )}

          <form className="mt-8 space-y-5" onSubmit={submit} noValidate>
            <Field id="name" label="Full name" error={errors["name"]}>
              <Input
                id="name"
                className="h-12"
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                autoComplete="name"
                aria-invalid={!!errors["name"]}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="email" label="Email" error={errors["email"]}>
                <Input
                  id="email"
                  type="email"
                  className="h-12"
                  value={form.email}
                  onChange={(e) => set("email")(e.target.value)}
                  autoComplete="email"
                  aria-invalid={!!errors["email"]}
                />
              </Field>
              <Field id="studentNumber" label="Student number" error={errors["studentNumber"]}>
                <Input
                  id="studentNumber"
                  inputMode="numeric"
                  className="h-12"
                  value={form.studentNumber}
                  onChange={(e) => set("studentNumber")(e.target.value)}
                  aria-invalid={!!errors["studentNumber"]}
                />
              </Field>
            </div>

            <Field id="password" label="Password" error={errors["password"]}>
              <Input
                id="password"
                type="password"
                className="h-12"
                value={form.password}
                onChange={(e) => set("password")(e.target.value)}
                autoComplete="new-password"
                aria-invalid={!!errors["password"]}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="faculty" label="Faculty" error={errors["faculty"]}>
                <select
                  id="faculty"
                  className="h-12 w-full rounded-md border border-input bg-card px-3 text-sm"
                  value={form.faculty}
                  onChange={(e) => set("faculty")(e.target.value)}
                  aria-invalid={!!errors["faculty"]}
                >
                  <option value="">Select faculty</option>
                  {FACULTIES.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </Field>
              <Field id="yearOfStudy" label="Year of study" error={errors["yearOfStudy"]}>
                <select
                  id="yearOfStudy"
                  className="h-12 w-full rounded-md border border-input bg-card px-3 text-sm"
                  value={form.yearOfStudy}
                  onChange={(e) => set("yearOfStudy")(e.target.value)}
                  aria-invalid={!!errors["yearOfStudy"]}
                >
                  <option value="">Select year</option>
                  {["1st year", "2nd year", "3rd year", "4th year", "Postgraduate"].map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </Field>
            </div>

            <fieldset className="rounded-xl border border-border bg-muted/40 p-4">
              <legend className="px-1 text-sm font-semibold">Consent</legend>
              <label className="flex gap-3 py-2 text-sm">
                <Checkbox
                  checked={consentData}
                  onCheckedChange={(v) => setConsentData(v === true)}
                  aria-describedby="consent-error"
                  className="mt-0.5"
                />
                <span>
                  I understand SkillQuest records how I play (accuracy, response time, attempts,
                  levels) to describe skill patterns. It does not diagnose anything.
                </span>
              </label>
              <label className="flex gap-3 py-2 text-sm">
                <Checkbox
                  checked={consentShare}
                  onCheckedChange={(v) => setConsentShare(v === true)}
                  className="mt-0.5"
                />
                <span>
                  Optional: share my screening report with the Disability Unit so they can offer
                  support. I can withdraw this any time.
                </span>
              </label>
              {errors["consent"] && (
                <p id="consent-error" role="alert" className="mt-2 text-sm text-destructive">
                  <span aria-hidden>⚠ </span>
                  {errors["consent"]}
                </p>
              )}
            </fieldset>

            <Button type="submit" size="lg" className="h-12 w-full" disabled={loading}>
              {loading ? "Creating account…" : "Create account & start playing"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            Already registered?{" "}
            <Link to="/login" className="font-semibold text-primary underline-offset-2 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1.5">{children}</div>
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-destructive">
          <span aria-hidden>⚠ </span>
          {error}
        </p>
      )}
    </div>
  );
}

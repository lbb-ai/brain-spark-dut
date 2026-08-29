import { createFileRoute, Link } from "@tanstack/react-router";
import { DOMAINS } from "@/lib/sq/domains";
import { Logo } from "@/components/sq/AppShell";
import { Button } from "@/components/ui/button";
import { useSq } from "@/lib/sq/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SkillQuest — Play. Learn. Know your strengths. | DUT" },
      {
        name: "description",
        content:
          "A gamified screening companion for DUT students. Six brain-training game domains, XP and streaks, and a plain-language skill profile — never a diagnosis.",
      },
      { property: "og:title", content: "SkillQuest — DUT gamified learning screening" },
      {
        property: "og:description",
        content:
          "Play six game domains, earn XP, and get a plain-language skill profile that shows where support could help.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { currentUser } = useSq();

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main"
        className="sr-only-focusable focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      <header className="surface-night">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Logo />
          <span className="font-display text-lg font-bold text-white">SkillQuest</span>
          <span className="ml-2 hidden rounded-full border border-white/20 px-2.5 py-1 text-[11px] font-semibold text-white/80 sm:inline">
            DUT Disability Unit
          </span>
          <nav aria-label="Landing" className="ml-auto flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:text-white"
            >
              Sign in
            </Link>
            <Button asChild size="sm">
              <Link to={currentUser ? "/dashboard" : "/register"}>
                {currentUser ? "Go to dashboard" : "Start playing"}
              </Link>
            </Button>
          </nav>
        </div>

        <div className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: "var(--gradient-glow)" }}
          />
          <div
            id="main"
            className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:pb-28"
          >
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan/40 bg-cyan/10 px-3 py-1.5 text-xs font-semibold text-cyan">
                <span aria-hidden>◎</span> Screening, not testing
              </p>
              <h1 className="mt-5 font-display text-4xl font-black leading-[1.05] text-white sm:text-6xl">
                Play six challenges.
                <br />
                <span className="text-gradient">Discover how you learn.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/75">
                SkillQuest turns early learning-disability screening into a brain-training game.
                Earn XP, build streaks, climb levels — and get a plain-language skill profile you
                can take to the DUT Disability Unit if you want support.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-13 px-7 text-base">
                  <Link to={currentUser ? "/dashboard" : "/register"}>
                    {currentUser ? "Continue your quest" : "Create your free account"}
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-13 border-white/30 bg-white/5 px-7 text-base text-white hover:bg-white/10 hover:text-white"
                >
                  <Link to="/login">I already have an account</Link>
                </Button>
              </div>
              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 text-white">
                {[
                  ["6", "game domains"],
                  ["50+", "adaptive levels"],
                  ["0", "diagnoses given"],
                ].map(([v, l]) => (
                  <div key={l} className="rounded-xl border border-white/12 bg-white/5 p-3">
                    <dt className="sr-only">{l}</dt>
                    <dd>
                      <span className="font-display text-2xl font-bold">{v}</span>
                      <span className="block text-xs text-white/65">{l}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative">
              <div className="animate-float rounded-3xl border border-white/12 bg-white/[0.06] p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan">
                  Live skill profile
                </p>
                <ul className="mt-4 space-y-3">
                  {[
                    ["Reading Skills", "Strong", 86, "bg-success"],
                    ["Mathematical Skills", "Needs Monitoring", 44, "bg-warning"],
                    ["Working Memory", "Developing", 63, "bg-cyan"],
                    ["Attention & Focus", "Needs Monitoring", 48, "bg-warning"],
                    ["Logical Reasoning", "Strong", 81, "bg-success"],
                    ["Language & Word Skills", "Developing", 66, "bg-primary"],
                  ].map(([name, label, value, tone]) => (
                    <li key={name as string}>
                      <div className="flex justify-between text-sm text-white">
                        <span>{name}</span>
                        <span className="text-white/70">{label}</span>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-white/12">
                        <div
                          className={`h-full rounded-full ${tone as string}`}
                          style={{ width: `${value as number}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-white/55">
                  Illustration of a report. No IQ score. No diagnosis.
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6" aria-labelledby="domains-title">
        <h2 id="domains-title" className="font-display text-3xl font-bold">
          Six worlds to play through
        </h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Each world gets smarter as you do — more elements, tighter timers, sneakier distractors —
          never just "harder sums".
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DOMAINS.map((d) => (
            <li key={d.id} className="card-base p-5 transition-transform hover:-translate-y-1">
              <span
                aria-hidden
                className={`grid size-11 place-items-center rounded-xl font-display text-lg font-bold ${d.tint}`}
              >
                {d.icon}
              </span>
              <h3 className="mt-4 font-display text-lg font-bold">{d.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d.blurb}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-primary">
                {d.focus}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-3">
          {[
            {
              t: "1 · Play",
              b: "Pick a world and play short levels. XP, streaks and badges keep the momentum going. Nothing feels like an exam.",
            },
            {
              t: "2 · Checkpoint",
              b: "Every 10 levels a short challenge round recaps what you practised, so the system can see consistency, not luck.",
            },
            {
              t: "3 · Understand",
              b: "Your profile shows Strong / Developing / Needs Monitoring per skill area, plus a clear route to support.",
            },
          ].map((s) => (
            <div key={s.t}>
              <h3 className="font-display text-xl font-bold text-primary">{s.t}</h3>
              <p className="mt-2 text-muted-foreground">{s.b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="card-base surface-night flex flex-col items-start gap-4 p-8 sm:p-12">
          <h2 className="font-display text-3xl font-bold text-white">
            Your data, your call.
          </h2>
          <p className="max-w-2xl text-white/75">
            SkillQuest is built around POPIA principles. Gameplay data is used to describe skill
            patterns — nothing more. You decide whether your report is shared with the Disability
            Unit, and you can withdraw that consent at any time from your profile.
          </p>
          <Button asChild size="lg">
            <Link to="/register">Start your first quest</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border bg-card/60 py-8">
        <div className="mx-auto max-w-6xl px-4 text-sm text-muted-foreground sm:px-6">
          <p>
            SkillQuest is a screening indicator, not a medical or psychological diagnosis. If you
            have concerns about your learning experience, contact the DUT Disability Unit for
            professional assessment and support.
          </p>
          <p className="mt-3 text-xs">
            Durban University of Technology · Disability Unit Intervention Project
          </p>
        </div>
      </footer>
    </div>
  );
}

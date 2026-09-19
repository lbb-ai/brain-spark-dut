import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSq, levelFromXp, xpIntoLevel } from "@/lib/sq/store";
import { AppShell } from "@/components/sq/AppShell";
import { BadgePill, BandChip, Card, Meter, SectionTitle, Stat } from "@/components/sq/bits";
import { DOMAINS, DOMAIN_MAP, tierForLevel } from "@/lib/sq/domains";
import { recentCheckpoints, screeningCompletion, summariseAll } from "@/lib/sq/analysis";
import { Button } from "@/components/ui/button";
import { Award, Flame } from "lucide-react";
import { FullScreenLoader } from "@/components/sq/FullScreenLoader";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard — SkillQuest | DUT" },
      {
        name: "description",
        content:
          "Track XP, streaks, badges, skill domains and screening progress in your SkillQuest dashboard.",
      },
      { property: "og:title", content: "Your SkillQuest dashboard" },
      {
        property: "og:description",
        content: "XP, streaks, six skill domains and your screening progress at a glance.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { currentUser, progress, ready } = useSq();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !currentUser) navigate({ to: "/login" });
    if (ready && currentUser && currentUser.role !== "student") {
      navigate({ to: currentUser.role === "staff" ? "/staff" : "/admin" });
    }
  }, [ready, currentUser, navigate]);

  if (!ready) return <FullScreenLoader />;
  if (!currentUser) return null;

  const summaries = summariseAll(progress);
  const completion = screeningCompletion(progress);
  const checkpoints = recentCheckpoints(progress);
  const level = levelFromXp(progress.xp);
  const recommended = [...summaries]
    .sort((a, b) => a.samples - b.samples || a.score - b.score)
    .slice(0, 3);

  const firstName = currentUser.name.split(" ")[0];

  return (
    <AppShell>
      <section className="card-base surface-night overflow-hidden p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-sm text-white/65">Welcome back,</p>
            <h1 className="font-display text-3xl font-black text-white sm:text-4xl">
              {firstName}
            </h1>
            <p className="mt-2 max-w-lg text-white/70">
              {completion < 30
                ? "You've just started. Play any world — there's no wrong order and no wrong answer that counts against you."
                : completion < 80
                  ? "Good momentum. A few more levels across your quieter domains and your profile gets a lot sharper."
                  : "Your screening picture is looking complete. Have a look at your report whenever you're ready."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/play">Play a game</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/report">View my screening report</Link>
              </Button>
            </div>
          </div>

          <div className="w-full max-w-xs rounded-2xl border border-white/12 bg-white/[0.06] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan">
              Quest level {level}
            </p>
            <p className="mt-1 font-display text-3xl font-bold text-white">{progress.xp} XP</p>
            <div className="mt-3 h-2 rounded-full bg-white/12">
              <div
                className="h-full rounded-full bg-cyan"
                style={{ width: `${(xpIntoLevel(progress.xp) / 500) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-white/60">
              {500 - xpIntoLevel(progress.xp)} XP to level {level + 1}
            </p>
            <p className="mt-3 text-sm text-white">
              <span className="inline-flex items-center gap-1.5">
                <Flame className="h-4 w-4" aria-hidden /> {progress.streak}-day streak
              </span>
              <span className="mx-2 text-white/40">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Award className="h-4 w-4" aria-hidden /> {progress.badges.length} badges
              </span>
            </p>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Screening progress" value={`${completion}%`} hint="Across all six domains" />
        <Stat label="Levels cleared" value={DOMAINS.reduce((n, d) => n + Math.max(0, (progress.levels[d.id] ?? 1) - 1), 0)} hint="Across all six domains" />
        <Stat label="Checkpoints" value={progress.checkpoints.length} hint="Challenge rounds done" />
        <Stat
          label="Attempts logged"
          value={progress.attempts.length}
          hint="Used to spot patterns"
        />
      </div>

      <section className="mt-10">
        <SectionTitle
          title="Your six skill worlds"
          subtitle="Each card shows where you are and how steady the pattern looks so far."
          action={
            <Button asChild variant="outline">
              <Link to="/play">Open game selection</Link>
            </Button>
          }
        />
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {summaries.map((s) => {
            const meta = DOMAIN_MAP[s.domain];
            return (
              <Card as="li" key={s.domain} className="transition-transform hover:-translate-y-1">
                <div className="flex items-start justify-between gap-3">
                  <span
                    aria-hidden
                    className={`grid size-11 place-items-center rounded-xl font-display text-lg font-bold ${meta.tint}`}
                  >
                    {meta.icon}
                  </span>
                  {s.samples >= 5 ? (
                    <BandChip band={s.band} />
                  ) : (
                    <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                      Not enough data yet
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-display text-lg font-bold">{meta.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Level {s.levelReached} · {tierForLevel(s.levelReached).name} · {s.label}
                </p>
                <div className="mt-3">
                  <Meter
                    value={s.score}
                    label="Skill signal"
                    tone={s.band === "low" ? "success" : s.band === "moderate" ? "warning" : "destructive"}
                  />
                </div>
                <Button asChild className="mt-4 w-full" variant="secondary">
                  <Link to="/play/$domain" params={{ domain: s.domain }}>
                    {s.samples ? "Continue" : "Start"} {meta.short}
                  </Link>
                </Button>
              </Card>
            );
          })}
        </ul>
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <SectionTitle title="Recent checkpoints" subtitle="Short challenge rounds after every 10 levels." />
          {checkpoints.length ? (
            <ul className="space-y-3">
              {checkpoints.map((c) => (
                <Card as="li" key={c.id} className="flex flex-wrap items-center gap-4">
                  <div className="flex-1">
                    <p className="font-semibold">
                      {DOMAIN_MAP[c.domain].name} · Level {c.atLevel}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(c.at).toLocaleDateString()} · consistency {c.consistency}%
                    </p>
                  </div>
                  <div className="w-40">
                    <Meter value={c.accuracy} label="Checkpoint" tone="cyan" />
                  </div>
                </Card>
              ))}
            </ul>
          ) : (
            <Card>
              <p className="text-sm text-muted-foreground">
                No checkpoints yet — reach level 10 in any world to unlock your first challenge
                round.
              </p>
            </Card>
          )}
        </section>

        <section>
          <SectionTitle title="Recommended next" />
          <ul className="space-y-3">
            {recommended.map((r) => (
              <Card as="li" key={r.domain}>
                <p className="font-semibold">{DOMAIN_MAP[r.domain].name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {r.samples < 5
                    ? "Fresh world — a few levels here fills a gap in your profile."
                    : "A little more play here will confirm the pattern."}
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link to="/play/$domain" params={{ domain: r.domain }}>
                    Play now
                  </Link>
                </Button>
              </Card>
            ))}
          </ul>

          <SectionTitle title="Badges" />
          <Card>
            {progress.badges.length ? (
              <div className="flex flex-wrap gap-2">
                {progress.badges.map((b) => (
                  <BadgePill key={b} label={b} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Your first badge unlocks after one completed level. Easy win.
              </p>
            )}
          </Card>

          <Card className="mt-4 border-primary/30 bg-primary/5">
            <h3 className="font-display font-bold">Need to talk to someone?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The DUT Disability Unit offers confidential support and professional
              assessment.
            </p>
            <Button asChild className="mt-3 w-full">
              <Link to="/report" hash="support">
                Get support
              </Link>
            </Button>
          </Card>
        </section>
      </div>

      <section className="mt-10">
        <SectionTitle title="Screening history" subtitle="Every session you've completed." />
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {progress.reports.length
                ? `${progress.reports.length} saved report${progress.reports.length > 1 ? "s" : ""}, newest ${new Date(progress.reports[0]!.createdAt).toLocaleDateString()}.`
                : "No saved reports yet — generate one from the report page whenever you like."}
            </p>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link to="/history">Open history</Link>
              </Button>
              <Button asChild>
                <Link to="/report">View my screening report</Link>
              </Button>
            </div>
          </div>
        </Card>
      </section>
    </AppShell>
  );
}

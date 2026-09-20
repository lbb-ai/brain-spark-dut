import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/sq/AppShell";
import { Card, Meter, SectionTitle } from "@/components/sq/bits";
import { DOMAINS, tierForLevel } from "@/lib/sq/domains";
import { useSq } from "@/lib/sq/store";
import { Button } from "@/components/ui/button";
import { summariseAll } from "@/lib/sq/analysis";
import { FullScreenLoader } from "@/components/sq/FullScreenLoader";

export const Route = createFileRoute("/play/")({
  head: () => ({
    meta: [
      { title: "Choose your challenge — SkillQuest | DUT" },
      {
        name: "description",
        content:
          "Pick one of six SkillQuest game worlds: numbers, words, memory, reading, logic and attention.",
      },
      { property: "og:title", content: "Choose your SkillQuest challenge" },
      {
        property: "og:description",
        content: "Six adaptive game worlds with levels, XP and skill checkpoints.",
      },
    ],
  }),
  component: GameSelection,
});

function GameSelection() {
  const { currentUser, progress, state, ready } = useSq();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !currentUser) navigate({ to: "/login" });
  }, [ready, currentUser, navigate]);

  if (!ready) return <FullScreenLoader />;
  if (!currentUser) return null;
  const summaries = summariseAll(progress);

  return (
    <AppShell>
      <div className="card-base surface-night p-6 sm:p-8">
        <h1 className="font-display text-3xl font-black text-white">Screening session</h1>
        <p className="mt-2 max-w-2xl text-white/70">
          Play in any order. Each world adapts to how you're doing — a good run pushes the
          difficulty up, a rough run eases it back. Nothing is scored against you.
        </p>
      </div>

      <SectionTitle
        title="Pick a world"
        subtitle="Levels 1–10 Beginner · 11–20 Easy · 21–30 Intermediate · 31–40 Advanced · 41+ Expert"
        action={
          <Button asChild variant="outline">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />

      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {DOMAINS.map((d) => {
          const s = summaries.find((x) => x.domain === d.id)!;
          const enabled = state.gamesEnabled[d.id];
          const nextCheckpoint = 10 - ((s.levelReached - 1) % 10);
          return (
            <Card as="li" key={d.id} className="flex flex-col">
              <div className="flex items-start justify-between">
                <span
                  aria-hidden
                  className={`grid size-12 place-items-center rounded-xl font-display text-xl font-bold ${d.tint}`}
                >
                  {d.icon}
                </span>
                <span className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold">
                  Lv {s.levelReached} · {tierForLevel(s.levelReached).name}
                </span>
              </div>
              <h2 className="mt-3 font-display text-lg font-bold">{d.name}</h2>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{d.blurb}</p>
              <div className="mt-4">
                <Meter value={((s.levelReached - 1) % 10) * 10} label="Progress to next checkpoint" />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {nextCheckpoint === 10 ? "Checkpoint unlocked at the next level" : `${nextCheckpoint} levels to your next challenge round`}
                </p>
              </div>
              <Button asChild className="mt-4" disabled={!enabled}>
                {enabled ? (
                  <Link to="/play/$domain" params={{ domain: d.id }}>
                    Play {d.short}
                  </Link>
                ) : (
                  <span>Temporarily unavailable</span>
                )}
              </Button>
            </Card>
          );
        })}
      </ul>
    </AppShell>
  );
}

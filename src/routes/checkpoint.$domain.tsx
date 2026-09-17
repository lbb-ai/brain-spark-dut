import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/sq/AppShell";
import { Card, Meter } from "@/components/sq/bits";
import { Button } from "@/components/ui/button";
import { DOMAIN_MAP, isDomainId, type DomainId } from "@/lib/sq/domains";
import { buildCheckpoint } from "@/lib/sq/generators";
import { Countdown, GameRunner, type TaskResult } from "@/components/sq/game/GameRunner";
import { useSq } from "@/lib/sq/store";
import { attemptsAccuracy } from "@/lib/sq/analysis";
import { FullScreenLoader } from "@/components/sq/FullScreenLoader";

export const Route = createFileRoute("/checkpoint/$domain")({
  head: ({ params }) => {
    const name = isDomainId(params.domain) ? DOMAIN_MAP[params.domain as DomainId].name : "Skill";
    return {
      meta: [
        { title: `${name} skill checkpoint — SkillQuest | DUT` },
        {
          name: "description",
          content: `A short ${name} challenge round that recaps the last ten levels and checks how consistent your play is.`,
        },
        { property: "og:title", content: `${name} skill checkpoint — SkillQuest` },
        {
          property: "og:description",
          content: "A quick challenge round after every ten levels — not an exam.",
        },
      ],
    };
  },
  component: CheckpointPage,
});

function CheckpointPage() {
  const { domain } = Route.useParams();
  const navigate = useNavigate();
  const { currentUser, progress, ready, state, recordAttempts, recordCheckpoint, addXp, awardBadge } =
    useSq();

  const valid = isDomainId(domain);
  const domainId = (valid ? domain : "number") as DomainId;
  const meta = DOMAIN_MAP[domainId];
  const level = progress.levels[domainId] ?? 10;

  const [phase, setPhase] = useState<"start" | "countdown" | "playing" | "done">("start");
  const [tasks, setTasks] = useState(() => buildCheckpoint(domainId, level));
  const [accuracy, setAccuracy] = useState(0);
  const [gameplay, setGameplay] = useState(0);

  useEffect(() => {
    if (ready && !currentUser) navigate({ to: "/login" });
  }, [ready, currentUser, navigate]);

  if (!ready) return <FullScreenLoader />;
  if (!currentUser) return null;

  const finish = (res: TaskResult[]) => {
    const acc = Math.round((res.filter((r) => r.correct).length / res.length) * 100);
    const recent = progress.attempts.filter((a) => a.domain === domainId).slice(-30);
    const gp = attemptsAccuracy(recent);
    recordAttempts(
      res.map((r) => ({
        domain: domainId,
        level,
        taskKind: r.kind,
        correct: r.correct,
        responseMs: r.responseMs,
        attempts: r.attempts,
        hintUsed: r.hintUsed,
        isCheckpoint: true,
      })),
    );
    recordCheckpoint({ domain: domainId, atLevel: level, accuracy: acc, gameplayAccuracy: gp });
    addXp(150 + acc);
    awardBadge("Checkpoint Clear");
    setAccuracy(acc);
    setGameplay(gp);
    setPhase("done");
  };

  const consistency = Math.max(0, 100 - Math.abs(accuracy - gameplay));

  return (
    <AppShell>
      {phase === "start" && (
        <Card className="surface-night p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan">Challenge round</p>
          <h1 className="mt-2 font-display text-4xl font-black text-white">
            {meta.name} checkpoint
          </h1>
          <p className="mt-3 max-w-xl text-white/70">
            Six quick tasks pulled from the last ten levels. It's not an exam — it just helps
            SkillQuest see whether your play is consistent, or whether a specific kind of task keeps
            tripping you up.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => setPhase("countdown")}>
              Let's go
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              <Link to="/play/$domain" params={{ domain: domainId }}>
                Not now, keep playing
              </Link>
            </Button>
          </div>
        </Card>
      )}

      {phase === "countdown" && <Countdown onDone={() => setPhase("playing")} />}

      {phase === "playing" && (
        <GameRunner
          tasks={tasks}
          domain={domainId}
          level={level}
          label="Checkpoint"
          sound={state.settings.sound}
          onComplete={finish}
        />
      )}

      {phase === "done" && (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Card className="animate-pop p-8">
            <h1 className="font-display text-3xl font-black">Checkpoint complete</h1>
            <p className="mt-2 text-muted-foreground">
              {consistency >= 80
                ? "Your checkpoint matches your normal play closely — that's a reliable signal."
                : accuracy > gameplay
                  ? "You did better here than in normal play — looks like the format suits you."
                  : "This round was harder than your usual play. We'll watch that in the next checkpoint before reading anything into it."}
            </p>
            <div className="mt-6 space-y-4">
              <Meter value={accuracy} label="Checkpoint accuracy" tone="cyan" />
              <Meter value={gameplay} label="Recent gameplay accuracy" />
              <Meter
                value={consistency}
                label="Consistency"
                tone={consistency >= 75 ? "success" : consistency >= 50 ? "warning" : "destructive"}
              />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/play/$domain" params={{ domain: domainId }}>
                  Continue to level {level + 1}
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/report">See my skill profile</Link>
              </Button>
            </div>
          </Card>
          <Card>
            <h2 className="font-display text-lg font-bold">+{150 + accuracy} XP</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Checkpoints are worth more XP than a normal level — they tell the system the most.
            </p>
            <p className="mt-4 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
              Checkpoint results are one input into your skill profile. They never produce a
              diagnosis on their own.
            </p>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

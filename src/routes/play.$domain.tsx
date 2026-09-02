import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/sq/AppShell";
import { Card, Meter } from "@/components/sq/bits";
import { Button } from "@/components/ui/button";
import { DOMAIN_MAP, isDomainId, tierForLevel, type DomainId } from "@/lib/sq/domains";
import { buildLevel } from "@/lib/sq/generators";
import { GameRunner, Countdown, type TaskResult } from "@/components/sq/game/GameRunner";
import { useSq } from "@/lib/sq/store";
import { nextLevel } from "@/lib/sq/analysis";

export const Route = createFileRoute("/play/$domain")({
  head: ({ params }) => {
    const name = isDomainId(params.domain) ? DOMAIN_MAP[params.domain as DomainId].name : "Game";
    return {
      meta: [
        { title: `${name} — SkillQuest | DUT` },
        {
          name: "description",
          content: `Play ${name} in SkillQuest: adaptive levels, instant feedback, XP and skill checkpoints.`,
        },
        { property: "og:title", content: `${name} — SkillQuest` },
        {
          property: "og:description",
          content: `Adaptive ${name} levels with XP, streaks and non-judgemental feedback.`,
        },
      ],
    };
  },
  component: GamePage,
});

type Phase = "start" | "countdown" | "playing" | "complete";

function GamePage() {
  const { domain } = Route.useParams();
  const navigate = useNavigate();
  const {
    currentUser,
    progress,
    ready,
    state,
    recordAttempts,
    recordLevelRun,
    setLevel,
    addXp,
    awardBadge,
  } = useSq();

  const valid = isDomainId(domain);
  const domainId = (valid ? domain : "number") as DomainId;
  const meta = DOMAIN_MAP[domainId];

  const [phase, setPhase] = useState<Phase>("start");
  const [level, setLevelState] = useState(1);
  const [tasks, setTasks] = useState(() => buildLevel(domainId, 1));
  const [results, setResults] = useState<TaskResult[]>([]);
  const [fails, setFails] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [newBadges, setNewBadges] = useState<string[]>([]);

  useEffect(() => {
    if (ready && !currentUser) navigate({ to: "/login" });
  }, [ready, currentUser, navigate]);

  useEffect(() => {
    setLevelState(progress.levels[domainId] ?? 1);
  }, [progress.levels, domainId]);

  const begin = useCallback(
    (atLevel: number) => {
      setTasks(buildLevel(domainId, atLevel));
      setResults([]);
      setStartedAt(Date.now());
      setPhase("countdown");
    },
    [domainId],
  );

  const complete = (res: TaskResult[]) => {
    const correct = res.filter((r) => r.correct).length;
    const accuracy = Math.round((correct / res.length) * 100);
    const durationMs = Date.now() - startedAt;

    recordAttempts(
      res.map((r) => ({
        domain: domainId,
        level,
        taskKind: r.kind,
        correct: r.correct,
        responseMs: r.responseMs,
        attempts: r.attempts,
        hintUsed: r.hintUsed,
        isCheckpoint: false,
      })),
    );
    recordLevelRun({
      domain: domainId,
      level,
      accuracy,
      avgResponseMs: Math.round(res.reduce((a, b) => a + b.responseMs, 0) / res.length),
      durationMs,
      retried: false,
    });

    const xp = 40 + correct * 25 + (accuracy === 100 ? 60 : 0) + level * 2;
    addXp(xp);
    setXpEarned(xp);

    const earned: string[] = [];
    if (!progress.badges.includes("First Steps")) earned.push("First Steps");
    if (accuracy === 100 && !progress.badges.includes("Flawless Round")) earned.push("Flawless Round");
    if (level >= 10 && !progress.badges.includes("Level 10 Club")) earned.push("Level 10 Club");
    if (level >= 30 && !progress.badges.includes("Level 30 Club")) earned.push("Level 30 Club");
    earned.forEach(awardBadge);
    setNewBadges(earned);

    const nextFails = accuracy < 50 ? fails + 1 : 0;
    setFails(nextFails);
    const target = nextLevel(level, accuracy, nextFails);
    setLevel(domainId, Math.max(progress.levels[domainId] ?? 1, target));

    setResults(res);
    setPhase("complete");
  };

  const accuracy = results.length
    ? Math.round((results.filter((r) => r.correct).length / results.length) * 100)
    : 0;
  const checkpointDue = phase === "complete" && level % 10 === 0;
  const disabled = !state.gamesEnabled[domainId];

  const encouragement = useMemo(() => {
    if (accuracy >= 80) return "Sharp round — the next level steps up a notch.";
    if (accuracy >= 50) return "Solid work. Some tricky ones in there.";
    return "That level was a tough one. We've eased the next one — keep going, it all counts.";
  }, [accuracy]);

  if (!currentUser) return null;

  if (!valid || disabled) {
    return (
      <AppShell>
        <Card>
          <h1 className="font-display text-2xl font-bold">Game unavailable</h1>
          <p className="mt-2 text-muted-foreground">
            This world isn't available right now. Pick another from the game selection.
          </p>
          <Button asChild className="mt-4">
            <Link to="/play">Back to games</Link>
          </Button>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
        <Link to="/play" className="hover:text-foreground">
          Games
        </Link>{" "}
        / <span className="text-foreground">{meta.name}</span>
      </nav>

      {phase === "start" && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card className="surface-night p-8">
            <span aria-hidden className="font-display text-4xl">
              {meta.icon}
            </span>
            <h1 className="mt-3 font-display text-4xl font-black text-white">{meta.name}</h1>
            <p className="mt-2 max-w-xl text-white/70">{meta.blurb}</p>
            <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-cyan">
              Level {level} · {tierForLevel(level).name}
            </p>
            <Button size="lg" className="mt-4 h-13 px-8 text-base" onClick={() => begin(level)}>
              Start level {level}
            </Button>
          </Card>

          <Card>
            <h2 className="font-display text-lg font-bold">How this round works</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>· {tasks.length} short tasks, each with its own timer.</li>
              <li>· Feedback is instant and never judgemental.</li>
              <li>· Hints are available — using one just tells us you wanted support.</li>
              <li>· A skill checkpoint unlocks every 10 levels.</li>
              <li>· Difficulty adapts: strong runs go up, tough runs ease back.</li>
            </ul>
            <div className="mt-4">
              <Meter value={((level - 1) % 10) * 10} label="Progress to checkpoint" />
            </div>
          </Card>
        </div>
      )}

      {phase === "countdown" && <Countdown onDone={() => setPhase("playing")} />}

      {phase === "playing" && (
        <GameRunner
          tasks={tasks}
          domain={domainId}
          level={level}
          label="Level"
          sound={state.settings.sound}
          onComplete={complete}
        />
      )}

      {phase === "complete" && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card className="animate-pop p-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Level {level} complete
            </p>
            <h1 className="mt-2 font-display text-4xl font-black">
              {accuracy >= 80 ? "Great round!" : accuracy >= 50 ? "Round done." : "Round done — nice effort."}
            </h1>
            <p className="mt-2 text-muted-foreground">{encouragement}</p>

            <div className="mx-auto mt-6 grid max-w-md gap-3 sm:grid-cols-3">
              <Stat label="Accuracy" value={`${accuracy}%`} />
              <Stat label="XP earned" value={`+${xpEarned}`} />
              <Stat
                label="Avg time"
                value={`${Math.round(
                  results.reduce((a, b) => a + b.responseMs, 0) / Math.max(1, results.length) / 100,
                ) / 10}s`}
              />
            </div>

            {newBadges.length > 0 && (
              <p className="mt-4 rounded-xl bg-primary/8 px-4 py-3 text-sm font-semibold text-primary">
                🏅 New badge{newBadges.length > 1 ? "s" : ""}: {newBadges.join(", ")}
              </p>
            )}

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {checkpointDue ? (
                <Button asChild size="lg">
                  <Link to="/checkpoint/$domain" params={{ domain: domainId }}>
                    Start skill checkpoint
                  </Link>
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={() => {
                    const target = progress.levels[domainId] ?? level;
                    setLevelState(target);
                    begin(target);
                  }}
                >
                  Continue to level {progress.levels[domainId] ?? level}
                </Button>
              )}
              <Button variant="outline" size="lg" onClick={() => begin(level)}>
                Replay level {level}
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link to="/play">Choose another world</Link>
              </Button>
            </div>
          </Card>

          <Card>
            <h2 className="font-display text-lg font-bold">Round breakdown</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {results.map((r, i) => (
                <li
                  key={r.taskId}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <span>
                    <span aria-hidden className={r.correct ? "text-success" : "text-destructive"}>
                      {r.correct ? "✓" : "✗"}
                    </span>{" "}
                    Task {i + 1}
                    <span className="sr-only">{r.correct ? "correct" : "not correct"}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {(r.responseMs / 1000).toFixed(1)}s{r.hintUsed ? " · hint" : ""}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              These numbers describe patterns over time. One rough round changes nothing.
            </p>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-bold">{value}</p>
    </div>
  );
}

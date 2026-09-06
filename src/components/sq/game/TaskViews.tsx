import { useEffect, useMemo, useRef, useState } from "react";
import type {
  MemoryBoardTask,
  ReactionTask,
  SequenceTask,
  TargetsTask,
  Task,
} from "@/lib/sq/generators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface TaskOutcome {
  correct: boolean;
  attempts: number;
  hintUsed: boolean;
  detail?: string;
}

export interface TaskViewProps {
  task: Task;
  onFinish: (outcome: TaskOutcome) => void;
  sound: boolean;
}

function beep(ok: boolean, enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = ok ? 660 : 220;
    gain.gain.value = 0.05;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    setTimeout(() => void ctx.close(), 300);
  } catch {
    /* audio not available */
  }
}

/* ------------------------------- MCQ / Input ------------------------------ */

function McqOrInput({ task, onFinish, sound }: TaskViewProps) {
  const [choice, setChoice] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [status, setStatus] = useState<"idle" | "right" | "wrong">("idle");

  if (task.kind !== "mcq" && task.kind !== "input") return null;

  const stroop = task.kind === "mcq" && task.prompt.includes("::");
  const [stroopWord, stroopInk] = stroop ? task.prompt.split("\n\n")[1]!.split("::") : ["", ""];
  const inkStyle: Record<string, string> = {
    RED: "#DC2626",
    BLUE: "#2563EB",
    GREEN: "#16A34A",
    PURPLE: "#7C3AED",
    CYAN: "#06B6D4",
  };

  const settle = (correct: boolean) => {
    const n = attempts + 1;
    setAttempts(n);
    setStatus(correct ? "right" : "wrong");
    beep(correct, sound);
    setTimeout(() => onFinish({ correct, attempts: n, hintUsed }), correct ? 700 : 1100);
  };

  return (
    <div className="animate-rise">
      {"passage" in task && task.passage && (
        <div className="mb-5 rounded-xl border border-border bg-muted/50 p-4 text-[15px] leading-7">
          {task.passage}
        </div>
      )}

      <p className="text-sm font-medium text-muted-foreground">{task.instruction}</p>

      {stroop ? (
        <div className="my-6 text-center">
          <p className="text-sm text-muted-foreground">Ignore the word. Name the ink colour.</p>
          <p
            className="mt-3 font-display text-5xl font-extrabold"
            style={{ color: inkStyle[stroopInk!] }}
          >
            {stroopWord}
          </p>
        </div>
      ) : (
        <h3 className="mt-2 whitespace-pre-line font-display text-2xl font-bold sm:text-3xl">
          {task.prompt}
        </h3>
      )}

      {task.kind === "mcq" ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {task.options.map((opt, i) => {
            const chosen = choice === i;
            const isAnswer = i === task.answerIndex;
            return (
              <button
                key={opt + i}
                type="button"
                disabled={status === "right"}
                onClick={() => {
                  setChoice(i);
                  settle(isAnswer);
                }}
                className={cn(
                  "min-h-14 rounded-xl border-2 border-border bg-card px-4 py-3 text-left text-base font-medium transition-all hover:border-primary/60 hover:shadow-[var(--shadow-lift)] disabled:cursor-default",
                  chosen && status === "right" && "border-success bg-success/10 text-success",
                  chosen && status === "wrong" && "animate-shake border-destructive bg-destructive/8",
                  status === "wrong" && isAnswer && "border-success/60",
                )}
              >
                <span className="mr-2 inline-flex size-6 items-center justify-center rounded-md bg-muted text-xs font-bold">
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      ) : (
        <form
          className="mt-6 flex flex-wrap gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            settle(text.trim().toLowerCase() === task.answer.toLowerCase());
          }}
        >
          <label className="sr-only" htmlFor="answer-input">
            Your answer
          </label>
          <Input
            id="answer-input"
            autoComplete="off"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={task.placeholder ?? "Type your answer"}
            className="h-14 max-w-sm flex-1 text-lg"
            disabled={status === "right"}
          />
          <Button type="submit" size="lg" className="h-14">
            Check
          </Button>
        </form>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {task.hint && !hintUsed && status === "idle" && (
          <Button variant="outline" size="sm" onClick={() => setHintUsed(true)}>
            Need a hint?
          </Button>
        )}
        {hintUsed && task.hint && (
          <p className="rounded-lg bg-cyan/10 px-3 py-2 text-sm text-foreground">Hint: {task.hint}</p>
        )}
        {status === "right" && (
          <p className="font-semibold text-success" role="status">
            ✓ Nice one — that's it.
          </p>
        )}
        {status === "wrong" && (
          <p className="font-medium text-foreground" role="status">
            Not this time — the answer was{" "}
            <strong>
              {task.kind === "mcq" ? task.options[task.answerIndex] : task.answer}
            </strong>
            . Keep going, you're building the pattern.
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ Memory board ------------------------------ */

function MemoryBoard({ task, onFinish, sound }: { task: MemoryBoardTask } & Omit<TaskViewProps, "task">) {
  const deck = useMemo(() => {
    const cards = [...task.symbols, ...task.symbols].map((s, i) => ({ id: i, symbol: s }));
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j]!, cards[i]!];
    }
    return cards;
  }, [task]);

  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [misses, setMisses] = useState(0);
  const [preview, setPreview] = useState(task.previewMs > 0);
  const done = useRef(false);

  useEffect(() => {
    if (!preview) return;
    const t = setTimeout(() => setPreview(false), task.previewMs);
    return () => clearTimeout(t);
  }, [preview, task.previewMs]);

  useEffect(() => {
    if (matched.length === deck.length && !done.current) {
      done.current = true;
      beep(true, sound);
      setTimeout(
        () => onFinish({ correct: misses <= task.pairs, attempts: misses + 1, hintUsed: false }),
        600,
      );
    }
  }, [matched, deck.length, misses, onFinish, sound, task.pairs]);

  const flip = (id: number) => {
    if (preview || matched.includes(id) || flipped.includes(id) || flipped.length === 2) return;
    const next = [...flipped, id];
    setFlipped(next);
    if (next.length === 2) {
      const [a, b] = next;
      const same = deck[a!]!.symbol === deck[b!]!.symbol;
      setTimeout(() => {
        if (same) {
          setMatched((m) => [...m, a!, b!]);
          beep(true, sound);
        } else {
          setMisses((m) => m + 1);
        }
        setFlipped([]);
      }, same ? 320 : 700);
    }
  };

  const cols = Math.min(6, Math.ceil(Math.sqrt(deck.length)));

  return (
    <div className="animate-rise">
      <p className="text-sm font-medium text-muted-foreground">{task.instruction}</p>
      <h3 className="mt-1 font-display text-2xl font-bold">{task.prompt}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Pairs found: {matched.length / 2} / {task.pairs} · Mismatches: {misses}
      </p>
      <div
        className="mt-5 grid gap-2 sm:gap-3"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}
      >
        {deck.map((card) => {
          const shown = preview || flipped.includes(card.id) || matched.includes(card.id);
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => flip(card.id)}
              aria-label={shown ? `Card ${card.symbol}` : "Hidden card"}
              className={cn(
                "grid aspect-square min-h-14 place-items-center rounded-xl border-2 text-2xl font-bold transition-all duration-200",
                shown
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-navy text-transparent hover:border-cyan/60",
                matched.includes(card.id) && "border-success bg-success/12 text-success",
              )}
            >
              <span aria-hidden>{shown ? card.symbol : "?"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------- Sequence -------------------------------- */

function SequencePad({ task, onFinish, sound }: { task: SequenceTask } & Omit<TaskViewProps, "task">) {
  const [phase, setPhase] = useState<"show" | "input">("show");
  const [active, setActive] = useState<number | null>(null);
  const [entry, setEntry] = useState<number[]>([]);

  useEffect(() => {
    let i = 0;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      if (i >= task.sequence.length) {
        setActive(null);
        setPhase("input");
        return;
      }
      setActive(task.sequence[i]!);
      setTimeout(() => {
        if (cancelled) return;
        setActive(null);
        i++;
        setTimeout(run, task.stepMs * 0.35);
      }, task.stepMs);
    };
    const start = setTimeout(run, 700);
    return () => {
      cancelled = true;
      clearTimeout(start);
    };
  }, [task]);

  const tap = (i: number) => {
    if (phase !== "input") return;
    const next = [...entry, i];
    setEntry(next);
    const ok = task.sequence[next.length - 1] === i;
    beep(ok, sound);
    if (!ok) {
      setTimeout(() => onFinish({ correct: false, attempts: 1, hintUsed: false }), 500);
      return;
    }
    if (next.length === task.sequence.length) {
      setTimeout(() => onFinish({ correct: true, attempts: 1, hintUsed: false }), 500);
    }
  };

  const cols = task.padSize === 4 ? 2 : task.padSize === 6 ? 3 : 3;

  return (
    <div className="animate-rise text-center">
      <p className="text-sm font-medium text-muted-foreground">{task.instruction}</p>
      <h3 className="mt-1 font-display text-2xl font-bold">
        {phase === "show" ? "Watch closely…" : "Now repeat the order"}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground" role="status">
        {phase === "input" ? `${entry.length} / ${task.sequence.length} entered` : "Memorising phase"}
      </p>
      <div
        className="mx-auto mt-6 grid max-w-md gap-3"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}
      >
        {Array.from({ length: task.padSize }, (_, i) => (
          <button
            key={i}
            type="button"
            disabled={phase === "show"}
            onClick={() => tap(i)}
            aria-label={`Pad ${i + 1}`}
            className={cn(
              "aspect-square min-h-16 rounded-2xl border-2 border-border bg-card transition-all",
              active === i && "scale-105 border-cyan bg-cyan/30",
              phase === "input" && "hover:border-primary hover:bg-primary/10",
            )}
          >
            <span className="font-display text-xl font-bold text-muted-foreground">{i + 1}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- Reaction -------------------------------- */

function ReactionPanel({ task, onFinish, sound }: { task: ReactionTask } & Omit<TaskViewProps, "task">) {
  const [round, setRound] = useState(0);
  const [state, setState] = useState<"wait" | "go" | "result">("wait");
  const [times, setTimes] = useState<number[]>([]);
  const [errors, setErrors] = useState(0);
  const goAt = useRef(0);

  useEffect(() => {
    if (round >= task.rounds) {
      const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 9999;
      const correct = errors <= 1 && avg < 620;
      setTimeout(() => onFinish({ correct, attempts: 1 + errors, hintUsed: false }), 400);
      return;
    }
    setState("wait");
    const delay = 900 + Math.random() * 2200;
    const t = setTimeout(() => {
      goAt.current = performance.now();
      setState("go");
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const hit = () => {
    if (state === "wait") {
      if (task.falseStarts) setErrors((e) => e + 1);
      beep(false, sound);
      setRound((r) => r + 1);
      return;
    }
    if (state === "go") {
      const ms = performance.now() - goAt.current;
      setTimes((t) => [...t, ms]);
      beep(true, sound);
      setRound((r) => r + 1);
    }
  };

  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

  return (
    <div className="animate-rise text-center">
      <p className="text-sm font-medium text-muted-foreground">{task.instruction}</p>
      <h3 className="mt-1 font-display text-2xl font-bold">
        Round {Math.min(round + 1, task.rounds)} of {task.rounds}
      </h3>
      <button
        type="button"
        onClick={hit}
        aria-label={state === "go" ? "Tap now" : "Wait for the signal"}
        className={cn(
          "mt-6 grid h-56 w-full place-items-center rounded-3xl border-2 font-display text-2xl font-bold transition-colors",
          state === "go"
            ? "border-success bg-success/20 text-success"
            : "border-border bg-navy text-navy-foreground",
        )}
      >
        {state === "go" ? "TAP NOW ⚡" : "Wait for it…"}
      </button>
      <p className="mt-3 text-sm text-muted-foreground" role="status">
        Average: {avg ? `${avg} ms` : "—"} · Early taps: {errors}
      </p>
    </div>
  );
}

/* --------------------------------- Targets -------------------------------- */

function TargetGrid({ task, onFinish, sound }: { task: TargetsTask } & Omit<TaskViewProps, "task">) {
  const cells = useMemo(() => {
    const total = task.gridSize * task.gridSize;
    const arr = Array.from({ length: total }, () => ({
      symbol: task.distractors[Math.floor(Math.random() * task.distractors.length)]!,
      isTarget: false,
    }));
    const idx = new Set<number>();
    while (idx.size < Math.min(task.targetCount, total)) idx.add(Math.floor(Math.random() * total));
    idx.forEach((i) => (arr[i] = { symbol: task.target, isTarget: true }));
    return arr;
  }, [task]);

  const [found, setFound] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number[]>([]);
  const done = useRef(false);

  useEffect(() => {
    const targets = cells.filter((c) => c.isTarget).length;
    if (found.length === targets && !done.current) {
      done.current = true;
      setTimeout(
        () => onFinish({ correct: wrong.length <= 1, attempts: 1 + wrong.length, hintUsed: false }),
        450,
      );
    }
  }, [found, wrong, cells, onFinish]);

  return (
    <div className="animate-rise">
      <p className="text-sm font-medium text-muted-foreground">{task.instruction}</p>
      <h3 className="mt-1 font-display text-2xl font-bold">{task.prompt}</h3>
      <p className="mt-1 text-sm text-muted-foreground" role="status">
        Found {found.length} / {cells.filter((c) => c.isTarget).length} · Misses {wrong.length}
      </p>
      <div
        className="mt-5 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${task.gridSize}, minmax(0,1fr))` }}
      >
        {cells.map((cell, i) => {
          const isFound = found.includes(i);
          const isWrong = wrong.includes(i);
          return (
            <button
              key={i}
              type="button"
              aria-label={`Cell ${i + 1}: ${cell.symbol}`}
              onClick={() => {
                if (isFound || isWrong) return;
                if (cell.isTarget) {
                  setFound((f) => [...f, i]);
                  beep(true, sound);
                } else {
                  setWrong((w) => [...w, i]);
                  beep(false, sound);
                }
              }}
              className={cn(
                "grid aspect-square min-h-11 place-items-center rounded-lg border-2 border-border bg-card text-xl transition-colors hover:border-primary",
                isFound && "border-success bg-success/15 text-success",
                isWrong && "border-destructive/60 bg-destructive/10 opacity-70",
              )}
            >
              <span aria-hidden>{cell.symbol}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------- Router -------------------------------- */

export function TaskView(props: TaskViewProps) {
  const { task } = props;
  switch (task.kind) {
    case "mcq":
    case "input":
      return <McqOrInput {...props} />;
    case "memory-board":
      return <MemoryBoard {...props} task={task} />;
    case "sequence":
      return <SequencePad {...props} task={task} />;
    case "reaction":
      return <ReactionPanel {...props} task={task} />;
    case "targets":
      return <TargetGrid {...props} task={task} />;
    default:
      return null;
  }
}

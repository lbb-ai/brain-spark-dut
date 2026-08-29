import { useEffect, useMemo, useRef, useState } from "react";
import type { Task } from "@/lib/sq/generators";
import { TaskView, type TaskOutcome } from "./TaskViews";
import { Meter } from "@/components/sq/bits";
import { DOMAIN_MAP, tierForLevel, type DomainId } from "@/lib/sq/domains";

export interface TaskResult extends TaskOutcome {
  taskId: string;
  kind: string;
  responseMs: number;
}

const ENCOURAGE = [
  "Locked in.",
  "Keep the rhythm going.",
  "Every attempt teaches the system something.",
  "You're doing the work — that's what counts.",
  "Nice pace.",
];

export function GameRunner({
  tasks,
  domain,
  level,
  sound,
  onComplete,
  label,
}: {
  tasks: Task[];
  domain: DomainId;
  level: number;
  sound: boolean;
  label: string;
  onComplete: (results: TaskResult[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<TaskResult[]>([]);
  const [remaining, setRemaining] = useState(tasks[0]?.timeLimitMs ?? 30000);
  const started = useRef(performance.now());
  const task = tasks[index];

  useEffect(() => {
    if (!task) return;
    started.current = performance.now();
    setRemaining(task.timeLimitMs);
    const iv = setInterval(() => {
      const left = task.timeLimitMs - (performance.now() - started.current);
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        clearInterval(iv);
        finish({ correct: false, attempts: 1, hintUsed: false, detail: "timeout" });
      }
    }, 100);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, task?.id]);

  const finish = (outcome: TaskOutcome) => {
    if (!task) return;
    const result: TaskResult = {
      ...outcome,
      taskId: task.id,
      kind: task.kind,
      responseMs: Math.round(performance.now() - started.current),
    };
    const next = [...results, result];
    setResults(next);
    if (index + 1 >= tasks.length) onComplete(next);
    else setIndex(index + 1);
  };

  const encouragement = useMemo(
    () => ENCOURAGE[index % ENCOURAGE.length],
    [index],
  );

  if (!task) return null;
  const meta = DOMAIN_MAP[domain];
  const timePct = (remaining / task.timeLimitMs) * 100;
  const correctSoFar = results.filter((r) => r.correct).length;

  return (
    <div className="card-base p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {label} · {meta.name}
          </p>
          <h2 className="font-display text-lg font-bold">
            Level {level} · {tierForLevel(level).name}
          </h2>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">
            Task {index + 1} / {tasks.length}
          </p>
          <p className="text-muted-foreground">{correctSoFar} correct so far</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Meter value={(index / tasks.length) * 100} label="Level progress" />
        <Meter
          value={timePct}
          label="Time"
          tone={timePct < 25 ? "destructive" : timePct < 55 ? "warning" : "cyan"}
        />
      </div>

      <div className="mt-6">
        <TaskView key={task.id} task={task} onFinish={finish} sound={sound} />
      </div>

      <p className="mt-6 text-xs text-muted-foreground">{encouragement}</p>
    </div>
  );
}

export function Countdown({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (n === 0) {
      const t = setTimeout(onDone, 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setN((v) => v - 1), 700);
    return () => clearTimeout(t);
  }, [n, onDone]);
  return (
    <div className="card-base surface-night grid place-items-center py-24" role="status" aria-live="polite">
      <p className="animate-pop font-display text-7xl font-black text-white">
        {n === 0 ? "GO!" : n}
      </p>
    </div>
  );
}

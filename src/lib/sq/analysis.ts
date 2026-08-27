import { DOMAINS, DOMAIN_MAP, type DomainId } from "./domains";
import type {
  AttemptRecord,
  Band,
  CheckpointRecord,
  DomainSummary,
  ScreeningReport,
  StudentProgress,
} from "./types";

export const BAND_META: Record<
  Band,
  { label: string; tone: string; chip: string; description: string }
> = {
  low: {
    label: "Low concern",
    tone: "text-success",
    chip: "bg-success/12 text-success border-success/30",
    description: "Performance in this area is steady and in the expected range.",
  },
  moderate: {
    label: "Moderate concern",
    tone: "text-warning",
    chip: "bg-warning/15 text-warning border-warning/40",
    description: "Some inconsistency here. Worth monitoring over a few more sessions.",
  },
  higher: {
    label: "Higher concern",
    tone: "text-destructive",
    chip: "bg-destructive/10 text-destructive border-destructive/30",
    description:
      "A repeated pattern appears in this area. A professional assessment could help.",
  },
};

export function skillLabelFor(score: number): string {
  if (score >= 75) return "Strong";
  if (score >= 55) return "Developing";
  return "Needs Monitoring";
}

export function bandFor(score: number, samples: number): Band {
  if (samples < 5) return "low";
  if (score >= 72) return "low";
  if (score >= 50) return "moderate";
  return "higher";
}

function mean(nums: number[]) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function stdev(nums: number[]) {
  if (nums.length < 2) return 0;
  const m = mean(nums);
  return Math.sqrt(mean(nums.map((n) => (n - m) ** 2)));
}

export function summariseDomain(
  domain: DomainId,
  progress: StudentProgress,
): DomainSummary {
  const attempts = progress.attempts.filter((a) => a.domain === domain);
  const recent = attempts.slice(-40);
  const accuracy = recent.length ? mean(recent.map((a) => (a.correct ? 100 : 0))) : 0;
  const avgResponseMs = recent.length ? mean(recent.map((a) => a.responseMs)) : 0;
  const level = progress.levels[domain] ?? 1;

  const consistency = 100 - Math.min(50, stdev(recent.map((a) => (a.correct ? 100 : 0))) / 2);
  const speedScore = avgResponseMs
    ? Math.max(40, Math.min(100, 118 - avgResponseMs / 350))
    : 70;
  const hintRate = recent.length ? mean(recent.map((a) => (a.hintUsed ? 1 : 0))) : 0;
  const retryRate = recent.length ? mean(recent.map((a) => Math.min(3, a.attempts) - 1)) : 0;
  const levelBoost = Math.min(15, (level - 1) * 0.6);

  const cps = progress.checkpoints.filter((c) => c.domain === domain);
  const cpScore = cps.length ? mean(cps.slice(-3).map((c) => c.accuracy)) : accuracy;

  const raw =
    accuracy * 0.5 +
    cpScore * 0.15 +
    consistency * 0.12 +
    speedScore * 0.13 +
    levelBoost -
    hintRate * 8 -
    retryRate * 6;

  const score = recent.length ? Math.max(0, Math.min(100, Math.round(raw))) : 0;

  return {
    domain,
    score,
    band: bandFor(score, recent.length),
    label: recent.length ? skillLabelFor(score) : "Not yet played",
    levelReached: level,
    accuracy: Math.round(accuracy),
    avgResponseMs: Math.round(avgResponseMs),
    samples: attempts.length,
  };
}

export function summariseAll(progress: StudentProgress): DomainSummary[] {
  return DOMAINS.map((d) => summariseDomain(d.id, progress));
}

export function overallBand(domains: DomainSummary[]): Band {
  const played = domains.filter((d) => d.samples >= 5);
  if (!played.length) return "low";
  if (played.some((d) => d.band === "higher")) return "higher";
  if (played.filter((d) => d.band === "moderate").length >= 2) return "higher";
  if (played.some((d) => d.band === "moderate")) return "moderate";
  return "low";
}

export function screeningCompletion(progress: StudentProgress): number {
  // A full screening session = at least 10 recorded attempts in each domain.
  const per = DOMAINS.map((d) => {
    const n = progress.attempts.filter((a) => a.domain === d.id).length;
    return Math.min(1, n / 10);
  });
  return Math.round(mean(per) * 100);
}

export function buildReport(
  studentId: string,
  progress: StudentProgress,
): ScreeningReport {
  const domains = summariseAll(progress);
  const overall = overallBand(domains);
  const watch = domains
    .filter((d) => d.samples >= 5 && d.band !== "low")
    .map((d) => DOMAIN_MAP[d.domain].skillLabel);
  const strong = domains
    .filter((d) => d.samples >= 5 && d.score >= 75)
    .map((d) => DOMAIN_MAP[d.domain].skillLabel);

  const summaryText = watch.length
    ? `Gameplay shows a repeating pattern in ${watch.join(" and ")}. ${
        strong.length ? `Consistent strengths appear in ${strong.join(" and ")}. ` : ""
      }These are patterns across many attempts, not single mistakes.`
    : strong.length
      ? `Performance is steady across the domains played, with particular strength in ${strong.join(
          " and ",
        )}. Nothing here suggests a barrier at this stage.`
      : "Not enough gameplay yet to describe a reliable pattern. Play a few more levels across the domains.";

  return {
    id: `r${Date.now().toString(36)}`,
    studentId,
    createdAt: new Date().toISOString(),
    domains,
    overall,
    summaryText,
    totalAttempts: progress.attempts.length,
  };
}

export function checkpointConsistency(
  checkpointAccuracy: number,
  gameplayAccuracy: number,
): number {
  return Math.max(0, Math.round(100 - Math.abs(checkpointAccuracy - gameplayAccuracy)));
}

export function recentCheckpoints(progress: StudentProgress): CheckpointRecord[] {
  return [...progress.checkpoints].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 5);
}

/** Adaptive difficulty: returns the next level to serve. Never punishing. */
export function nextLevel(current: number, accuracy: number, streakFails: number) {
  if (accuracy >= 80) return current + 1;
  if (accuracy >= 50) return current + (Math.random() < 0.5 ? 1 : 0);
  if (streakFails >= 2 && current > 1) return current - 1;
  return current;
}

export function attemptsAccuracy(attempts: AttemptRecord[]) {
  return attempts.length
    ? Math.round(mean(attempts.map((a) => (a.correct ? 100 : 0))))
    : 0;
}

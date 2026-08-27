export type DomainId =
  | "number"
  | "word"
  | "memory"
  | "reading"
  | "logic"
  | "attention";

export interface DomainMeta {
  id: DomainId;
  name: string;
  short: string;
  skillLabel: string;
  blurb: string;
  focus: string;
  icon: string;
  tint: string; // tailwind-friendly token classes
  ring: string;
}

export const DOMAINS: DomainMeta[] = [
  {
    id: "number",
    name: "Number Challenge",
    short: "Numbers",
    skillLabel: "Mathematical Skills",
    blurb: "Arithmetic sprints, sequences, comparisons and pattern spotting.",
    focus: "Numeracy & mental calculation",
    icon: "123",
    tint: "bg-secondary/10 text-secondary",
    ring: "ring-secondary/30",
  },
  {
    id: "word",
    name: "Word Challenge",
    short: "Words",
    skillLabel: "Language & Word Skills",
    blurb: "Spelling, word building, missing letters and grammar puzzles.",
    focus: "Spelling & language",
    icon: "Aa",
    tint: "bg-primary/10 text-primary",
    ring: "ring-primary/30",
  },
  {
    id: "memory",
    name: "Memory Match",
    short: "Memory",
    skillLabel: "Working Memory",
    blurb: "Flip-and-match boards plus remember-and-repeat sequences.",
    focus: "Working memory load",
    icon: "◈",
    tint: "bg-cyan/15 text-cyan",
    ring: "ring-cyan/30",
  },
  {
    id: "reading",
    name: "Reading Challenge",
    short: "Reading",
    skillLabel: "Reading Skills",
    blurb: "Short passages, comprehension and following instructions.",
    focus: "Comprehension & instructions",
    icon: "¶",
    tint: "bg-success/12 text-success",
    ring: "ring-success/30",
  },
  {
    id: "logic",
    name: "Logic & Scenario",
    short: "Logic",
    skillLabel: "Logical Reasoning",
    blurb: "Campus scenarios, sequencing, cause-and-effect and puzzles.",
    focus: "Reasoning & decisions",
    icon: "⌘",
    tint: "bg-warning/15 text-warning",
    ring: "ring-warning/30",
  },
  {
    id: "attention",
    name: "Attention Challenge",
    short: "Attention",
    skillLabel: "Attention & Focus",
    blurb: "Reaction taps, target hunting and distraction filtering.",
    focus: "Sustained attention",
    icon: "◎",
    tint: "bg-destructive/10 text-destructive",
    ring: "ring-destructive/30",
  },
];

export const DOMAIN_MAP: Record<DomainId, DomainMeta> = Object.fromEntries(
  DOMAINS.map((d) => [d.id, d]),
) as Record<DomainId, DomainMeta>;

export const DOMAIN_IDS = DOMAINS.map((d) => d.id);

export function isDomainId(value: string): value is DomainId {
  return (DOMAIN_IDS as string[]).includes(value);
}

export function tierForLevel(level: number): {
  name: string;
  index: number;
} {
  if (level <= 10) return { name: "Beginner", index: 1 };
  if (level <= 20) return { name: "Easy", index: 2 };
  if (level <= 30) return { name: "Intermediate", index: 3 };
  if (level <= 40) return { name: "Advanced", index: 4 };
  return { name: "Expert", index: 5 };
}

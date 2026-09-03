import type { DomainId } from "./domains";

/* ------------------------------------------------------------------ */
/* Task model                                                          */
/* ------------------------------------------------------------------ */

export interface BaseTask {
  id: string;
  domain: DomainId;
  level: number;
  prompt: string;
  instruction: string;
  hint?: string;
  timeLimitMs: number;
}

export interface McqTask extends BaseTask {
  kind: "mcq";
  passage?: string;
  options: string[];
  answerIndex: number;
}

export interface InputTask extends BaseTask {
  kind: "input";
  passage?: string;
  answer: string;
  placeholder?: string;
}

export interface MemoryBoardTask extends BaseTask {
  kind: "memory-board";
  pairs: number;
  symbols: string[];
  previewMs: number;
}

export interface SequenceTask extends BaseTask {
  kind: "sequence";
  sequence: number[]; // indices into pad
  padSize: number;
  stepMs: number;
}

export interface ReactionTask extends BaseTask {
  kind: "reaction";
  rounds: number;
  falseStarts: boolean;
}

export interface TargetsTask extends BaseTask {
  kind: "targets";
  gridSize: number;
  target: string;
  distractors: string[];
  targetCount: number;
}

export type Task =
  | McqTask
  | InputTask
  | MemoryBoardTask
  | SequenceTask
  | ReactionTask
  | TargetsTask;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

let seq = 0;
const uid = () => `t${Date.now().toString(36)}${(seq++).toString(36)}`;
const rnd = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: readonly T[]): T => arr[rnd(0, arr.length - 1)]!;
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(0, i);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
};

/** Difficulty 1..5 from level, plus a smooth 0..1 intensity inside the tier. */
export function difficulty(level: number) {
  const tier = Math.min(5, Math.floor((level - 1) / 10) + 1);
  const within = ((level - 1) % 10) / 9;
  return { tier, within };
}

function timeLimit(level: number, base: number, floor: number) {
  const { tier, within } = difficulty(level);
  const ms = base - (tier - 1 + within) * (base - floor) * 0.22;
  return Math.max(floor, Math.round(ms));
}

function withDistractors(answer: number, count: number, spread: number) {
  const set = new Set<number>([answer]);
  while (set.size < count) {
    const delta = rnd(1, spread) * (Math.random() < 0.5 ? -1 : 1);
    const v = answer + delta;
    if (v >= 0) set.add(v);
  }
  return shuffle([...set]);
}

function mcqFrom(
  base: Omit<McqTask, "kind" | "id" | "options" | "answerIndex">,
  correct: string,
  wrong: string[],
): McqTask {
  const options = shuffle([correct, ...wrong]);
  return {
    ...base,
    kind: "mcq",
    id: uid(),
    options,
    answerIndex: options.indexOf(correct),
  };
}

/* ------------------------------------------------------------------ */
/* NUMBER                                                              */
/* ------------------------------------------------------------------ */

function numberTask(level: number): Task {
  const { tier } = difficulty(level);
  const style = pick(
    tier <= 1
      ? (["arith", "compare", "sequence"] as const)
      : (["arith", "compare", "sequence", "pattern", "mental"] as const),
  );
  const tl = timeLimit(level, 26000, 9000);
  const common = {
    domain: "number" as const,
    level,
    timeLimitMs: tl,
    instruction: "Choose the correct answer.",
  };

  if (style === "arith") {
    const max = [12, 30, 80, 200, 600][tier - 1]!;
    const ops = tier <= 1 ? ["+", "-"] : tier <= 3 ? ["+", "-", "×"] : ["+", "-", "×", "÷"];
    const op = pick(ops);
    let a = rnd(2, max);
    let b = rnd(2, Math.max(3, Math.round(max / (op === "×" ? 8 : 1))));
    let answer: number;
    if (op === "+") answer = a + b;
    else if (op === "-") {
      if (b > a) [a, b] = [b, a];
      answer = a - b;
    } else if (op === "×") answer = a * b;
    else {
      answer = rnd(2, 12);
      a = answer * b;
    }
    const steps = tier >= 4 ? ` ${pick(["+", "-"])} ${rnd(2, 20)}` : "";
    let prompt = `${a} ${op} ${b}`;
    let final = answer;
    if (steps) {
      const [s, n] = steps.trim().split(" ");
      final = s === "+" ? answer + Number(n) : answer - Number(n);
      prompt = `(${a} ${op} ${b})${steps}`;
    }
    return mcqFrom(
      {
        ...common,
        id: "",
        prompt: `${prompt} = ?`,
        hint: tier <= 2 ? "Work left to right, one step at a time." : undefined,
      } as never,
      String(final),
      withDistractors(final, 4, Math.max(3, Math.round(max / 6)))
        .filter((v) => v !== final)
        .slice(0, 3)
        .map(String),
    );
  }

  if (style === "compare") {
    const scale = [20, 60, 150, 500, 2000][tier - 1]!;
    const a = rnd(2, scale);
    const b = rnd(2, scale);
    const c = rnd(2, scale);
    const values = tier >= 3 ? [a, b, c] : [a, b];
    const largest = Math.max(...values);
    return mcqFrom(
      {
        ...common,
        id: "",
        prompt: `Which value is largest?  ${values.join("   ·   ")}`,
        instruction: "Compare the numbers and pick the largest.",
      } as never,
      String(largest),
      values.filter((v) => v !== largest).map(String).slice(0, 3),
    );
  }

  if (style === "sequence") {
    const step = rnd(2, 3 + tier * 3);
    const start = rnd(1, 20);
    const mode = tier >= 3 && Math.random() < 0.5 ? "mul" : "add";
    const items: number[] = [];
    let cur = start;
    for (let i = 0; i < 5; i++) {
      items.push(cur);
      cur = mode === "add" ? cur + step : cur * 2 + (tier >= 4 ? 1 : 0);
    }
    const answer = items.pop()!;
    return mcqFrom(
      {
        ...common,
        id: "",
        prompt: `${items.join(", ")}, ?`,
        instruction: "Find the next number in the sequence.",
        hint: tier <= 2 ? "Look at the gap between each pair." : undefined,
      } as never,
      String(answer),
      withDistractors(answer, 4, Math.max(2, step))
        .filter((v) => v !== answer)
        .slice(0, 3)
        .map(String),
    );
  }

  if (style === "pattern") {
    const base = rnd(2, 9);
    const n = rnd(3, 4 + tier);
    const answer = base * n;
    return mcqFrom(
      {
        ...common,
        id: "",
        prompt: `A pattern grows by ${base} each step. After ${n} steps it reaches ?`,
        instruction: "Work out the value after all the steps.",
      } as never,
      String(answer),
      withDistractors(answer, 4, base * 2)
        .filter((v) => v !== answer)
        .slice(0, 3)
        .map(String),
    );
  }

  // mental word problem
  const price = rnd(15, 40 + tier * 25);
  const qty = rnd(2, 3 + tier);
  const paid = price * qty + rnd(10, 80);
  const answer = paid - price * qty;
  return mcqFrom(
    {
      ...common,
      id: "",
      prompt: `You buy ${qty} campus meals at R${price} each and pay with R${paid}. What change do you get?`,
      instruction: "Solve the everyday maths problem.",
    } as never,
    `R${answer}`,
    withDistractors(answer, 4, 25)
      .filter((v) => v !== answer)
      .slice(0, 3)
      .map((v) => `R${v}`),
  );
}

/* ------------------------------------------------------------------ */
/* WORD                                                                */
/* ------------------------------------------------------------------ */

const WORD_BANK: { word: string; syn: string; wrong: string[] }[] = [
  { word: "campus", syn: "grounds", wrong: ["engine", "silence", "meadow"] },
  { word: "lecture", syn: "talk", wrong: ["ladder", "recipe", "harbour"] },
  { word: "deadline", syn: "cut-off", wrong: ["welcome", "balance", "shadow"] },
  { word: "revision", syn: "review", wrong: ["freedom", "traffic", "planet"] },
  { word: "diligent", syn: "hard-working", wrong: ["careless", "hollow", "sudden"] },
  { word: "concise", syn: "brief", wrong: ["lengthy", "sticky", "loyal"] },
  { word: "analyse", syn: "examine", wrong: ["ignore", "decorate", "borrow"] },
  { word: "eligible", syn: "qualified", wrong: ["fragile", "curious", "distant"] },
  { word: "coherent", syn: "logical", wrong: ["random", "sleepy", "salty"] },
  { word: "ambiguous", syn: "unclear", wrong: ["obvious", "sturdy", "cheerful"] },
  { word: "perseverance", syn: "persistence", wrong: ["laziness", "confusion", "curiosity"] },
  { word: "collaborate", syn: "work together", wrong: ["compete alone", "postpone", "duplicate"] },
  { word: "bursary", syn: "study grant", wrong: ["parking fine", "timetable", "residence"] },
  { word: "plagiarism", syn: "copying work", wrong: ["group study", "referencing", "proofreading"] },
];

const SPELLING: { correct: string; wrong: string[] }[] = [
  { correct: "definitely", wrong: ["definately", "definitly", "defenitely"] },
  { correct: "separate", wrong: ["seperate", "seperete", "saparate"] },
  { correct: "necessary", wrong: ["neccessary", "necesary", "necessery"] },
  { correct: "argument", wrong: ["arguement", "argumment", "arguemnt"] },
  { correct: "occurred", wrong: ["occured", "ocurred", "occurrd"] },
  { correct: "receive", wrong: ["recieve", "receve", "resieve"] },
  { correct: "accommodation", wrong: ["accomodation", "acommodation", "accommadation"] },
  { correct: "referencing", wrong: ["refrencing", "referancing", "referenceing"] },
  { correct: "assessment", wrong: ["assesment", "assessmant", "asessment"] },
  { correct: "rhythm", wrong: ["rythm", "rhythem", "rhytmh"] },
];

const GRAMMAR: { prompt: string; correct: string; wrong: string[] }[] = [
  {
    prompt: "The group of students ___ waiting outside the lab.",
    correct: "is",
    wrong: ["are", "were being", "be"],
  },
  {
    prompt: "She submitted the report ___ the deadline passed.",
    correct: "before",
    wrong: ["despite", "among", "unless"],
  },
  {
    prompt: "Neither the tutor nor the students ___ ready.",
    correct: "were",
    wrong: ["was being", "is", "has been"],
  },
  {
    prompt: "If I ___ more time, I would revise the whole chapter.",
    correct: "had",
    wrong: ["have had", "will have", "am having"],
  },
  {
    prompt: "The results, which ___ released today, surprised everyone.",
    correct: "were",
    wrong: ["was", "is", "been"],
  },
];

function maskWord(word: string, holes: number) {
  const idx = shuffle(Array.from({ length: word.length }, (_, i) => i).filter((i) => word[i] !== " ")).slice(0, holes);
  return [...word].map((c, i) => (idx.includes(i) ? "_" : c)).join("");
}

function wordTask(level: number): Task {
  const { tier } = difficulty(level);
  const tl = timeLimit(level, 30000, 11000);
  const style = pick(
    tier <= 1
      ? (["spelling", "missing", "synonym"] as const)
      : (["spelling", "missing", "synonym", "anagram", "grammar"] as const),
  );
  const bank = WORD_BANK.filter((w) =>
    tier <= 2 ? w.word.length <= 9 : tier <= 3 ? w.word.length <= 11 : true,
  );
  const entry = pick(bank.length ? bank : WORD_BANK);

  if (style === "spelling") {
    const s = pick(SPELLING);
    return mcqFrom(
      {
        domain: "word",
        level,
        id: "",
        prompt: "Which spelling is correct?",
        instruction: "Pick the correctly spelled word.",
        timeLimitMs: tl,
      } as never,
      s.correct,
      s.wrong.slice(0, tier >= 3 ? 3 : 2),
    );
  }

  if (style === "missing") {
    const holes = Math.min(entry.word.length - 2, tier);
    return {
      kind: "input",
      id: uid(),
      domain: "word",
      level,
      prompt: maskWord(entry.word, holes).toUpperCase().split("").join(" "),
      instruction: "Type the complete word (the underscores are missing letters).",
      ...(tier <= 2 ? { hint: `It means: ${entry.syn}` } : {}),
      answer: entry.word,
      placeholder: "Type the word",
      timeLimitMs: tl,
    };
  }

  if (style === "synonym") {
    return mcqFrom(
      {
        domain: "word",
        level,
        id: "",
        prompt: `Which option means the same as “${entry.word}”?`,
        instruction: "Choose the closest meaning.",
        timeLimitMs: tl,
      } as never,
      entry.syn,
      entry.wrong.slice(0, tier >= 3 ? 3 : 2),
    );
  }

  if (style === "anagram") {
    const scrambled = shuffle([...entry.word]).join("");
    return {
      kind: "input",
      id: uid(),
      domain: "word",
      level,
      prompt: scrambled.toUpperCase().split("").join(" "),
      instruction: "Unscramble the letters into one word.",
      hint: `It means: ${entry.syn}`,
      answer: entry.word,
      placeholder: "Your word",
      timeLimitMs: tl + 6000,
    };
  }

  const g = pick(GRAMMAR);
  return mcqFrom(
    {
      domain: "word",
      level,
      id: "",
      prompt: g.prompt,
      instruction: "Choose the word that completes the sentence correctly.",
      timeLimitMs: tl,
    } as never,
    g.correct,
    g.wrong.slice(0, tier >= 3 ? 3 : 2),
  );
}

/* ------------------------------------------------------------------ */
/* MEMORY                                                              */
/* ------------------------------------------------------------------ */

const SYMBOLS = ["★", "▲", "●", "◆", "✦", "❖", "▣", "☾", "⚡", "✿", "☘", "♞", "☂", "✈", "⌘", "♫", "⚑", "☕"];

function memoryTask(level: number): Task {
  const { tier, within } = difficulty(level);
  const useSequence = Math.random() < (tier >= 2 ? 0.45 : 0.3);

  if (useSequence) {
    const len = Math.min(9, 3 + tier - 1 + Math.round(within * 1.5));
    const padSize = tier <= 2 ? 4 : tier <= 4 ? 6 : 9;
    return {
      kind: "sequence",
      id: uid(),
      domain: "memory",
      level,
      prompt: "Watch the pads light up, then repeat the order.",
      instruction: "Remember the sequence, then tap the pads in the same order.",
      sequence: Array.from({ length: len }, () => rnd(0, padSize - 1)),
      padSize,
      stepMs: Math.max(320, 780 - tier * 90),
      timeLimitMs: 20000 + len * 3000,
    };
  }

  const pairs = Math.min(12, 3 + tier + Math.round(within * 2));
  return {
    kind: "memory-board",
    id: uid(),
    domain: "memory",
    level,
    prompt: `Match all ${pairs} pairs.`,
    instruction: "Flip two cards at a time and match every pair before the timer ends.",
    pairs,
    symbols: shuffle(SYMBOLS).slice(0, pairs),
    previewMs: tier <= 2 ? 1600 : tier <= 3 ? 900 : 0,
    timeLimitMs: 30000 + pairs * 6000,
  };
}

/* ------------------------------------------------------------------ */
/* READING                                                             */
/* ------------------------------------------------------------------ */

const PASSAGES: {
  text: string;
  q: string;
  correct: string;
  wrong: string[];
  tier: number;
}[] = [
  {
    tier: 1,
    text: "Thabo signs in at the library each morning at 07:30. He studies for two hours, then attends his first lecture in the Ritson building at 10:00.",
    q: "Where is Thabo's first lecture?",
    correct: "The Ritson building",
    wrong: ["The library", "The residence", "The sports hall"],
  },
  {
    tier: 1,
    text: "The campus shuttle leaves Steve Biko campus every 20 minutes. The last shuttle departs at 18:40 and does not run on public holidays.",
    q: "How often does the shuttle leave?",
    correct: "Every 20 minutes",
    wrong: ["Every hour", "Every 40 minutes", "Twice a day"],
  },
  {
    tier: 2,
    text: "Nomsa found her assignment brief confusing. Instead of guessing, she booked a consultation with her lecturer, wrote down the three key requirements, and rebuilt her plan around them. Her final mark improved by twelve percent.",
    q: "What did Nomsa do first when she was confused?",
    correct: "She booked a consultation with her lecturer",
    wrong: [
      "She guessed the requirements",
      "She asked another student to write it",
      "She submitted the work late",
    ],
  },
  {
    tier: 3,
    text: "Research on study habits suggests that spacing revision over several days produces stronger recall than a single long session. The effect is strongest when each session ends with self-testing rather than re-reading notes.",
    q: "According to the passage, what strengthens the spacing effect most?",
    correct: "Ending each session with self-testing",
    wrong: [
      "Re-reading notes carefully",
      "Studying only the night before",
      "Highlighting the whole textbook",
    ],
  },
  {
    tier: 4,
    text: "The Disability Unit distinguishes between accommodations, which change how a student is assessed, and interventions, which change how a student learns. A student may receive extra writing time (an accommodation) while also attending weekly reading support (an intervention). The two are recorded separately so that outcomes can be traced to the correct measure.",
    q: "Why are accommodations and interventions recorded separately?",
    correct: "So outcomes can be traced to the correct measure",
    wrong: [
      "Because students may only choose one",
      "Because interventions are optional",
      "Because accommodations expire each term",
    ],
  },
  {
    tier: 5,
    text: "A screening tool is not a diagnostic instrument. It is calibrated for sensitivity rather than specificity, meaning it deliberately over-identifies borderline cases so that fewer genuine cases are missed. The cost of this design is a higher rate of referrals that a professional assessment later clears.",
    q: "What trade-off does the passage describe?",
    correct: "More false referrals in exchange for missing fewer real cases",
    wrong: [
      "Faster screening in exchange for lower accuracy",
      "Cheaper testing in exchange for less privacy",
      "Fewer referrals in exchange for longer waiting times",
    ],
  },
];

const INSTRUCTIONS: { prompt: string; correct: string; wrong: string[] }[] = [
  {
    prompt:
      "Read carefully: If today is a weekday, choose the second option from the bottom. Otherwise choose the first option.",
    correct: "Second from the bottom",
    wrong: ["First option", "Last option", "Third option"],
  },
  {
    prompt:
      "Follow the steps: start at 10, add 6, halve the result, then subtract 3. What is the final value?",
    correct: "5",
    wrong: ["8", "11", "4"],
  },
  {
    prompt:
      "The form says: attach your ID, then sign page two, then submit online. What must you do immediately before submitting?",
    correct: "Sign page two",
    wrong: ["Attach your ID", "Print the form", "Email the tutor"],
  },
];

function readingTask(level: number): Task {
  const { tier } = difficulty(level);
  const tl = timeLimit(level, 55000, 20000);
  if (Math.random() < 0.25) {
    const i = pick(INSTRUCTIONS);
    return mcqFrom(
      {
        domain: "reading",
        level,
        id: "",
        prompt: i.prompt,
        instruction: "Follow the instruction exactly.",
        timeLimitMs: tl,
      } as never,
      i.correct,
      i.wrong.slice(0, tier >= 3 ? 3 : 2),
    );
  }
  const pool = PASSAGES.filter((p) => Math.abs(p.tier - tier) <= 1);
  const p = pick(pool.length ? pool : PASSAGES);
  return {
    ...mcqFrom(
      {
        domain: "reading",
        level,
        id: "",
        prompt: p.q,
        instruction: "Read the passage, then answer the question.",
        timeLimitMs: tl,
      } as never,
      p.correct,
      p.wrong.slice(0, tier >= 3 ? 3 : 2),
    ),
    passage: p.text,
  };
}

/* ------------------------------------------------------------------ */
/* LOGIC                                                               */
/* ------------------------------------------------------------------ */

const SCENARIOS: { prompt: string; correct: string; wrong: string[]; tier: number }[] = [
  {
    tier: 1,
    prompt:
      "You realise a group assignment is due tomorrow and one member has not sent their section. What is the most effective first step?",
    correct: "Message the member directly with a clear deadline tonight",
    wrong: [
      "Submit without their section and say nothing",
      "Wait and hope it arrives",
      "Report them to the lecturer immediately",
    ],
  },
  {
    tier: 2,
    prompt:
      "You keep losing focus during two-hour lectures. Which response is most likely to help long term?",
    correct: "Split note-taking into short focused blocks with brief resets",
    wrong: [
      "Sit at the back and record everything",
      "Stop attending and rely on slides",
      "Drink more coffee before each class",
    ],
  },
  {
    tier: 3,
    prompt:
      "Your marks are fine in practicals but consistently low in written tests, even when you know the content. What is the most reasonable conclusion?",
    correct: "Something about the written test format may be a barrier worth exploring",
    wrong: [
      "You do not understand the content at all",
      "The lecturer is marking unfairly",
      "You should drop the subject",
    ],
  },
  {
    tier: 4,
    prompt:
      "Two study methods gave you similar marks, but one took half the time. Before switching permanently, what is the soundest reasoning step?",
    correct: "Check whether the marks came from comparable assessments",
    wrong: [
      "Switch immediately, time is the only factor",
      "Keep both methods forever",
      "Ask a friend which they prefer",
    ],
  },
  {
    tier: 5,
    prompt:
      "A screening report flags moderate concern in attention but low concern everywhere else, and your own experience matches it. What is the most defensible next action?",
    correct: "Book a professional assessment to explore the pattern properly",
    wrong: [
      "Treat the report as a diagnosis",
      "Ignore it since most areas are fine",
      "Repeat the games until the flag disappears",
    ],
  },
];

function logicTask(level: number): Task {
  const { tier } = difficulty(level);
  const tl = timeLimit(level, 40000, 15000);
  const roll = Math.random();

  if (roll < 0.45) {
    const pool = SCENARIOS.filter((s) => Math.abs(s.tier - tier) <= 1);
    const s = pick(pool.length ? pool : SCENARIOS);
    return mcqFrom(
      {
        domain: "logic",
        level,
        id: "",
        prompt: s.prompt,
        instruction: "Choose the most reasonable response.",
        timeLimitMs: tl,
      } as never,
      s.correct,
      s.wrong.slice(0, tier >= 3 ? 3 : 2),
    );
  }

  if (roll < 0.7) {
    // sequencing
    const steps = [
      "Read the brief",
      "Plan the sections",
      "Write the draft",
      "Check references",
      "Submit online",
    ].slice(0, Math.min(5, 3 + Math.floor(tier / 2)));
    const missingIdx = rnd(1, steps.length - 1);
    const shown = steps.map((s, i) => (i === missingIdx ? "???" : s));
    return mcqFrom(
      {
        domain: "logic",
        level,
        id: "",
        prompt: `Put the workflow in order. What belongs at “???”\n\n${shown.join("  →  ")}`,
        instruction: "Pick the step that fits the gap.",
        timeLimitMs: tl,
      } as never,
      steps[missingIdx]!,
      shuffle(["Print the receipt", "Delete the draft", "Book a flight", "Buy stationery"]).slice(
        0,
        tier >= 3 ? 3 : 2,
      ),
    );
  }

  // logic puzzle
  const a = rnd(2, 6 + tier);
  const b = a + rnd(1, 4 + tier);
  return mcqFrom(
    {
      domain: "logic",
      level,
      id: "",
      prompt: `Lerato has ${b} lab slots. Sipho has ${a}. If they swap ${Math.floor(
        (b - a) / 2,
      )} slots from Lerato to Sipho, who has more, and by how many?`,
      instruction: "Reason it through, then choose.",
      timeLimitMs: tl,
    } as never,
    (() => {
      const move = Math.floor((b - a) / 2);
      const l = b - move;
      const s = a + move;
      if (l === s) return "They are equal";
      return l > s ? `Lerato, by ${l - s}` : `Sipho, by ${s - l}`;
    })(),
    shuffle([
      "They are equal",
      `Lerato, by ${b - a}`,
      `Sipho, by ${Math.max(1, a)}`,
      `Lerato, by 1`,
    ]).slice(0, tier >= 3 ? 3 : 2),
  );
}

/* ------------------------------------------------------------------ */
/* ATTENTION                                                           */
/* ------------------------------------------------------------------ */

const STROOP = ["RED", "BLUE", "GREEN", "PURPLE", "CYAN"];

function attentionTask(level: number): Task {
  const { tier, within } = difficulty(level);
  const roll = Math.random();

  if (roll < 0.35) {
    return {
      kind: "reaction",
      id: uid(),
      domain: "attention",
      level,
      prompt: "Tap the moment the panel turns bright.",
      instruction:
        "Wait for the signal, then react as fast as you can. Tapping early costs you the round.",
      rounds: Math.min(6, 3 + Math.floor(tier / 2)),
      falseStarts: tier >= 3,
      timeLimitMs: 45000,
    };
  }

  if (roll < 0.75) {
    const gridSize = tier <= 1 ? 4 : tier <= 3 ? 5 : 6;
    const target = pick(["◆", "★", "●", "▲"]);
    return {
      kind: "targets",
      id: uid(),
      domain: "attention",
      level,
      prompt: `Find every ${target} before time runs out.`,
      instruction: "Tap only the target symbol. Distractors cost accuracy.",
      gridSize,
      target,
      distractors: ["◇", "☆", "○", "△", "▽", "◈"].slice(0, 3 + tier),
      targetCount: Math.min(12, 3 + tier + Math.round(within * 2)),
      timeLimitMs: Math.max(9000, 22000 - tier * 2200),
    };
  }

  // stroop-style filtering
  const word = pick(STROOP);
  const ink = pick(STROOP.filter((c) => c !== word));
  return mcqFrom(
    {
      domain: "attention",
      level,
      id: "",
      prompt: `Ignore the word. What COLOUR is it written in?\n\n${word}::${ink}`,
      instruction: "Name the ink colour, not the word.",
      timeLimitMs: timeLimit(level, 12000, 4500),
    } as never,
    ink,
    shuffle(STROOP.filter((c) => c !== ink)).slice(0, tier >= 3 ? 3 : 2),
  );
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

const BUILDERS: Record<DomainId, (level: number) => Task> = {
  number: numberTask,
  word: wordTask,
  memory: memoryTask,
  reading: readingTask,
  logic: logicTask,
  attention: attentionTask,
};

export function buildTask(domain: DomainId, level: number): Task {
  return BUILDERS[domain](level);
}

export function buildLevel(domain: DomainId, level: number): Task[] {
  const count = domain === "memory" ? 2 : domain === "reading" ? 3 : 5;
  return Array.from({ length: count }, () => buildTask(domain, level));
}

/** Checkpoint = mixed recap of the previous 10 levels. */
export function buildCheckpoint(domain: DomainId, atLevel: number): Task[] {
  const levels = Array.from({ length: 6 }, (_, i) =>
    Math.max(1, atLevel - 9 + Math.round((i * 9) / 5)),
  );
  return levels.map((l) => buildTask(domain, l));
}

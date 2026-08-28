import { DOMAIN_IDS, type DomainId } from "./domains";
import type { AttemptRecord, CaseNote, StudentProgress, SqUser } from "./types";

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function emptyProgress(): StudentProgress {
  return {
    xp: 0,
    streak: 0,
    lastPlayedDay: null,
    badges: [],
    levels: Object.fromEntries(DOMAIN_IDS.map((d) => [d, 1])) as Record<DomainId, number>,
    attempts: [],
    levelRuns: [],
    checkpoints: [],
    reports: [],
  };
}

interface SeedSpec {
  id: string;
  name: string;
  email: string;
  studentNumber: string;
  faculty: string;
  year: string;
  seed: number;
  strength: Partial<Record<DomainId, number>>; // 0..1 base accuracy
  levels: Partial<Record<DomainId, number>>;
  xp: number;
  badges: string[];
}

const SPECS: SeedSpec[] = [
  {
    id: "stu-lindiwe",
    name: "Lindiwe Mkhize",
    email: "22001234@dut4life.ac.za",
    studentNumber: "22001234",
    faculty: "Accounting & Informatics",
    year: "2nd year",
    seed: 11,
    strength: { number: 0.42, word: 0.78, memory: 0.66, reading: 0.82, logic: 0.74, attention: 0.48 },
    levels: { number: 14, word: 23, memory: 18, reading: 26, logic: 21, attention: 12 },
    xp: 4820,
    badges: ["First Steps", "Streak x3", "Checkpoint Clear", "Word Wizard"],
  },
  {
    id: "stu-sipho",
    name: "Sipho Ndlovu",
    email: "21998877@dut4life.ac.za",
    studentNumber: "21998877",
    faculty: "Engineering & Built Environment",
    year: "3rd year",
    seed: 27,
    strength: { number: 0.86, word: 0.55, memory: 0.72, reading: 0.51, logic: 0.83, attention: 0.69 },
    levels: { number: 34, word: 16, memory: 22, reading: 14, logic: 31, attention: 19 },
    xp: 7310,
    badges: ["Number Ninja", "Streak x7", "Level 30 Club"],
  },
  {
    id: "stu-aisha",
    name: "Aisha Patel",
    email: "23004455@dut4life.ac.za",
    studentNumber: "23004455",
    faculty: "Health Sciences",
    year: "1st year",
    seed: 43,
    strength: { number: 0.71, word: 0.69, memory: 0.74, reading: 0.77, logic: 0.72, attention: 0.75 },
    levels: { number: 12, word: 11, memory: 13, reading: 12, logic: 11, attention: 12 },
    xp: 2140,
    badges: ["First Steps", "All Six Domains"],
  },
  {
    id: "stu-thabo",
    name: "Thabo Zwane",
    email: "20887766@dut4life.ac.za",
    studentNumber: "20887766",
    faculty: "Arts & Design",
    year: "4th year",
    seed: 59,
    strength: { number: 0.63, word: 0.41, memory: 0.52, reading: 0.44, logic: 0.68, attention: 0.58 },
    levels: { number: 17, word: 9, memory: 13, reading: 8, logic: 19, attention: 15 },
    xp: 3390,
    badges: ["First Steps", "Comeback Kid"],
  },
  {
    id: "stu-nomvula",
    name: "Nomvula Dube",
    email: "22556677@dut4life.ac.za",
    studentNumber: "22556677",
    faculty: "Applied Sciences",
    year: "2nd year",
    seed: 71,
    strength: { number: 0.79, word: 0.81, memory: 0.83, reading: 0.86, logic: 0.8, attention: 0.62 },
    levels: { number: 25, word: 27, memory: 29, reading: 31, logic: 24, attention: 18 },
    xp: 6640,
    badges: ["Streak x5", "Reading Ranger", "Checkpoint Clear"],
  },
];

function buildProgress(spec: SeedSpec): StudentProgress {
  const rnd = mulberry(spec.seed);
  const progress = emptyProgress();
  progress.xp = spec.xp;
  progress.streak = 1 + Math.floor(rnd() * 8);
  progress.badges = spec.badges;
  progress.lastPlayedDay = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  DOMAIN_IDS.forEach((domain) => {
    const level = spec.levels[domain] ?? 1;
    const base = spec.strength[domain] ?? 0.6;
    progress.levels[domain] = level;
    const count = 18 + Math.floor(rnd() * 14);
    for (let i = 0; i < count; i++) {
      const drift = (rnd() - 0.5) * 0.22;
      const correct = rnd() < Math.max(0.15, Math.min(0.96, base + drift));
      const speed = 2600 + (1 - base) * 5200 + rnd() * 3000;
      const at = new Date(Date.now() - (count - i) * 3600_000 * 6).toISOString();
      progress.attempts.push({
        id: `${spec.id}-${domain}-${i}`,
        domain,
        level: Math.max(1, level - Math.floor((count - i) / 4)),
        taskKind: "mcq",
        correct,
        responseMs: Math.round(speed),
        attempts: correct ? 1 : 1 + Math.round(rnd()),
        hintUsed: rnd() < (1 - base) * 0.4,
        isCheckpoint: false,
        at,
      } satisfies AttemptRecord);
    }
    const checkpoints = Math.floor(level / 10);
    for (let c = 1; c <= checkpoints; c++) {
      const acc = Math.round(Math.max(20, Math.min(100, (base + (rnd() - 0.5) * 0.2) * 100)));
      const gameplay = Math.round(base * 100);
      progress.checkpoints.push({
        id: `${spec.id}-${domain}-cp${c}`,
        domain,
        atLevel: c * 10,
        accuracy: acc,
        gameplayAccuracy: gameplay,
        consistency: Math.max(0, 100 - Math.abs(acc - gameplay)),
        at: new Date(Date.now() - (checkpoints - c + 1) * 86400000 * 3).toISOString(),
      });
    }
  });

  return progress;
}

export function seedUsers(): SqUser[] {
  const students: SqUser[] = SPECS.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    role: "student",
    studentNumber: s.studentNumber,
    faculty: s.faculty,
    yearOfStudy: s.year,
    consentShare: true,
    createdAt: new Date(Date.now() - 86400000 * 40).toISOString(),
  }));

  return [
    ...students,
    {
      id: "staff-01",
      name: "Ms. Zanele Khumalo",
      email: "staff@dut.ac.za",
      role: "staff",
      consentShare: true,
      createdAt: new Date(Date.now() - 86400000 * 120).toISOString(),
    },
    {
      id: "admin-01",
      name: "Dev Naidoo",
      email: "admin@dut.ac.za",
      role: "admin",
      consentShare: true,
      createdAt: new Date(Date.now() - 86400000 * 200).toISOString(),
    },
  ];
}

export function seedProgress(): Record<string, StudentProgress> {
  return Object.fromEntries(SPECS.map((s) => [s.id, buildProgress(s)]));
}

export function seedNotes(): CaseNote[] {
  return [
    {
      id: "n1",
      studentId: "stu-lindiwe",
      author: "Ms. Zanele Khumalo",
      action: "Contacted student",
      note: "Emailed an invitation to a support conversation. Numeracy and attention patterns are consistent across three sessions.",
      at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: "n2",
      studentId: "stu-thabo",
      author: "Ms. Zanele Khumalo",
      action: "Recommended assessment",
      note: "Reading and word-skill indicators repeated. Referred for a professional literacy assessment.",
      at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ];
}

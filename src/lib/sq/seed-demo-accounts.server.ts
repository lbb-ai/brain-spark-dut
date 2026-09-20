import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DEMO_PASSWORD = "SkillQuestDemo1!";

const DEMO_ACCOUNTS = [
  {
    label: "Student — Lindiwe Mkhize",
    email: "demo.student@dut4life.ac.za",
    name: "Lindiwe Mkhize",
    role: "student" as const,
    studentNumber: "DEMO0001",
    faculty: "Accounting & Informatics",
    yearOfStudy: "2nd year",
    seed: 11,
    levels: { number: 14, word: 23, memory: 18, reading: 26, logic: 21, attention: 12 },
    strengths: { number: 0.42, word: 0.78, memory: 0.66, reading: 0.82, logic: 0.74, attention: 0.48 },
  },
  {
    label: "Student — Sipho Ndlovu",
    email: "demo.sipho@dut4life.ac.za",
    name: "Sipho Ndlovu",
    role: "student" as const,
    studentNumber: "DEMO0002",
    faculty: "Engineering & Built Environment",
    yearOfStudy: "3rd year",
    seed: 27,
    levels: { number: 34, word: 16, memory: 22, reading: 14, logic: 31, attention: 19 },
    strengths: { number: 0.86, word: 0.55, memory: 0.72, reading: 0.51, logic: 0.83, attention: 0.69 },
  },
  {
    label: "Student — Nomvula Dube",
    email: "demo.nomvula@dut4life.ac.za",
    name: "Nomvula Dube",
    role: "student" as const,
    studentNumber: "DEMO0003",
    faculty: "Applied Sciences",
    yearOfStudy: "2nd year",
    seed: 71,
    levels: { number: 25, word: 27, memory: 29, reading: 31, logic: 24, attention: 18 },
    strengths: { number: 0.79, word: 0.81, memory: 0.83, reading: 0.86, logic: 0.8, attention: 0.62 },
  },
  {
    label: "Student — Thabo Zwane",
    email: "demo.thabo@dut4life.ac.za",
    name: "Thabo Zwane",
    role: "student" as const,
    studentNumber: "DEMO0004",
    faculty: "Arts & Design",
    yearOfStudy: "4th year",
    seed: 59,
    levels: { number: 17, word: 9, memory: 13, reading: 8, logic: 19, attention: 15 },
    strengths: { number: 0.63, word: 0.41, memory: 0.52, reading: 0.44, logic: 0.68, attention: 0.58 },
  },
  {
    label: "Student — Zodwa Mthembu",
    email: "demo.zodwa@dut4life.ac.za",
    name: "Zodwa Mthembu",
    role: "student" as const,
    studentNumber: "DEMO0005",
    faculty: "Health Sciences",
    yearOfStudy: "1st year",
    seed: 43,
    levels: { number: 6, word: 8, memory: 7, reading: 5, logic: 9, attention: 6 },
    strengths: { number: 0.58, word: 0.63, memory: 0.61, reading: 0.55, logic: 0.67, attention: 0.59 },
  },
  {
    label: "Student — Aphiwe Dlamini",
    email: "demo.aphiwe@dut4life.ac.za",
    name: "Aphiwe Dlamini",
    role: "student" as const,
    studentNumber: "DEMO0006",
    faculty: "Management Sciences",
    yearOfStudy: "1st year",
    seed: 83,
    levels: { number: 20, word: 19, memory: 16, reading: 22, logic: 18, attention: 21 },
    strengths: { number: 0.7, word: 0.74, memory: 0.64, reading: 0.76, logic: 0.61, attention: 0.72 },
  },
  {
    label: "Staff — Zanele Khumalo",
    email: "demo.staff@dut4life.ac.za",
    name: "Zanele Khumalo",
    role: "staff" as const,
    studentNumber: null,
    faculty: "Disability Unit",
    yearOfStudy: null,
  },
  {
    label: "Admin — Nomsa Dlamini",
    email: "demo.admin@dut4life.ac.za",
    name: "Nomsa Dlamini",
    role: "admin" as const,
    studentNumber: null,
    faculty: "Student Affairs",
    yearOfStudy: null,
  },
] as const;

type StudentAccount = (typeof DEMO_ACCOUNTS)[number] & { role: "student" };
const DOMAIN_IDS = ["number", "word", "memory", "reading", "logic", "attention"] as const;

function random(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function studentRows(account: StudentAccount, userId: string) {
  const rnd = random(account.seed);
  const now = Date.now();
  const attempts: Record<string, unknown>[] = [];
  const runs: Record<string, unknown>[] = [];
  const checkpoints: Record<string, unknown>[] = [];

  for (const domain of DOMAIN_IDS) {
    const level = account.levels[domain] ?? 1;
    const strength = account.strengths[domain] ?? 0.6;
    const count = 8 + Math.floor(rnd() * 12);
    for (let i = 0; i < count; i++) {
      attempts.push({ user_id: userId, domain, level: Math.max(1, level - Math.floor((count - i) / 4)), task_kind: "mcq", correct: rnd() < strength, response_ms: Math.round(2800 + (1 - strength) * 4000 + rnd() * 1800), attempts: 1, hint_used: rnd() < (1 - strength) * 0.35, is_checkpoint: false, at: new Date(now - (count - i) * 86400000).toISOString() });
    }
    for (let i = 1; i <= Math.max(1, Math.floor(level / 10)); i++) {
      const accuracy = Math.round(Math.max(25, Math.min(98, strength * 100 + (rnd() - 0.5) * 12)));
      checkpoints.push({ user_id: userId, domain, at_level: i * 10, accuracy, gameplay_accuracy: Math.round(strength * 100), consistency: Math.max(0, 100 - Math.abs(accuracy - Math.round(strength * 100))), at: new Date(now - (Math.floor(level / 10) - i + 1) * 3 * 86400000).toISOString() });
    }
    runs.push({ user_id: userId, domain, level, accuracy: Math.round(strength * 100), avg_response_ms: Math.round(3500 + (1 - strength) * 3000), duration_ms: 90000 + Math.round(rnd() * 90000), retried: strength < 0.55 });
  }
  return { attempts, runs, checkpoints, progress: { user_id: userId, xp: Object.values(account.levels).reduce((sum, level) => sum + level, 0) * 100, streak: 2 + Math.floor(rnd() * 6), last_played_day: new Date(now - 86400000).toISOString().slice(0, 10), badges: ["First Steps", "Checkpoint Clear"], levels: account.levels } };
}

export const seedDemoAccounts = createServerFn({ method: "POST" }).handler(async () => {
  const results: { label: string; email: string; status: string; error?: string }[] = [];

  for (const acc of DEMO_ACCOUNTS) {
    try {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({ email: acc.email, password: DEMO_PASSWORD, email_confirm: true, user_metadata: { name: acc.name, student_number: acc.studentNumber, faculty: acc.faculty, year_of_study: acc.yearOfStudy, consent_share: true, role: acc.role } });
      let userId: string;
      if (createErr) {
        if (!createErr.message.includes("already") && !createErr.message.includes("been registered")) throw createErr;
        const { data: existing, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
        const found = existing?.users.find((u) => u.email?.toLowerCase() === acc.email.toLowerCase());
        if (listErr || !found) throw new Error(listErr?.message ?? "User exists but could not be found");
        userId = found.id;
      } else userId = created.user.id;

      const { error: profileErr } = await supabaseAdmin.from("profiles").upsert({ id: userId, email: acc.email, name: acc.name, student_number: acc.studentNumber, faculty: acc.faculty, year_of_study: acc.yearOfStudy, consent_share: true }, { onConflict: "id" });
      if (profileErr) throw new Error(`Profile: ${profileErr.message}`);
      const { error: roleErr } = await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: acc.role }, { onConflict: "user_id" });
      if (roleErr) throw new Error(`Role: ${roleErr.message}`);

      if (acc.role === "student") {
        const rows = studentRows(acc as StudentAccount, userId);
        await supabaseAdmin.from("progress").upsert(rows.progress, { onConflict: "user_id" });
        await supabaseAdmin.from("attempts").delete().eq("user_id", userId);
        await supabaseAdmin.from("level_runs").delete().eq("user_id", userId);
        await supabaseAdmin.from("checkpoints").delete().eq("user_id", userId);
        await supabaseAdmin.from("attempts").insert(rows.attempts);
        await supabaseAdmin.from("level_runs").insert(rows.runs);
        await supabaseAdmin.from("checkpoints").insert(rows.checkpoints);
      }
      results.push({ label: acc.label, email: acc.email, status: "ok" });
    } catch (err) {
      results.push({ label: acc.label, email: acc.email, status: "error", error: err instanceof Error ? err.message : "Unknown error" });
    }
  }
  return { results };
});

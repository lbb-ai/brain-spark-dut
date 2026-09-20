import { seedProgress, seedUsers } from "@/lib/sq/seed";
import type { DomainId } from "@/lib/sq/domains";

const DEMO_SESSION_KEY = "skillquest.local-demo-session.v1";
const DEMO_PASSWORD = "SkillQuestDemo1!";
const ADMIN_EMAIL = "22418104@dut4life.ac.za";

const accounts = [
  { id: "local-admin-bhengu", email: ADMIN_EMAIL, name: "Mr Bhengu", role: "admin" as const, password: "group21" },
  { id: "stu-lindiwe", email: "demo.lindiwe@dut4life.ac.za", name: "Lindiwe Mkhize", role: "student" as const, password: DEMO_PASSWORD },
  { id: "stu-sipho", email: "demo.sipho@dut4life.ac.za", name: "Sipho Ndlovu", role: "student" as const, password: DEMO_PASSWORD },
  { id: "stu-nomvula", email: "demo.nomvula@dut4life.ac.za", name: "Nomvula Dube", role: "student" as const, password: DEMO_PASSWORD },
  { id: "stu-thabo", email: "demo.thabo@dut4life.ac.za", name: "Thabo Zwane", role: "student" as const, password: DEMO_PASSWORD },
  { id: "stu-zodwa", email: "demo.zodwa@dut4life.ac.za", name: "Zodwa Mthembu", role: "student" as const, password: DEMO_PASSWORD },
  { id: "stu-aphiwe", email: "demo.aphiwe@dut4life.ac.za", name: "Aphiwe Dlamini", role: "student" as const, password: DEMO_PASSWORD },
  { id: "local-staff-zanele", email: "demo.staff@dut4life.ac.za", name: "Zanele Khumalo", role: "staff" as const, password: DEMO_PASSWORD },
  { id: "local-admin-nomsa", email: "demo.nomsa@dut4life.ac.za", name: "Nomsa Dlamini", role: "admin" as const, password: DEMO_PASSWORD },
] as const;

const users = [...seedUsers().filter((u) => u.role === "student"), ...accounts.filter((a) => a.role !== "student").map((a) => ({ id: a.id, name: a.name, email: a.email, role: a.role, consentShare: true, createdAt: new Date(0).toISOString() }))];
const progress = seedProgress();

for (const account of accounts.filter((a) => a.role === "student")) {
  if (!progress[account.id]) progress[account.id] = { xp: 1200, streak: 3, lastPlayedDay: new Date().toISOString().slice(0, 10), badges: ["First Steps"], levels: { number: 8, word: 8, memory: 8, reading: 8, logic: 8, attention: 8 }, attempts: [], levelRuns: [], checkpoints: [], reports: [] };
}

function sessionFor(email: string) {
  const account = accounts.find((a) => a.email === email);
  if (!account) return null;
  const user = { id: account.id, email: account.email, aud: "authenticated", role: "authenticated", user_metadata: { name: account.name, role: account.role, demo: true }, app_metadata: {}, created_at: new Date(0).toISOString(), updated_at: new Date().toISOString() };
  return { access_token: `local.${email}`, token_type: "bearer", expires_in: 31536000, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: `local-refresh-${email}`, user };
}

function currentEmail() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(DEMO_SESSION_KEY);
}

function rowsFor(table: string): unknown[] {
  if (table === "profiles") return users.map((u) => ({ id: u.id, email: u.email, name: u.name, student_number: u.studentNumber ?? null, faculty: u.faculty ?? null, year_of_study: u.yearOfStudy ?? null, consent_share: u.consentShare, created_at: u.createdAt }));
  if (table === "user_roles") return users.map((u) => ({ user_id: u.id, role: u.role }));
  if (table === "progress") return Object.entries(progress).map(([user_id, p]) => ({ user_id, xp: p.xp, streak: p.streak, last_played_day: p.lastPlayedDay, badges: p.badges, levels: p.levels }));
  if (table === "attempts") return Object.entries(progress).flatMap(([user_id, p]) => p.attempts.map((a) => ({ user_id, id: a.id, domain: a.domain, level: a.level, task_kind: a.taskKind, correct: a.correct, response_ms: a.responseMs, attempts: a.attempts, hint_used: a.hintUsed, is_checkpoint: a.isCheckpoint, at: a.at })));
  if (table === "level_runs") return Object.entries(progress).flatMap(([user_id, p]) => p.levelRuns.map((r) => ({ user_id, ...r, avg_response_ms: r.avgResponseMs, duration_ms: r.durationMs })));
  if (table === "checkpoints") return Object.entries(progress).flatMap(([user_id, p]) => p.checkpoints.map((c) => ({ user_id, id: c.id, domain: c.domain, at_level: c.atLevel, accuracy: c.accuracy, gameplay_accuracy: c.gameplayAccuracy, consistency: c.consistency, at: c.at })));
  return [];
}

function query(table: string) {
  let data = rowsFor(table);
  const api = {
    select: () => api,
    eq: (column: string, value: unknown) => { data = data.filter((row) => (row as Record<string, unknown>)[column] === value); return api; },
    order: () => api,
    limit: (count: number) => { data = data.slice(0, count); return api; },
    maybeSingle: async () => ({ data: data[0] ?? null, error: null }),
    single: async () => ({ data: data[0] ?? null, error: null }),
    insert: async (value: unknown) => ({ data: value, error: null }),
    update: async () => ({ data: null, error: null }),
    upsert: async () => ({ data: null, error: null }),
    delete: () => api,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve),
  };
  return api;
}

export const localSupabase = {
  auth: {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const account = accounts.find((a) => a.email === email.trim().toLowerCase());
      if (!account || account.password !== password) return { data: { user: null, session: null }, error: { message: "Invalid login credentials" } };
      if (typeof window !== "undefined") window.localStorage.setItem(DEMO_SESSION_KEY, account.email);
      const session = sessionFor(account.email)!;
      return { data: { user: session.user, session }, error: null };
    },
    getSession: async () => ({ data: { session: currentEmail() ? sessionFor(currentEmail()!) : null }, error: null }),
    getUser: async () => ({ data: { user: currentEmail() ? sessionFor(currentEmail()!)?.user : null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    signOut: async () => { if (typeof window !== "undefined") window.localStorage.removeItem(DEMO_SESSION_KEY); return { error: null }; },
    resetPasswordForEmail: async () => ({ error: null }),
  },
  from: query,
  functions: { invoke: async () => ({ data: null, error: null }) },
};

export const demoLocalUsers = accounts;
export const isDemoLocalMode = true;
export type LocalDomain = DomainId;

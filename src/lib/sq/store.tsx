import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { DOMAIN_IDS, type DomainId } from "./domains";
import { buildReport } from "./analysis";
import { emptyProgress } from "./seed";
import { sendReferralEmail } from "./referral-email.server";
import type {
  AccessibilitySettings,
  AttemptRecord,
  AuditEntry,
  CaseNote,
  DomainSummary,
  LevelRecord,
  Referral,
  ScreeningReport,
  SqUser,
  StudentProgress,
} from "./types";

const SETTINGS_KEY = "skillquest.settings.v1";

interface SqState {
  users: SqUser[];
  progress: Record<string, StudentProgress>;
  notes: CaseNote[];
  audit: AuditEntry[];
  referrals: Referral[];
  settings: AccessibilitySettings;
  gamesEnabled: Record<DomainId, boolean>;
}

const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  largeText: false,
  reduceMotion: false,
  dyslexiaFont: false,
  sound: true,
};

function initialState(): SqState {
  return {
    users: [],
    progress: {},
    notes: [],
    audit: [],
    referrals: [],
    settings: defaultSettings,
    gamesEnabled: Object.fromEntries(DOMAIN_IDS.map((d) => [d, true])) as Record<
      DomainId,
      boolean
    >,
  };
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  studentNumber: string;
  faculty: string;
  yearOfStudy: string;
  consentShare: boolean;
}

interface SqContextValue {
  ready: boolean;
  state: SqState;
  currentUser: SqUser | null;
  progress: StudentProgress;
  progressFor: (id: string) => StudentProgress;
  login: (email: string, password: string) => Promise<{ user: SqUser | null; error?: string }>;
  register: (input: RegisterInput) => Promise<{ user: SqUser | null; error?: string; needsEmailConfirmation?: boolean }>;
  logout: () => Promise<void>;
  recordAttempts: (attempts: Omit<AttemptRecord, "id" | "at">[]) => void;
  recordLevelRun: (run: Omit<LevelRecord, "at">) => void;
  recordCheckpoint: (input: {
    domain: DomainId;
    atLevel: number;
    accuracy: number;
    gameplayAccuracy: number;
  }) => void;
  setLevel: (domain: DomainId, level: number) => void;
  addXp: (amount: number) => void;
  awardBadge: (badge: string) => void;
  generateReport: () => ScreeningReport;
  addNote: (note: Omit<CaseNote, "id" | "at">) => void;
  requestReferral: (input: { message: string; contactPreference: string }) => Promise<string | null>;
  setReferralStatus: (id: string, status: string) => void;
  updateSettings: (patch: Partial<AccessibilitySettings>) => void;
  toggleGame: (domain: DomainId) => void;
  setUserRole: (id: string, role: SqUser["role"]) => void;
  removeUser: (id: string) => void;
  setConsent: (value: boolean) => void;
  log: (action: string) => void;
  refresh: () => Promise<void>;
}

const SqContext = createContext<SqContextValue | null>(null);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function levelsFromJson(value: unknown): Record<DomainId, number> {
  const base = Object.fromEntries(DOMAIN_IDS.map((d) => [d, 1])) as Record<DomainId, number>;
  if (value && typeof value === "object") {
    for (const d of DOMAIN_IDS) {
      const v = (value as Record<string, unknown>)[d];
      if (typeof v === "number" && v > 0) base[d] = v;
    }
  }
  return base;
}

export function SqProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SqState>(initialState);
  const [currentUser, setCurrentUser] = useState<SqUser | null>(null);
  const [ready, setReady] = useState(false);
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = currentUser?.id ?? null;

  /* ---------------- accessibility settings (device-local) ---------------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AccessibilitySettings>;
        setState((s) => ({ ...s, settings: { ...defaultSettings, ...parsed } }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    } catch {
      /* quota */
    }
    const el = document.documentElement;
    el.classList.toggle("sq-contrast", state.settings.highContrast);
    el.classList.toggle("sq-large-text", state.settings.largeText);
    el.classList.toggle("sq-reduce-motion", state.settings.reduceMotion);
    el.classList.toggle("sq-dyslexic", state.settings.dyslexiaFont);
  }, [state.settings]);

  /* ---------------- data loading ---------------- */

  const loadAll = useCallback(async (userId: string) => {
    const [profilesRes, rolesRes, progressRes, attemptsRes, runsRes, cpRes, reportsRes, notesRes, refRes, gamesRes, auditRes] =
      await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("progress").select("*"),
        supabase.from("attempts").select("*").order("at", { ascending: true }).limit(2000),
        supabase.from("level_runs").select("*").order("at", { ascending: true }).limit(1000),
        supabase.from("checkpoints").select("*").order("at", { ascending: true }).limit(500),
        supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("case_notes").select("*").order("at", { ascending: false }).limit(200),
        supabase.from("referrals").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("game_settings").select("*"),
        supabase.from("audit_log").select("*").order("at", { ascending: false }).limit(120),
      ]);

    const roleMap = new Map<string, SqUser["role"]>();
    for (const r of rolesRes.data ?? []) {
      const role = r.role as SqUser["role"];
      const existing = roleMap.get(r.user_id);
      const rank = { student: 0, staff: 1, admin: 2 } as const;
      if (!existing || rank[role] > rank[existing]) roleMap.set(r.user_id, role);
    }

    const users: SqUser[] = (profilesRes.data ?? []).map((p) => ({
      id: p.id,
      name: p.name || p.email,
      email: p.email,
      role: roleMap.get(p.id) ?? "student",
      studentNumber: p.student_number ?? undefined,
      faculty: p.faculty ?? undefined,
      yearOfStudy: p.year_of_study ?? undefined,
      consentShare: p.consent_share,
      createdAt: p.created_at,
    }));

    const progress: Record<string, StudentProgress> = {};
    const ensure = (id: string) => (progress[id] ??= emptyProgress());

    for (const row of progressRes.data ?? []) {
      const p = ensure(row.user_id);
      p.xp = row.xp;
      p.streak = row.streak;
      p.lastPlayedDay = row.last_played_day;
      p.badges = row.badges ?? [];
      p.levels = levelsFromJson(row.levels);
    }
    for (const a of attemptsRes.data ?? []) {
      ensure(a.user_id).attempts.push({
        id: a.id,
        domain: a.domain as DomainId,
        level: a.level,
        taskKind: a.task_kind,
        correct: a.correct,
        responseMs: a.response_ms,
        attempts: a.attempts,
        hintUsed: a.hint_used,
        isCheckpoint: a.is_checkpoint,
        at: a.at,
      });
    }
    for (const r of runsRes.data ?? []) {
      ensure(r.user_id).levelRuns.push({
        domain: r.domain as DomainId,
        level: r.level,
        accuracy: r.accuracy,
        avgResponseMs: r.avg_response_ms,
        durationMs: r.duration_ms,
        retried: r.retried,
        at: r.at,
      });
    }
    for (const c of cpRes.data ?? []) {
      ensure(c.user_id).checkpoints.push({
        id: c.id,
        domain: c.domain as DomainId,
        atLevel: c.at_level,
        accuracy: c.accuracy,
        gameplayAccuracy: c.gameplay_accuracy,
        consistency: c.consistency,
        at: c.at,
      });
    }
    for (const r of reportsRes.data ?? []) {
      ensure(r.user_id).reports.push({
        id: r.id,
        studentId: r.user_id,
        createdAt: r.created_at,
        domains: (r.domains ?? []) as unknown as DomainSummary[],
        overall: r.overall as ScreeningReport["overall"],
        summaryText: r.summary_text,
        totalAttempts: r.total_attempts,
      });
    }
    ensure(userId);

    const gamesEnabled = Object.fromEntries(DOMAIN_IDS.map((d) => [d, true])) as Record<
      DomainId,
      boolean
    >;
    for (const g of gamesRes.data ?? []) {
      if (DOMAIN_IDS.includes(g.domain as DomainId)) {
        gamesEnabled[g.domain as DomainId] = g.enabled;
      }
    }

    setState((s) => ({
      ...s,
      users,
      progress,
      gamesEnabled,
      notes: (notesRes.data ?? []).map((n) => ({
        id: n.id,
        studentId: n.student_id,
        author: n.author,
        action: n.action,
        note: n.note,
        at: n.at,
      })),
      referrals: (refRes.data ?? []).map((r) => ({
        id: r.id,
        studentId: r.student_id,
        message: r.message,
        contactPreference: r.contact_preference,
        status: r.status,
        emailStatus: r.email_status,
        createdAt: r.created_at,
      })),
      audit: (auditRes.data ?? []).map((a) => ({
        id: a.id,
        actor: a.actor,
        action: a.action,
        at: a.at,
      })),
    }));
  }, []);

  const hydrateSession = useCallback(
    async (userId: string | null) => {
      if (!userId) {
        setCurrentUser(null);
        setState(initialState);
        setReady(true);
        return;
      }
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);

      // Auto-create profile + role if missing (e.g. after email confirmation
      // when no database trigger exists to seed them at signup time).
      let profileData = profile;
      let rolesData = roles;
      if (!profileData) {
        const { data: authUser } = await supabase.auth.getUser();
        const meta = (authUser?.user?.user_metadata ?? {}) as Record<string, unknown>;
        const { data: inserted } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            email: authUser?.user?.email ?? "",
            name: (meta.name as string) ?? authUser?.user?.email ?? "",
            student_number: (meta.student_number as string) ?? null,
            faculty: (meta.faculty as string) ?? null,
            year_of_study: (meta.year_of_study as string) ?? null,
            consent_share: (meta.consent_share as boolean) ?? false,
          })
          .select("*")
          .maybeSingle();
        if (inserted) profileData = inserted;
        await supabase.from("user_roles").insert({ user_id: userId, role: "student" });
        const { data: newRoles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);
        rolesData = newRoles;
      }

      const rank = { student: 0, staff: 1, admin: 2 } as const;
      let role: SqUser["role"] = "student";
      for (const r of rolesData ?? []) {
        const candidate = r.role as SqUser["role"];
        if (rank[candidate] > rank[role]) role = candidate;
      }
      if (profileData) {
        setCurrentUser({
          id: profileData.id,
          name: profileData.name || profileData.email,
          email: profileData.email,
          role,
          studentNumber: profileData.student_number ?? undefined,
          faculty: profileData.faculty ?? undefined,
          yearOfStudy: profileData.year_of_study ?? undefined,
          consentShare: profileData.consent_share,
          createdAt: profileData.created_at,
        });
      }
      await loadAll(userId);
      setReady(true);
    },
    [loadAll],
  );

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      void hydrateSession(data.session?.user.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void hydrateSession(session?.user.id ?? null);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [hydrateSession]);

  const progressFor = useCallback(
    (id: string) => state.progress[id] ?? emptyProgress(),
    [state.progress],
  );

  const progress = useMemo(
    () => (currentUser ? progressFor(currentUser.id) : emptyProgress()),
    [currentUser, progressFor],
  );

  const log = useCallback((action: string) => {
    const id = userIdRef.current;
    if (!id) return;
    setState((s) => ({
      ...s,
      audit: [
        {
          id: `tmp-${Date.now().toString(36)}`,
          actor: s.users.find((u) => u.id === id)?.name ?? "user",
          action,
          at: new Date().toISOString(),
        },
        ...s.audit,
      ].slice(0, 120),
    }));
    const actor = state.users.find((u) => u.id === id)?.name ?? "";
    void supabase.from("audit_log").insert({ actor_id: id, actor, action });
  }, [state.users]);

  const mutateProgress = useCallback(
    (fn: (p: StudentProgress) => StudentProgress) => {
      const id = userIdRef.current;
      if (!id) return;
      setState((s) => ({
        ...s,
        progress: { ...s.progress, [id]: fn(s.progress[id] ?? emptyProgress()) },
      }));
    },
    [],
  );

  const persistProgress = useCallback((patch: Record<string, unknown>) => {
    const id = userIdRef.current;
    if (!id) return;
    void supabase
      .from("progress")
      .upsert({ user_id: id, ...patch, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  }, []);

  const value: SqContextValue = {
    ready,
    state,
    currentUser,
    progress,
    progressFor,

    login: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error || !data.user) return { user: null, error: error?.message ?? "Sign in failed" };
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      const rank = { student: 0, staff: 1, admin: 2 } as const;
      let role: SqUser["role"] = "student";
      for (const r of roles ?? []) {
        const c = r.role as SqUser["role"];
        if (rank[c] > rank[role]) role = c;
      }
      const user: SqUser = {
        id: data.user.id,
        name: profile?.name || data.user.email || "",
        email: profile?.email || data.user.email || "",
        role,
        studentNumber: profile?.student_number ?? undefined,
        faculty: profile?.faculty ?? undefined,
        yearOfStudy: profile?.year_of_study ?? undefined,
        consentShare: profile?.consent_share ?? false,
        createdAt: profile?.created_at ?? new Date().toISOString(),
      };
      setCurrentUser(user);
      void loadAll(user.id);
      return { user };
    },

    register: async (input) => {
      const { data, error } = await supabase.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            name: input.name,
            student_number: input.studentNumber,
            faculty: input.faculty,
            year_of_study: input.yearOfStudy,
            consent_share: input.consentShare,
          },
        },
      });
      if (error || !data.user) return { user: null, error: error?.message ?? "Sign up failed" };
      // Email confirmation is enabled — no session is returned until the user
      // verifies their email. Tell the UI to show a "check your inbox" state.
      if (!data.session) {
        return { user: null, needsEmailConfirmation: true };
      }
      const user: SqUser = {
        id: data.user.id,
        name: input.name,
        email: input.email.trim(),
        role: "student",
        studentNumber: input.studentNumber,
        faculty: input.faculty,
        yearOfStudy: input.yearOfStudy,
        consentShare: input.consentShare,
        createdAt: new Date().toISOString(),
      };
      setCurrentUser(user);
      void loadAll(user.id);
      return { user };
    },

    logout: async () => {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setState(initialState);
    },

    recordAttempts: (attempts) => {
      const id = userIdRef.current;
      if (!id) return;
      const rows = attempts.map((a) => ({
        user_id: id,
        domain: a.domain,
        level: a.level,
        task_kind: a.taskKind,
        correct: a.correct,
        response_ms: Math.round(a.responseMs),
        attempts: a.attempts,
        hint_used: a.hintUsed,
        is_checkpoint: a.isCheckpoint,
      }));
      mutateProgress((p) => ({
        ...p,
        attempts: [
          ...p.attempts,
          ...attempts.map((a, i) => ({
            ...a,
            id: `tmp${Date.now().toString(36)}${i}`,
            at: new Date().toISOString(),
          })),
        ].slice(-800),
      }));
      void supabase.from("attempts").insert(rows);
    },

    recordLevelRun: (run) => {
      const id = userIdRef.current;
      if (!id) return;
      let nextStreak = 1;
      let nextDay = todayKey();
      mutateProgress((p) => {
        const day = todayKey();
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const streak =
          p.lastPlayedDay === day ? p.streak : p.lastPlayedDay === yesterday ? p.streak + 1 : 1;
        nextStreak = streak;
        nextDay = day;
        return {
          ...p,
          streak,
          lastPlayedDay: day,
          levelRuns: [...p.levelRuns, { ...run, at: new Date().toISOString() }].slice(-300),
        };
      });
      void supabase.from("level_runs").insert({
        user_id: id,
        domain: run.domain,
        level: run.level,
        accuracy: run.accuracy,
        avg_response_ms: Math.round(run.avgResponseMs),
        duration_ms: Math.round(run.durationMs),
        retried: run.retried,
      });
      persistProgress({ streak: nextStreak, last_played_day: nextDay });
    },

    recordCheckpoint: ({ domain, atLevel, accuracy, gameplayAccuracy }) => {
      const id = userIdRef.current;
      if (!id) return;
      const consistency = Math.max(0, 100 - Math.abs(accuracy - gameplayAccuracy));
      mutateProgress((p) => ({
        ...p,
        checkpoints: [
          ...p.checkpoints,
          {
            id: `cp${Date.now().toString(36)}`,
            domain,
            atLevel,
            accuracy,
            gameplayAccuracy,
            consistency,
            at: new Date().toISOString(),
          },
        ],
      }));
      void supabase.from("checkpoints").insert({
        user_id: id,
        domain,
        at_level: atLevel,
        accuracy,
        gameplay_accuracy: gameplayAccuracy,
        consistency,
      });
    },

    setLevel: (domain, level) => {
      let levels: Record<DomainId, number> | null = null;
      mutateProgress((p) => {
        levels = { ...p.levels, [domain]: Math.max(1, level) };
        return { ...p, levels };
      });
      if (levels) persistProgress({ levels });
    },

    addXp: (amount) => {
      let xp = 0;
      mutateProgress((p) => {
        xp = p.xp + amount;
        return { ...p, xp };
      });
      persistProgress({ xp });
    },

    awardBadge: (badge) => {
      let badges: string[] | null = null;
      mutateProgress((p) => {
        if (p.badges.includes(badge)) return p;
        badges = [...p.badges, badge];
        return { ...p, badges };
      });
      if (badges) persistProgress({ badges });
    },

    generateReport: () => {
      const id = userIdRef.current;
      const report = buildReport(id ?? "guest", progress);
      mutateProgress((p) => ({ ...p, reports: [report, ...p.reports].slice(0, 20) }));
      if (id) {
        void supabase.from("reports").insert({
          user_id: id,
          domains: report.domains as unknown as never,
          overall: report.overall,
          summary_text: report.summaryText,
          total_attempts: report.totalAttempts,
        });
      }
      return report;
    },

    addNote: (note) => {
      const id = userIdRef.current;
      setState((s) => ({
        ...s,
        notes: [
          { ...note, id: `n${Date.now().toString(36)}`, at: new Date().toISOString() },
          ...s.notes,
        ],
      }));
      void supabase.from("case_notes").insert({
        student_id: note.studentId,
        author_id: id,
        author: note.author,
        action: note.action,
        note: note.note,
      });
    },

    requestReferral: async ({ message, contactPreference }) => {
      const id = userIdRef.current;
      if (!id) return "You need to be signed in.";
      const { data, error } = await supabase
        .from("referrals")
        .insert({ student_id: id, message, contact_preference: contactPreference })
        .select()
        .single();
      if (error || !data) return error?.message ?? "Could not send your request.";
      setState((s) => ({
        ...s,
        referrals: [
          {
            id: data.id,
            studentId: data.student_id,
            message: data.message,
            contactPreference: data.contact_preference,
            status: data.status,
            emailStatus: data.email_status,
            createdAt: data.created_at,
          },
          ...s.referrals,
        ],
      }));
      try {
        const result = await sendReferralEmail({ data: { referralId: data.id } });
        if (result.emailStatus) {
          setState((s) => ({
            ...s,
            referrals: s.referrals.map((r) =>
              r.id === data.id ? { ...r, emailStatus: result.emailStatus } : r,
            ),
          }));
        }
      } catch {
        /* in-app referral is already saved */
      }
      return null;
    },

    setReferralStatus: (id, status) => {
      setState((s) => ({
        ...s,
        referrals: s.referrals.map((r) => (r.id === id ? { ...r, status } : r)),
      }));
      void supabase
        .from("referrals")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
    },

    updateSettings: (patch) =>
      setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),

    toggleGame: (domain) => {
      const next = !state.gamesEnabled[domain];
      setState((s) => ({ ...s, gamesEnabled: { ...s.gamesEnabled, [domain]: next } }));
      void supabase.from("game_settings").update({ enabled: next }).eq("domain", domain);
    },

    setUserRole: (id, role) => {
      setState((s) => ({
        ...s,
        users: s.users.map((u) => (u.id === id ? { ...u, role } : u)),
      }));
      void supabase.functions.invoke("admin-set-role", { body: { userId: id, role } });
    },

    removeUser: (id) => {
      setState((s) => ({ ...s, users: s.users.filter((u) => u.id !== id) }));
    },

    setConsent: (v) => {
      const id = userIdRef.current;
      if (!id) return;
      setCurrentUser((u) => (u ? { ...u, consentShare: v } : u));
      setState((s) => ({
        ...s,
        users: s.users.map((u) => (u.id === id ? { ...u, consentShare: v } : u)),
      }));
      void supabase.from("profiles").update({ consent_share: v }).eq("id", id);
    },

    log,
    refresh: async () => {
      const id = userIdRef.current;
      if (id) await loadAll(id);
    },
  };

  return <SqContext.Provider value={value}>{children}</SqContext.Provider>;
}

export function useSq() {
  const ctx = useContext(SqContext);
  if (!ctx) throw new Error("useSq must be used inside SqProvider");
  return ctx;
}

export function levelFromXp(xp: number) {
  return Math.max(1, Math.floor(xp / 500) + 1);
}

export function xpIntoLevel(xp: number) {
  return xp % 500;
}

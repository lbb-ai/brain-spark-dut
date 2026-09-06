import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DOMAIN_IDS, type DomainId } from "./domains";
import { buildReport } from "./analysis";
import { emptyProgress, seedNotes, seedProgress, seedUsers } from "./seed";
import type {
  AccessibilitySettings,
  AttemptRecord,
  AuditEntry,
  CaseNote,
  LevelRecord,
  ScreeningReport,
  SqUser,
  StudentProgress,
} from "./types";

const KEY = "skillquest.v1";

interface SqState {
  users: SqUser[];
  progress: Record<string, StudentProgress>;
  notes: CaseNote[];
  audit: AuditEntry[];
  currentUserId: string | null;
  settings: AccessibilitySettings;
  gamesEnabled: Record<DomainId, boolean>;
}

function initialState(): SqState {
  return {
    users: seedUsers(),
    progress: seedProgress(),
    notes: seedNotes(),
    audit: [
      {
        id: "a1",
        actor: "system",
        action: "Platform initialised with demo cohort",
        at: new Date(Date.now() - 86400000 * 30).toISOString(),
      },
    ],
    currentUserId: null,
    settings: {
      highContrast: false,
      largeText: false,
      reduceMotion: false,
      dyslexiaFont: false,
      sound: true,
    },
    gamesEnabled: Object.fromEntries(DOMAIN_IDS.map((d) => [d, true])) as Record<
      DomainId,
      boolean
    >,
  };
}

interface SqContextValue {
  ready: boolean;
  state: SqState;
  currentUser: SqUser | null;
  progress: StudentProgress;
  progressFor: (id: string) => StudentProgress;
  login: (email: string) => SqUser | null;
  register: (input: {
    name: string;
    email: string;
    studentNumber: string;
    faculty: string;
    yearOfStudy: string;
    consentShare: boolean;
  }) => SqUser;
  logout: () => void;
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
  updateSettings: (patch: Partial<AccessibilitySettings>) => void;
  toggleGame: (domain: DomainId) => void;
  setUserRole: (id: string, role: SqUser["role"]) => void;
  removeUser: (id: string) => void;
  setConsent: (value: boolean) => void;
  log: (action: string) => void;
}

const SqContext = createContext<SqContextValue | null>(null);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function SqProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SqState>(initialState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SqState;
        // Keep anything the user already did before hydration finished
        // (e.g. signing in immediately after first paint).
        setState((live) => ({
          ...initialState(),
          ...parsed,
          currentUserId: live.currentUserId ?? parsed.currentUserId ?? null,
        }));
      }
    } catch {
      /* ignore corrupt storage */
    }
    setReady(true);
  }, []);


  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* quota */
    }
  }, [state, ready]);

  // apply accessibility preferences to <html>
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    el.classList.toggle("sq-contrast", state.settings.highContrast);
    el.classList.toggle("sq-large-text", state.settings.largeText);
    el.classList.toggle("sq-reduce-motion", state.settings.reduceMotion);
    el.classList.toggle("sq-dyslexic", state.settings.dyslexiaFont);
  }, [state.settings]);

  const currentUser = useMemo(
    () => state.users.find((u) => u.id === state.currentUserId) ?? null,
    [state.users, state.currentUserId],
  );

  const progressFor = useCallback(
    (id: string) => state.progress[id] ?? emptyProgress(),
    [state.progress],
  );

  const progress = useMemo(
    () => (currentUser ? progressFor(currentUser.id) : emptyProgress()),
    [currentUser, progressFor],
  );

  const log = useCallback((action: string) => {
    setState((s) => ({
      ...s,
      audit: [
        {
          id: `a${Date.now().toString(36)}`,
          actor: s.users.find((u) => u.id === s.currentUserId)?.name ?? "guest",
          action,
          at: new Date().toISOString(),
        },
        ...s.audit,
      ].slice(0, 120),
    }));
  }, []);

  const mutateProgress = useCallback(
    (fn: (p: StudentProgress) => StudentProgress) => {
      setState((s) => {
        if (!s.currentUserId) return s;
        const current = s.progress[s.currentUserId] ?? emptyProgress();
        return {
          ...s,
          progress: { ...s.progress, [s.currentUserId]: fn(current) },
        };
      });
    },
    [],
  );

  const value: SqContextValue = {
    ready,
    state,
    currentUser,
    progress,
    progressFor,
    login: (email) => {
      const user =
        state.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase()) ?? null;
      if (user) {
        setState((s) => ({ ...s, currentUserId: user.id }));
        log(`Signed in as ${user.role}`);
      }
      return user;
    },
    register: (input) => {
      const user: SqUser = {
        id: `stu-${Date.now().toString(36)}`,
        name: input.name,
        email: input.email,
        role: "student",
        studentNumber: input.studentNumber,
        faculty: input.faculty,
        yearOfStudy: input.yearOfStudy,
        consentShare: input.consentShare,
        createdAt: new Date().toISOString(),
      };
      setState((s) => ({
        ...s,
        users: [...s.users, user],
        progress: { ...s.progress, [user.id]: emptyProgress() },
        currentUserId: user.id,
        audit: [
          {
            id: `a${Date.now().toString(36)}`,
            actor: user.name,
            action: "Created a student account",
            at: new Date().toISOString(),
          },
          ...s.audit,
        ],
      }));
      return user;
    },
    logout: () => setState((s) => ({ ...s, currentUserId: null })),
    recordAttempts: (attempts) =>
      mutateProgress((p) => ({
        ...p,
        attempts: [
          ...p.attempts,
          ...attempts.map((a, i) => ({
            ...a,
            id: `at${Date.now().toString(36)}${i}`,
            at: new Date().toISOString(),
          })),
        ].slice(-800),
      })),
    recordLevelRun: (run) =>
      mutateProgress((p) => {
        const day = todayKey();
        const streak =
          p.lastPlayedDay === day
            ? p.streak
            : p.lastPlayedDay ===
                new Date(Date.now() - 86400000).toISOString().slice(0, 10)
              ? p.streak + 1
              : 1;
        return {
          ...p,
          streak,
          lastPlayedDay: day,
          levelRuns: [...p.levelRuns, { ...run, at: new Date().toISOString() }].slice(-300),
        };
      }),
    recordCheckpoint: ({ domain, atLevel, accuracy, gameplayAccuracy }) =>
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
            consistency: Math.max(0, 100 - Math.abs(accuracy - gameplayAccuracy)),
            at: new Date().toISOString(),
          },
        ],
      })),
    setLevel: (domain, level) =>
      mutateProgress((p) => ({
        ...p,
        levels: { ...p.levels, [domain]: Math.max(1, level) },
      })),
    addXp: (amount) => mutateProgress((p) => ({ ...p, xp: p.xp + amount })),
    awardBadge: (badge) =>
      mutateProgress((p) =>
        p.badges.includes(badge) ? p : { ...p, badges: [...p.badges, badge] },
      ),
    generateReport: () => {
      const report = buildReport(currentUser?.id ?? "guest", progress);
      mutateProgress((p) => ({ ...p, reports: [report, ...p.reports].slice(0, 20) }));
      return report;
    },
    addNote: (note) =>
      setState((s) => ({
        ...s,
        notes: [
          { ...note, id: `n${Date.now().toString(36)}`, at: new Date().toISOString() },
          ...s.notes,
        ],
      })),
    updateSettings: (patch) =>
      setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
    toggleGame: (domain) =>
      setState((s) => ({
        ...s,
        gamesEnabled: { ...s.gamesEnabled, [domain]: !s.gamesEnabled[domain] },
      })),
    setUserRole: (id, role) =>
      setState((s) => ({
        ...s,
        users: s.users.map((u) => (u.id === id ? { ...u, role } : u)),
      })),
    removeUser: (id) =>
      setState((s) => ({ ...s, users: s.users.filter((u) => u.id !== id) })),
    setConsent: (v) =>
      setState((s) => ({
        ...s,
        users: s.users.map((u) =>
          u.id === s.currentUserId ? { ...u, consentShare: v } : u,
        ),
      })),
    log,
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

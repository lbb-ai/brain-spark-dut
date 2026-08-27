import type { DomainId } from "./domains";

export type Role = "student" | "staff" | "admin";

export interface SqUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  studentNumber?: string;
  faculty?: string;
  yearOfStudy?: string;
  consentShare: boolean;
  createdAt: string;
}

export interface AttemptRecord {
  id: string;
  domain: DomainId;
  level: number;
  taskKind: string;
  correct: boolean;
  responseMs: number;
  attempts: number;
  hintUsed: boolean;
  isCheckpoint: boolean;
  at: string;
}

export interface LevelRecord {
  domain: DomainId;
  level: number;
  accuracy: number;
  avgResponseMs: number;
  durationMs: number;
  retried: boolean;
  at: string;
}

export interface CheckpointRecord {
  id: string;
  domain: DomainId;
  atLevel: number;
  accuracy: number;
  gameplayAccuracy: number;
  consistency: number;
  at: string;
}

export type Band = "low" | "moderate" | "higher";

export interface DomainSummary {
  domain: DomainId;
  score: number; // 0-100 skill score
  band: Band;
  label: string; // Strong / Developing / Needs Monitoring
  levelReached: number;
  accuracy: number;
  avgResponseMs: number;
  samples: number;
}

export interface ScreeningReport {
  id: string;
  studentId: string;
  createdAt: string;
  domains: DomainSummary[];
  overall: Band;
  summaryText: string;
  totalAttempts: number;
}

export interface StudentProgress {
  xp: number;
  streak: number;
  lastPlayedDay: string | null;
  badges: string[];
  levels: Record<DomainId, number>;
  attempts: AttemptRecord[];
  levelRuns: LevelRecord[];
  checkpoints: CheckpointRecord[];
  reports: ScreeningReport[];
}

export interface CaseNote {
  id: string;
  studentId: string;
  author: string;
  action: string;
  note: string;
  at: string;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
  dyslexiaFont: boolean;
  sound: boolean;
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  at: string;
}

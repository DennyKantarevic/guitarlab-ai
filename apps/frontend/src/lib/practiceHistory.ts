import type { PracticeAudioAnalysisResponse } from "./practiceCoach";

export const PRACTICE_HISTORY_STORAGE_KEY =
  "guitarlab.practiceCoach.sessions.v1";

const MAX_HISTORY_SESSIONS = 20;

export type PracticeHistorySession = {
  id: string;
  created_at: string;
  filename: string;
  duration_seconds: number;
  overall_score: number | null;
  timing_activity_score: number | null;
  recording_quality_score: number | null;
  quality_level: "poor" | "usable" | "good" | null;
  attack_activity: "sparse" | "moderate" | "busy" | null;
  energy_level: "low" | "medium" | "high" | null;
  brightness_level: "dark" | "balanced" | "bright" | null;
  summary: string | null;
  next_steps: string[];
};

export type PracticeHistoryStats = {
  sessionCount: number;
  latestOverallScore: number | null;
  bestOverallScore: number | null;
  averageOverallScore: number | null;
  latestQualityLevel: "poor" | "usable" | "good" | null;
};

type SaveOptions = {
  createdAt?: string;
  id?: string;
  storage?: Storage | null;
};

export function savePracticeSessionFromAnalysis(
  analysis: PracticeAudioAnalysisResponse,
  options: SaveOptions = {},
): PracticeHistorySession[] {
  const storage = options.storage ?? getBrowserStorage();
  const existingSessions = readPracticeHistory(storage);

  if (!analysis.valid || storage === null) {
    return existingSessions;
  }

  const session = buildPracticeSession(analysis, options);
  const sessions = [session, ...existingSessions].slice(0, MAX_HISTORY_SESSIONS);
  storage.setItem(PRACTICE_HISTORY_STORAGE_KEY, JSON.stringify(sessions));
  return sessions;
}

export function readPracticeHistory(
  storage: Storage | null = getBrowserStorage(),
): PracticeHistorySession[] {
  if (storage === null) {
    return [];
  }

  try {
    const rawHistory = storage.getItem(PRACTICE_HISTORY_STORAGE_KEY);
    if (!rawHistory) {
      return [];
    }

    const parsedHistory: unknown = JSON.parse(rawHistory);
    if (!Array.isArray(parsedHistory)) {
      return [];
    }

    return parsedHistory
      .filter(isPracticeHistorySession)
      .slice(0, MAX_HISTORY_SESSIONS);
  } catch {
    return [];
  }
}

export function clearPracticeHistory(
  storage: Storage | null = getBrowserStorage(),
): void {
  storage?.removeItem(PRACTICE_HISTORY_STORAGE_KEY);
}

export function summarizePracticeHistory(
  sessions: PracticeHistorySession[],
): PracticeHistoryStats {
  const scores = sessions
    .map((session) => session.overall_score)
    .filter((score): score is number => typeof score === "number");

  return {
    sessionCount: sessions.length,
    latestOverallScore: sessions[0]?.overall_score ?? null,
    bestOverallScore: scores.length > 0 ? Math.max(...scores) : null,
    averageOverallScore:
      scores.length > 0
        ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length)
        : null,
    latestQualityLevel: sessions[0]?.quality_level ?? null,
  };
}

function buildPracticeSession(
  analysis: PracticeAudioAnalysisResponse,
  options: SaveOptions,
): PracticeHistorySession {
  return {
    id: options.id ?? createSessionId(),
    created_at: options.createdAt ?? new Date().toISOString(),
    filename: analysis.filename,
    duration_seconds: analysis.duration_seconds,
    overall_score: analysis.practice_metrics?.overall_score ?? null,
    timing_activity_score:
      analysis.practice_metrics?.timing_activity_score ?? null,
    recording_quality_score:
      analysis.practice_metrics?.recording_quality_score ?? null,
    quality_level: analysis.recording_quality?.quality_level ?? null,
    attack_activity: analysis.practice_metrics?.attack_activity ?? null,
    energy_level: analysis.practice_metrics?.energy_level ?? null,
    brightness_level: analysis.practice_metrics?.brightness_level ?? null,
    summary: analysis.coach_feedback?.summary ?? null,
    next_steps: analysis.coach_feedback?.next_steps ?? [],
  };
}

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function isPracticeHistorySession(value: unknown): value is PracticeHistorySession {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const session = value as Partial<PracticeHistorySession>;
  return (
    typeof session.id === "string" &&
    typeof session.created_at === "string" &&
    typeof session.filename === "string" &&
    typeof session.duration_seconds === "number" &&
    Array.isArray(session.next_steps)
  );
}

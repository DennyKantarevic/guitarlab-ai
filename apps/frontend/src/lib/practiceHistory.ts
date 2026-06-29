import type { PracticeAudioAnalysisResponse, PracticeFocus } from "./practiceCoach";

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
  practice_focus: PracticeFocus | null;
  practice_description: string | null;
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

export type PracticeComparisonTrend =
  | "improved"
  | "same"
  | "lower"
  | "first"
  | "unavailable";

export type PracticeComparison = {
  hasComparison: boolean;
  previousSession: PracticeHistorySession | null;
  currentOverallScore: number | null;
  previousOverallScore: number | null;
  scoreChange: number | null;
  trend: PracticeComparisonTrend;
  message: string;
};

type SaveOptions = {
  createdAt?: string;
  id?: string;
  storage?: Storage | null;
};

const PRACTICE_FOCUS_LABELS: Record<PracticeFocus, string> = {
  general: "General feedback",
  note_clarity: "Note clarity",
  timing: "Timing and rhythm",
  speed_control: "Speed control",
  lead_phrase: "Lead phrase",
  tone_recording: "Tone / recording quality",
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
      .map(normalizePracticeHistorySession)
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

export function buildPracticeComparison(
  currentAnalysis: PracticeAudioAnalysisResponse,
  previousSessions: PracticeHistorySession[],
): PracticeComparison {
  const currentFocus = currentAnalysis.practice_context?.practice_focus ?? null;
  const currentOverallScore =
    currentAnalysis.practice_metrics?.overall_score ?? null;

  if (currentFocus === null) {
    return {
      hasComparison: false,
      previousSession: null,
      currentOverallScore,
      previousOverallScore: null,
      scoreChange: null,
      trend: "unavailable",
      message:
        "This session does not include a practice focus, so there is no similar-session comparison yet.",
    };
  }

  const focusLabel = PRACTICE_FOCUS_LABELS[currentFocus];
  const previousSession = previousSessions.find(
    (session) => session.practice_focus === currentFocus,
  );

  if (!previousSession) {
    return {
      hasComparison: false,
      previousSession: null,
      currentOverallScore,
      previousOverallScore: null,
      scoreChange: null,
      trend: "first",
      message: `This is your first saved session for ${focusLabel}, so future takes will have a comparison.`,
    };
  }

  const previousOverallScore = previousSession.overall_score;
  if (currentOverallScore === null || previousOverallScore === null) {
    return {
      hasComparison: true,
      previousSession,
      currentOverallScore,
      previousOverallScore,
      scoreChange: null,
      trend: "unavailable",
      message: `A previous ${focusLabel} session exists, but one of the scores is unavailable, so there is no score change to compare.`,
    };
  }

  const scoreChange = currentOverallScore - previousOverallScore;
  if (scoreChange >= 3) {
    return {
      hasComparison: true,
      previousSession,
      currentOverallScore,
      previousOverallScore,
      scoreChange,
      trend: "improved",
      message: `This take scored ${scoreChange} points higher than your last ${focusLabel} session.`,
    };
  }

  if (scoreChange <= -3) {
    return {
      hasComparison: true,
      previousSession,
      currentOverallScore,
      previousOverallScore,
      scoreChange,
      trend: "lower",
      message: `This take scored ${Math.abs(scoreChange)} points lower than your last ${focusLabel} session. Try repeating the same exercise at a slower tempo.`,
    };
  }

  return {
    hasComparison: true,
    previousSession,
    currentOverallScore,
    previousOverallScore,
    scoreChange,
    trend: "same",
    message: `This take scored about the same as your last ${focusLabel} session.`,
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
    practice_focus: analysis.practice_context?.practice_focus ?? null,
    practice_description:
      analysis.practice_context?.practice_description ?? null,
    quality_level: analysis.recording_quality?.quality_level ?? null,
    attack_activity: analysis.practice_metrics?.attack_activity ?? null,
    energy_level: analysis.practice_metrics?.energy_level ?? null,
    brightness_level: analysis.practice_metrics?.brightness_level ?? null,
    summary: analysis.coach_feedback?.summary ?? null,
    next_steps:
      analysis.coach_feedback?.next_practice_steps ??
      analysis.coach_feedback?.next_steps ??
      [],
  };
}

function normalizePracticeHistorySession(
  session: PracticeHistorySession,
): PracticeHistorySession {
  return {
    ...session,
    practice_focus: isPracticeFocus(session.practice_focus)
      ? session.practice_focus
      : null,
    practice_description:
      typeof session.practice_description === "string"
        ? session.practice_description
        : null,
  };
}

function isPracticeFocus(value: unknown): value is PracticeFocus {
  return (
    value === "general" ||
    value === "note_clarity" ||
    value === "timing" ||
    value === "speed_control" ||
    value === "lead_phrase" ||
    value === "tone_recording"
  );
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

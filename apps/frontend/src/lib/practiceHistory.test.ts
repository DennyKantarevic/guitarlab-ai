import { afterEach, beforeEach, describe, expect, test } from "vitest";

import type { PracticeAudioAnalysisResponse } from "./practiceCoach";
import {
  PRACTICE_HISTORY_STORAGE_KEY,
  buildPracticeComparison,
  readPracticeHistory,
  savePracticeSessionFromAnalysis,
  type PracticeHistorySession,
} from "./practiceHistory";

const successfulResponse: PracticeAudioAnalysisResponse = {
  filename: "practice.wav",
  duration_seconds: 3.25,
  sample_rate: 44100,
  tempo_bpm: 112,
  onset_count: 8,
  rms_energy_mean: 0.12,
  spectral_centroid_mean: 1800,
  zero_crossing_rate_mean: 0.04,
  analysis_warnings: [],
  valid: true,
  errors: [],
  practice_context: {
    practice_focus: "timing",
    practice_description: "Working on eighth-note alternate picking",
  },
  practice_metrics: {
    overall_score: 82,
    timing_activity_score: 78,
    recording_quality_score: 86,
    onset_density_per_second: 2.46,
    energy_level: "medium",
    brightness_level: "balanced",
    attack_activity: "moderate",
    recommendations: ["Record another take."],
  },
  recording_quality: {
    peak_amplitude: 0.42,
    clipped_sample_ratio: 0,
    silence_ratio: 0.12,
    quality_level: "good",
    warnings: [],
  },
  segment_analysis: [
    {
      segment_index: 0,
      start_seconds: 0,
      end_seconds: 3.25,
      duration_seconds: 3.25,
      onset_count: 8,
      onset_density_per_second: 2.46,
      rms_energy_mean: 0.12,
      spectral_centroid_mean: 1800,
      energy_level: "medium",
      brightness_level: "balanced",
      attack_activity: "moderate",
    },
  ],
  coach_feedback: {
    headline: "This take is usable and ready for focused practice.",
    summary: "Analyzed 3.25 seconds of audio.",
    score_explanation:
      "Your overall score is 82. Treat it as a snapshot of recording quality and playing activity, not a grade for note correctness.",
    what_went_well: ["The input level is strong enough to measure reliably."],
    work_on: ["Keep checking consistency between sections."],
    next_practice_steps: [
      "Play the same phrase slower and make each note start cleanly.",
    ],
    coach_notes: [
      "Pitch and note event estimates are approximate and work best on clean single-note recordings.",
    ],
    strengths: ["Good recording level."],
    focus_areas: [],
    next_steps: ["Record another take at the same settings."],
  },
  pitch_analysis: {
    enabled: true,
    method: "librosa.pyin",
    estimated_note: "A4",
    estimated_frequency_hz: 440,
    confidence: 0.82,
    pitch_warnings: ["This feature works best with single-note recordings."],
    detected_notes: [
      {
        note: "A4",
        frequency_hz: 440,
        start_seconds: 0,
        end_seconds: 0.5,
        confidence: 0.82,
      },
    ],
  },
  note_events: [
    {
      note: "A4",
      frequency_hz: 440,
      start_seconds: 0,
      end_seconds: 0.5,
      duration_seconds: 0.5,
      confidence: 0.82,
    },
  ],
};

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: createMemoryStorage(),
  });
});

afterEach(() => {
  window.localStorage.clear();
});

describe("practice history", () => {
  test("successful analysis saves a compact session to localStorage", () => {
    const sessions = savePracticeSessionFromAnalysis(successfulResponse, {
      createdAt: "2026-06-29T01:00:00.000Z",
      id: "session-1",
      storage: window.localStorage,
    });

    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toEqual({
      id: "session-1",
      created_at: "2026-06-29T01:00:00.000Z",
      filename: "practice.wav",
      duration_seconds: 3.25,
      overall_score: 82,
      timing_activity_score: 78,
      recording_quality_score: 86,
      practice_focus: "timing",
      practice_description: "Working on eighth-note alternate picking",
      quality_level: "good",
      attack_activity: "moderate",
      energy_level: "medium",
      brightness_level: "balanced",
      summary: "Analyzed 3.25 seconds of audio.",
      next_steps: ["Play the same phrase slower and make each note start cleanly."],
    });
    expect(readPracticeHistory(window.localStorage)).toEqual(sessions);
  });

  test("old saved sessions without context load safely", () => {
    window.localStorage.setItem(
      PRACTICE_HISTORY_STORAGE_KEY,
      JSON.stringify([
        {
          id: "old-session",
          created_at: "2026-06-29T01:00:00.000Z",
          filename: "old.wav",
          duration_seconds: 2,
          overall_score: 77,
          timing_activity_score: 70,
          recording_quality_score: 84,
          quality_level: "usable",
          attack_activity: "sparse",
          energy_level: "medium",
          brightness_level: "balanced",
          summary: "Older session.",
          next_steps: ["Record another take."],
        },
      ]),
    );

    expect(readPracticeHistory(window.localStorage)).toEqual([
      {
        id: "old-session",
        created_at: "2026-06-29T01:00:00.000Z",
        filename: "old.wav",
        duration_seconds: 2,
        overall_score: 77,
        timing_activity_score: 70,
        recording_quality_score: 84,
        practice_focus: null,
        practice_description: null,
        quality_level: "usable",
        attack_activity: "sparse",
        energy_level: "medium",
        brightness_level: "balanced",
        summary: "Older session.",
        next_steps: ["Record another take."],
      },
    ]);
  });

  test("invalid analysis does not save history", () => {
    const sessions = savePracticeSessionFromAnalysis(
      {
        ...successfulResponse,
        valid: false,
        errors: ["Could not decode audio file."],
      },
      { storage: window.localStorage },
    );

    expect(sessions).toEqual([]);
    expect(window.localStorage.getItem(PRACTICE_HISTORY_STORAGE_KEY)).toBeNull();
  });

  test("history is capped at 20 sessions with newest first", () => {
    for (let index = 0; index < 22; index += 1) {
      savePracticeSessionFromAnalysis(
        {
          ...successfulResponse,
          filename: `practice-${index}.wav`,
          practice_metrics: {
            ...successfulResponse.practice_metrics!,
            overall_score: index,
          },
        },
        {
          createdAt: new Date(Date.UTC(2026, 5, 29, 1, index)).toISOString(),
          id: `session-${index}`,
          storage: window.localStorage,
        },
      );
    }

    const sessions = readPracticeHistory(window.localStorage);

    expect(sessions).toHaveLength(20);
    expect(sessions[0]).toMatchObject({
      filename: "practice-21.wav",
      overall_score: 21,
    });
    expect(sessions.at(-1)).toMatchObject({
      filename: "practice-2.wav",
      overall_score: 2,
    });
  });

  test("saved session excludes uploaded audio and full analysis response data", () => {
    savePracticeSessionFromAnalysis(successfulResponse, {
      createdAt: "2026-06-29T01:00:00.000Z",
      id: "session-1",
      storage: window.localStorage,
    });

    const rawHistory = window.localStorage.getItem(
      PRACTICE_HISTORY_STORAGE_KEY,
    );
    const [session] = JSON.parse(rawHistory || "[]");

    expect(session).not.toHaveProperty("audio_file");
    expect(session).not.toHaveProperty("sample_rate");
    expect(session).not.toHaveProperty("tempo_bpm");
    expect(session).not.toHaveProperty("practice_metrics");
    expect(session).not.toHaveProperty("recording_quality");
    expect(session).not.toHaveProperty("segment_analysis");
    expect(session).not.toHaveProperty("coach_feedback");
    expect(session).not.toHaveProperty("practice_context");
    expect(session).not.toHaveProperty("pitch_analysis");
    expect(session).not.toHaveProperty("note_events");
  });

  test("comparison reports first session when no previous same-focus session exists", () => {
    const comparison = buildPracticeComparison(successfulResponse, [
      makeHistorySession({
        practice_focus: "note_clarity",
        overall_score: 70,
      }),
    ]);

    expect(comparison).toMatchObject({
      hasComparison: false,
      previousSession: null,
      scoreChange: null,
      trend: "first",
      message:
        "This is your first saved session for Timing and rhythm, so future takes will have a comparison.",
    });
  });

  test("comparison reports improvement against the most recent same-focus session", () => {
    const comparison = buildPracticeComparison(
      {
        ...successfulResponse,
        practice_metrics: {
          ...successfulResponse.practice_metrics!,
          overall_score: 88,
        },
      },
      [
        makeHistorySession({
          filename: "previous-timing.wav",
          practice_focus: "timing",
          practice_description: "Older alternate picking take",
          overall_score: 80,
        }),
        makeHistorySession({
          filename: "older-timing.wav",
          practice_focus: "timing",
          overall_score: 86,
        }),
      ],
    );

    expect(comparison).toMatchObject({
      hasComparison: true,
      previousSession: expect.objectContaining({
        filename: "previous-timing.wav",
        practice_description: "Older alternate picking take",
      }),
      scoreChange: 8,
      trend: "improved",
      message:
        "This take scored 8 points higher than your last Timing and rhythm session.",
    });
  });

  test("comparison reports about the same for small score changes", () => {
    const comparison = buildPracticeComparison(successfulResponse, [
      makeHistorySession({
        practice_focus: "timing",
        overall_score: 81,
      }),
    ]);

    expect(comparison).toMatchObject({
      scoreChange: 1,
      trend: "same",
      message:
        "This take scored about the same as your last Timing and rhythm session.",
    });
  });

  test("comparison reports lower scores with practical advice", () => {
    const comparison = buildPracticeComparison(successfulResponse, [
      makeHistorySession({
        practice_focus: "timing",
        overall_score: 87,
      }),
    ]);

    expect(comparison).toMatchObject({
      scoreChange: -5,
      trend: "lower",
      message:
        "This take scored 5 points lower than your last Timing and rhythm session. Try repeating the same exercise at a slower tempo.",
    });
  });

  test("comparison ignores sessions with a different practice focus", () => {
    const comparison = buildPracticeComparison(successfulResponse, [
      makeHistorySession({
        practice_focus: "note_clarity",
        overall_score: 20,
      }),
    ]);

    expect(comparison.trend).toBe("first");
    expect(comparison.previousSession).toBeNull();
  });

  test("comparison returns unavailable when a score is missing", () => {
    const comparison = buildPracticeComparison(
      {
        ...successfulResponse,
        practice_metrics: null,
      },
      [
        makeHistorySession({
          practice_focus: "timing",
          overall_score: 80,
        }),
      ],
    );

    expect(comparison).toMatchObject({
      hasComparison: true,
      scoreChange: null,
      trend: "unavailable",
      message:
        "A previous Timing and rhythm session exists, but one of the scores is unavailable, so there is no score change to compare.",
    });
  });
});

function makeHistorySession(
  overrides: Partial<PracticeHistorySession> = {},
): PracticeHistorySession {
  return {
    id: "session",
    created_at: "2026-06-29T01:00:00.000Z",
    filename: "saved.wav",
    duration_seconds: 2,
    overall_score: 82,
    timing_activity_score: 78,
    recording_quality_score: 86,
    practice_focus: "timing",
    practice_description: null,
    quality_level: "good",
    attack_activity: "moderate",
    energy_level: "medium",
    brightness_level: "balanced",
    summary: "Saved session.",
    next_steps: ["Keep practicing."],
    ...overrides,
  };
}

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

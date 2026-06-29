import { afterEach, beforeEach, describe, expect, test } from "vitest";

import type { PracticeAudioAnalysisResponse } from "./practiceCoach";
import {
  PRACTICE_HISTORY_STORAGE_KEY,
  readPracticeHistory,
  savePracticeSessionFromAnalysis,
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
      quality_level: "good",
      attack_activity: "moderate",
      energy_level: "medium",
      brightness_level: "balanced",
      summary: "Analyzed 3.25 seconds of audio.",
      next_steps: ["Play the same phrase slower and make each note start cleanly."],
    });
    expect(readPracticeHistory(window.localStorage)).toEqual(sessions);
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
    expect(session).not.toHaveProperty("pitch_analysis");
    expect(session).not.toHaveProperty("note_events");
  });
});

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

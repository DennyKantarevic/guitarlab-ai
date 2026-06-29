import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import PracticeCoachClient from "./PracticeCoachClient";
import { PRACTICE_HISTORY_STORAGE_KEY } from "@/lib/practiceHistory";
import type {
  PracticeAudioAnalysisResponse,
  PracticeAudioRequest,
} from "@/lib/practiceCoach";

const successfulResponse: PracticeAudioAnalysisResponse = {
  filename: "practice.wav",
  duration_seconds: 3.25,
  sample_rate: 44100,
  tempo_bpm: 112,
  onset_count: 8,
  rms_energy_mean: 0.12,
  spectral_centroid_mean: 1800,
  zero_crossing_rate_mean: 0.04,
  analysis_warnings: ["Short test warning."],
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
    recommendations: ["Record at least a few seconds for better analysis."],
  },
  recording_quality: {
    peak_amplitude: 0.42,
    clipped_sample_ratio: 0,
    silence_ratio: 0.12,
    quality_level: "good",
    warnings: ["The recording is usable for testing."],
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
    summary: "Analyzed 3.25 seconds of audio.",
    strengths: ["The input level is strong enough to measure reliably."],
    focus_areas: ["Keep checking consistency between sections."],
    next_steps: ["Record another take at the same settings."],
  },
};

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: createMemoryStorage(),
  });
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
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

describe("PracticeCoachClient", () => {
  test("renders a wav file input", () => {
    render(<PracticeCoachClient analyzeAudio={vi.fn()} />);

    const input = screen.getByLabelText("WAV file");
    expect(input).toBeDefined();
    expect(input.getAttribute("accept")).toBe(".wav,audio/wav,audio/wave");
  });

  test("clicking Analyze with no file shows an error", async () => {
    const analyzeAudio = vi.fn();
    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    expect(screen.getByRole("alert").textContent).toContain(
      "Select a .wav file before analyzing.",
    );
    expect(analyzeAudio).not.toHaveBeenCalled();
  });

  test("successful response displays filename, overall score, and recommendations", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(successfulResponse);

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    expect(screen.getByRole("button", { name: "Analyzing..." })).toBeDefined();
    await waitFor(() => {
      expect(screen.getAllByText("practice.wav").length).toBeGreaterThanOrEqual(
        1,
      );
    });
    expect(screen.getAllByText("82").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText("Record at least a few seconds for better analysis."),
    ).toBeDefined();
    expect(analyzeAudio).toHaveBeenCalledWith({
      audio_file: audioFile,
    } satisfies PracticeAudioRequest);
  });

  test("successful analysis saves a compact session to localStorage", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(successfulResponse);

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(screen.getAllByText("practice.wav").length).toBeGreaterThanOrEqual(
        1,
      );
    });

    const rawHistory = window.localStorage.getItem(
      PRACTICE_HISTORY_STORAGE_KEY,
    );
    const [session] = JSON.parse(rawHistory || "[]");

    expect(session).toMatchObject({
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
      next_steps: ["Record another take at the same settings."],
    });
    expect(session.id).toEqual(expect.any(String));
    expect(session.created_at).toEqual(expect.any(String));
    expect(session).not.toHaveProperty("audio_file");
    expect(session).not.toHaveProperty("sample_rate");
    expect(session).not.toHaveProperty("practice_metrics");
    expect(session).not.toHaveProperty("coach_feedback");
  });

  test("recording quality renders when present", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(successfulResponse);

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(screen.getByText("Recording quality")).toBeDefined();
    });
    expect(screen.getAllByText("good").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("The recording is usable for testing.")).toBeDefined();
  });

  test("segment analysis renders when present", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(successfulResponse);

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(screen.getByText("Segment analysis")).toBeDefined();
    });
    expect(screen.getByText("Segment 1")).toBeDefined();
    expect(screen.getAllByText("2.46").length).toBeGreaterThanOrEqual(1);
  });

  test("coach feedback renders summary and next steps", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(successfulResponse);

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(screen.getByText("Coach feedback")).toBeDefined();
    });
    expect(screen.getByText("Analyzed 3.25 seconds of audio.")).toBeDefined();
    expect(screen.getByText("Record another take at the same settings.")).toBeDefined();
  });

  test("failed response displays an error", async () => {
    const audioFile = new File(["not-a-wav"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue({
      ...successfulResponse,
      valid: false,
      errors: ["Could not decode audio file."],
      practice_metrics: null,
    } satisfies PracticeAudioAnalysisResponse);

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "Could not decode audio file.",
      );
    });
    expect(window.localStorage.getItem(PRACTICE_HISTORY_STORAGE_KEY)).toBeNull();
  });

  test("history renders after a saved session", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(successfulResponse);

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(screen.getByText("Practice history")).toBeDefined();
    });
    expect(screen.getByText("1 saved session")).toBeDefined();
    expect(screen.getByText("Latest overall score")).toBeDefined();
    expect(screen.getByText("Best overall score")).toBeDefined();
    expect(screen.getByText("Average overall score")).toBeDefined();
    expect(screen.getByText("Latest recording quality")).toBeDefined();
    expect(screen.getByText("Record another take at the same settings.")).toBeDefined();
  });

  test("Clear History removes saved sessions", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(successfulResponse);

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(screen.getByText("1 saved session")).toBeDefined();
    });
    fireEvent.click(screen.getByRole("button", { name: "Clear History" }));

    expect(window.localStorage.getItem(PRACTICE_HISTORY_STORAGE_KEY)).toBeNull();
    expect(screen.getByText("0 saved sessions")).toBeDefined();
  });

  test("form submission prevents query-string navigation", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(successfulResponse);
    const { container } = render(
      <PracticeCoachClient analyzeAudio={analyzeAudio} />,
    );

    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });

    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    expect(form?.getAttribute("method")).toBeNull();
    expect(form?.getAttribute("action")).toBeNull();
    const initialHref = window.location.href;
    const submitWasNotCanceled = fireEvent.submit(form as HTMLFormElement);

    expect(submitWasNotCanceled).toBe(false);
    await waitFor(() => {
      expect(analyzeAudio).toHaveBeenCalled();
    });
    expect(window.location.href).toBe(initialHref);
    expect(window.location.search).not.toContain("audio_file=");
  });
});

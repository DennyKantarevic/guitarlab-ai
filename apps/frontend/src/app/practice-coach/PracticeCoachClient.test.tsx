import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
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
    headline: "This take is usable and ready for focused practice.",
    summary: "Analyzed 3.25 seconds of audio.",
    score_explanation:
      "Your overall score is 82. Treat it as a snapshot of recording quality and playing activity, not a grade for note correctness.",
    what_went_well: [
      "Your take has a clear enough signal to analyze, and the note attacks are coming through consistently.",
    ],
    work_on: [
      "Keep checking consistency between sections before pushing the tempo.",
    ],
    next_practice_steps: [
      "Play the same phrase slower and make each note start cleanly.",
    ],
    coach_notes: [
      "Pitch and note event estimates are approximate and work best on clean single-note recordings.",
    ],
    strengths: ["The input level is strong enough to measure reliably."],
    focus_areas: ["Keep checking consistency between sections."],
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
  test("server render does not read localStorage for practice history", () => {
    window.localStorage.setItem(
      PRACTICE_HISTORY_STORAGE_KEY,
      JSON.stringify([
        {
          id: "saved-session",
          created_at: "2026-06-29T01:00:00.000Z",
          filename: "saved.wav",
          duration_seconds: 2,
          overall_score: 91,
          timing_activity_score: 88,
          recording_quality_score: 94,
          quality_level: "good",
          attack_activity: "moderate",
          energy_level: "medium",
          brightness_level: "balanced",
          summary: "Saved session.",
          next_steps: ["Keep practicing."],
        },
      ]),
    );
    const getItemSpy = vi.spyOn(window.localStorage, "getItem");

    const markup = renderToString(<PracticeCoachClient analyzeAudio={vi.fn()} />);

    expect(getItemSpy).not.toHaveBeenCalled();
    expect(markup).toContain(
      "Practice history loads in this browser after the page opens.",
    );
    expect(markup).not.toContain("1 saved session");
  });

  test("localStorage history loads after mount", async () => {
    window.localStorage.setItem(
      PRACTICE_HISTORY_STORAGE_KEY,
      JSON.stringify([
        {
          id: "saved-session",
          created_at: "2026-06-29T01:00:00.000Z",
          filename: "saved.wav",
          duration_seconds: 2,
          overall_score: 91,
          timing_activity_score: 88,
          recording_quality_score: 94,
          quality_level: "good",
          attack_activity: "moderate",
          energy_level: "medium",
          brightness_level: "balanced",
          summary: "Saved session.",
          next_steps: ["Keep practicing."],
        },
      ]),
    );

    render(<PracticeCoachClient analyzeAudio={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("1 saved session")).toBeDefined();
    });
    expect(screen.getByText("saved.wav")).toBeDefined();
    expect(screen.getByText(/Keep practicing/)).toBeDefined();
  });

  test("renders a wav file input", () => {
    render(<PracticeCoachClient analyzeAudio={vi.fn()} />);

    expect(screen.getByText("Practice setup")).toBeDefined();
    const input = screen.getByLabelText("WAV file");
    expect(input).toBeDefined();
    expect(input.getAttribute("accept")).toBe(".wav,audio/wav,audio/wave");
    expect(screen.getByRole("button", { name: "Analyze" })).toBeDefined();
  });

  test("renders an empty latest result state before analysis", () => {
    render(<PracticeCoachClient analyzeAudio={vi.fn()} />);

    expect(screen.getByText("Latest result")).toBeDefined();
    expect(
      screen.getByText(
        "Choose a focus, upload a .wav take, and run the coach to see your score and next steps here.",
      ),
    ).toBeDefined();
  });

  test("renders practice focus controls with general as the default", () => {
    render(<PracticeCoachClient analyzeAudio={vi.fn()} />);

    expect(screen.getByText("What are you practicing?")).toBeDefined();
    const focusSelect = screen.getByLabelText("Practice focus");
    expect(focusSelect).toBeDefined();
    expect((focusSelect as HTMLSelectElement).value).toBe("general");
    expect(
      screen.getByLabelText("Describe what you were trying to play"),
    ).toBeDefined();
  });

  test("selecting Timing and rhythm and entering a description sends practice context", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(successfulResponse);

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("Practice focus"), {
      target: { value: "timing" },
    });
    fireEvent.change(screen.getByLabelText("Describe what you were trying to play"), {
      target: { value: "  Working on eighth-note alternate picking  " },
    });
    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(analyzeAudio).toHaveBeenCalledWith({
        audio_file: audioFile,
        practice_focus: "timing",
        practice_description: "Working on eighth-note alternate picking",
      } satisfies PracticeAudioRequest);
    });
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
      practice_focus: "general",
    } satisfies PracticeAudioRequest);
  });

  test("overall score is displayed before technical details", async () => {
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
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(screen.getByText("Latest result")).toBeDefined();
    });

    const pageText = container.textContent || "";
    expect(pageText.indexOf("Latest result")).toBeLessThan(
      pageText.indexOf("Coach feedback"),
    );
    expect(pageText.indexOf("Progress compared to last similar session")).toBeLessThan(
      pageText.indexOf("Practice history"),
    );
    expect(pageText.indexOf("Technical details")).toBeGreaterThan(
      pageText.indexOf("Practice history"),
    );
  });

  test("coach-facing feedback renders headline, score explanation, and next steps", async () => {
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
      expect(
        screen.getByText("This take is usable and ready for focused practice."),
      ).toBeDefined();
    });
    expect(screen.getByText("Your score")).toBeDefined();
    expect(
      screen.getByText(
        "Your overall score is 82. Treat it as a snapshot of recording quality and playing activity, not a grade for note correctness.",
      ),
    ).toBeDefined();
    expect(screen.getByText("What went well")).toBeDefined();
    expect(screen.getByText("Work on")).toBeDefined();
    expect(screen.getByText("Next practice steps")).toBeDefined();
    expect(
      screen.getByText(
        "Play the same phrase slower and make each note start cleanly.",
      ),
    ).toBeDefined();
  });

  test("successful response displays practice context in user-friendly language", async () => {
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
      expect(screen.getByText("Practice focus")).toBeDefined();
    });
    expect(screen.getAllByText("Timing and rhythm").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText("Goal").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Working on eighth-note alternate picking").length,
    ).toBeGreaterThanOrEqual(1);
  });

  test("shows first-session comparison when no previous same-focus session exists", async () => {
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
      expect(
        screen.getByText("Progress compared to last similar session"),
      ).toBeDefined();
    });
    expect(
      screen.getByText(
        "This is your first saved session for Timing and rhythm, so future takes will have a comparison.",
      ),
    ).toBeDefined();
    expect(screen.getByText("1 saved session")).toBeDefined();
  });

  test("shows improvement compared to the previous same-focus session", async () => {
    window.localStorage.setItem(
      PRACTICE_HISTORY_STORAGE_KEY,
      JSON.stringify([
        {
          id: "previous-timing",
          created_at: "2026-06-29T01:00:00.000Z",
          filename: "previous-timing.wav",
          duration_seconds: 2,
          overall_score: 74,
          timing_activity_score: 70,
          recording_quality_score: 78,
          practice_focus: "timing",
          practice_description: "Older eighth-note alternate picking",
          quality_level: "usable",
          attack_activity: "moderate",
          energy_level: "medium",
          brightness_level: "balanced",
          summary: "Older session.",
          next_steps: ["Keep practicing."],
        },
      ]),
    );
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(successfulResponse);

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    await waitFor(() => {
      expect(screen.getByText("1 saved session")).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "This take scored 8 points higher than your last Timing and rhythm session.",
        ),
      ).toBeDefined();
    });
    expect(screen.getByText("Previous overall score")).toBeDefined();
    expect(screen.getAllByText("74").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Current overall score")).toBeDefined();
    expect(screen.getAllByText("82").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Score change")).toBeDefined();
    expect(screen.getByText("+8")).toBeDefined();
    expect(screen.getByText("Previous practice description")).toBeDefined();
    expect(
      screen.getByText("Older eighth-note alternate picking"),
    ).toBeDefined();
    expect(screen.getByText("2 saved sessions")).toBeDefined();
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
      practice_focus: "timing",
      practice_description: "Working on eighth-note alternate picking",
      quality_level: "good",
      attack_activity: "moderate",
      energy_level: "medium",
      brightness_level: "balanced",
      summary: "Analyzed 3.25 seconds of audio.",
      next_steps: ["Play the same phrase slower and make each note start cleanly."],
    });
    expect(session.id).toEqual(expect.any(String));
    expect(session.created_at).toEqual(expect.any(String));
    expect(session).not.toHaveProperty("audio_file");
    expect(session).not.toHaveProperty("sample_rate");
    expect(session).not.toHaveProperty("practice_metrics");
    expect(session).not.toHaveProperty("coach_feedback");
    expect(session).not.toHaveProperty("practice_context");
    expect(session).not.toHaveProperty("pitch_analysis");
    expect(session).not.toHaveProperty("note_events");
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
      expect(screen.getAllByText("Recording quality").length).toBeGreaterThanOrEqual(
        1,
      );
    });
    expect(screen.getAllByText("good").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("The recording is usable for testing.")).toBeDefined();
  });

  test("technical details are accessible but secondary", async () => {
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
      expect(screen.getByText("Technical details")).toBeDefined();
    });
    expect(screen.getAllByText("RMS energy mean").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Segment analysis")).toBeDefined();
    expect(screen.getByText("Pitch Analysis")).toBeDefined();
    expect(screen.getByText("Detected Note Events")).toBeDefined();
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
    expect(
      screen.getByText(
        "Play the same phrase slower and make each note start cleanly.",
      ),
    ).toBeDefined();
  });

  test("pitch analysis renders when present", async () => {
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
      expect(screen.getByText("Pitch Analysis")).toBeDefined();
    });
    expect(screen.getAllByText("A4").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("440").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText("This feature works best with single-note recordings."),
    ).toBeDefined();
    expect(screen.getByText("Detected notes")).toBeDefined();
  });

  test("note events render when present", async () => {
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
      expect(screen.getByText("Detected Note Events")).toBeDefined();
    });
    expect(screen.getAllByText("A4").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("440").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("0.5").length).toBeGreaterThanOrEqual(1);
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
    expect(screen.getAllByText("Latest overall score").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText("Best overall score").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText("Average overall score").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Latest recording quality")).toBeDefined();
    expect(screen.getByText("Practice focus: Timing and rhythm")).toBeDefined();
    expect(
      screen.getByText("Goal: Working on eighth-note alternate picking"),
    ).toBeDefined();
    expect(
      screen.getByText(
        "Play the same phrase slower and make each note start cleanly.",
      ),
    ).toBeDefined();
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

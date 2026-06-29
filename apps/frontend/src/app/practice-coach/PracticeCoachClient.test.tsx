import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import PracticeCoachClient from "./PracticeCoachClient";
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
};

afterEach(() => {
  cleanup();
});

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
      expect(screen.getByText("practice.wav")).toBeDefined();
    });
    expect(screen.getByText("82")).toBeDefined();
    expect(
      screen.getByText("Record at least a few seconds for better analysis."),
    ).toBeDefined();
    expect(analyzeAudio).toHaveBeenCalledWith({
      audio_file: audioFile,
    } satisfies PracticeAudioRequest);
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

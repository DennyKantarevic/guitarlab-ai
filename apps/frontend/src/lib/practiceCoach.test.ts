import { describe, expect, test, vi } from "vitest";

import { analyzePracticeAudio } from "./practiceCoach";

describe("analyzePracticeAudio", () => {
  test("sends multipart form data to the default Practice Coach backend URL", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        filename: "practice.wav",
        duration_seconds: 1,
        sample_rate: 22050,
        tempo_bpm: null,
        onset_count: 0,
        rms_energy_mean: 0.1,
        spectral_centroid_mean: 440,
        zero_crossing_rate_mean: 0.04,
        analysis_warnings: [],
        valid: true,
        errors: [],
        practice_metrics: null,
      }),
    });

    const response = await analyzePracticeAudio(audioFile, fetchMock);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/practice/analyze-audio",
      {
        method: "POST",
        body: expect.any(FormData),
      },
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = init.body as FormData;
    expect(body.get("audio_file")).toBe(audioFile);
    expect(body.get("practice_focus")).toBe("general");
    expect(response.filename).toBe("practice.wav");
  });

  test("includes practice context fields in multipart form data", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        filename: "practice.wav",
        duration_seconds: 1,
        sample_rate: 22050,
        tempo_bpm: null,
        onset_count: 0,
        rms_energy_mean: 0.1,
        spectral_centroid_mean: 440,
        zero_crossing_rate_mean: 0.04,
        analysis_warnings: [],
        valid: true,
        errors: [],
        practice_context: {
          practice_focus: "timing",
          practice_description: "Eighth-note alternate picking",
        },
        practice_metrics: null,
      }),
    });

    await analyzePracticeAudio(
      {
        audio_file: audioFile,
        practice_focus: "timing",
        practice_description: "  Eighth-note alternate picking  ",
      },
      fetchMock,
    );

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = init.body as FormData;
    expect(body.get("audio_file")).toBe(audioFile);
    expect(body.get("practice_focus")).toBe("timing");
    expect(body.get("practice_description")).toBe(
      "Eighth-note alternate picking",
    );
  });

  test("uses a provided backend URL without adding JSON headers", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        filename: "practice.wav",
        duration_seconds: 1,
        sample_rate: 22050,
        tempo_bpm: null,
        onset_count: 0,
        rms_energy_mean: 0.1,
        spectral_centroid_mean: 440,
        zero_crossing_rate_mean: 0.04,
        analysis_warnings: [],
        valid: true,
        errors: [],
        practice_metrics: null,
      }),
    });

    await analyzePracticeAudio(audioFile, fetchMock, "http://localhost:9000/");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:9000/practice/analyze-audio",
      {
        method: "POST",
        body: expect.any(FormData),
      },
    );
  });

  test("throws a useful error when the backend rejects the upload", async () => {
    const audioFile = new File(["not-a-wav"], "practice.wav", {
      type: "audio/wav",
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "decode failed",
    });

    await expect(analyzePracticeAudio(audioFile, fetchMock)).rejects.toThrow(
      "Practice Coach request failed: 500 decode failed",
    );
  });
});

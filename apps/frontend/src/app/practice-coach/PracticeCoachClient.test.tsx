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

const referenceResponse: PracticeAudioAnalysisResponse = {
  ...successfulResponse,
  reference_exercise: {
    expected_notes_raw: "A4 B4 C5 D5",
    expected_notes: ["A4", "B4", "C5", "D5"],
    expected_tab_raw: null,
    source: "notes",
    valid: true,
    warnings: [],
  },
  reference_comparison: {
    enabled: true,
    valid: true,
    matched_count: 1,
    missed_count: 3,
    extra_count: 1,
    expected_count: 4,
    detected_count: 2,
    match_ratio: 0.25,
    summary:
      "Compared with your expected exercise, the coach found 1 of 4 notes in order.",
    matches: [
      {
        expected_note: "A4",
        detected_note: "A4",
        expected_index: 0,
        detected_index: 0,
        confidence: 0.82,
      },
    ],
    misses: [
      { expected_note: "B4", expected_index: 1 },
      { expected_note: "C5", expected_index: 2 },
      { expected_note: "D5", expected_index: 3 },
    ],
    extras: [
      {
        detected_note: "E4",
        detected_index: 1,
        confidence: 0.7,
      },
    ],
    warnings: [],
  },
};

const invalidReferenceResponse: PracticeAudioAnalysisResponse = {
  ...referenceResponse,
  reference_exercise: {
    expected_notes_raw: "A4 Bb4",
    expected_notes: ["A4"],
    expected_tab_raw: null,
    source: "notes",
    valid: false,
    warnings: [
      "Unsupported expected note 'Bb4'. Use notes like A4 or C#5; flats, chords, tabs, durations, and rhythm values are not supported.",
    ],
  },
  reference_comparison: {
    ...referenceResponse.reference_comparison,
    valid: false,
    warnings: [
      "Unsupported expected note 'Bb4'. Use notes like A4 or C#5; flats, chords, tabs, durations, and rhythm values are not supported.",
    ],
  },
};

const tabReferenceResponse: PracticeAudioAnalysisResponse = {
  ...referenceResponse,
  reference_exercise: {
    expected_notes_raw: null,
    expected_notes: ["E2", "G2", "A2", "B2", "C3"],
    expected_tab_raw:
      "e|----------------|\nB|----------------|\nG|----------------|\nD|----------------|\nA|-----0-2-3------|\nE|-0-3------------|",
    source: "tab",
    valid: true,
    warnings: [],
  },
  reference_comparison: {
    ...referenceResponse.reference_comparison,
    matched_count: 2,
    missed_count: 3,
    expected_count: 5,
    match_ratio: 0.4,
    summary:
      "Compared with your expected exercise, the coach found 2 of 5 notes in order.",
    misses: [
      { expected_note: "A2", expected_index: 2 },
      { expected_note: "B2", expected_index: 3 },
      { expected_note: "C3", expected_index: 4 },
    ],
  },
};

const invalidTabReferenceResponse: PracticeAudioAnalysisResponse = {
  ...tabReferenceResponse,
  reference_exercise: {
    ...tabReferenceResponse.reference_exercise,
    valid: false,
    warnings: [
      "Chords are not supported yet; multiple fret numbers were found at the same tab position.",
    ],
  },
  reference_comparison: {
    ...tabReferenceResponse.reference_comparison,
    valid: false,
    warnings: [
      "Chords are not supported yet; multiple fret numbers were found at the same tab position.",
    ],
  },
};

const chordReferenceResponse: PracticeAudioAnalysisResponse = {
  ...successfulResponse,
  reference_exercise: {
    expected_notes_raw: null,
    expected_notes: [],
    expected_tab_raw: null,
    expected_chords_raw: "G C Em",
    expected_chords: [
      { symbol: "G", root: "G", quality: "major", tones: ["G", "B", "D"] },
      { symbol: "C", root: "C", quality: "major", tones: ["C", "E", "G"] },
      { symbol: "Em", root: "E", quality: "minor", tones: ["E", "G", "B"] },
    ],
    source: "chords",
    valid: true,
    warnings: [],
  },
  reference_comparison: {
    enabled: false,
    valid: true,
    matched_count: 0,
    missed_count: 0,
    extra_count: 0,
    expected_count: 0,
    detected_count: 0,
    match_ratio: null,
    summary: "Reference note comparison is disabled for chord exercises.",
    matches: [],
    misses: [],
    extras: [],
    warnings: [],
  },
  chord_comparison: {
    enabled: true,
    valid: true,
    expected_count: 3,
    detected_note_count: 3,
    matched_chord_count: 0,
    partial_chord_count: 2,
    missed_chord_count: 1,
    summary:
      "The coach found chord tones for 0 of 3 expected chords. 2 chords had some expected tones detected. This checks approximate chord-tone coverage only, not strumming or rhythm.",
    chords: [
      {
        symbol: "G",
        expected_tones: ["G", "B", "D"],
        detected_tones: ["G", "D"],
        matched_tones: ["G", "D"],
        missing_tones: ["B"],
        status: "partial",
      },
      {
        symbol: "C",
        expected_tones: ["C", "E", "G"],
        detected_tones: [],
        matched_tones: [],
        missing_tones: ["C", "E", "G"],
        status: "missed",
      },
      {
        symbol: "Em",
        expected_tones: ["E", "G", "B"],
        detected_tones: ["E", "G"],
        matched_tones: ["E", "G"],
        missing_tones: ["B"],
        status: "partial",
      },
    ],
    warnings: [],
  },
};

const invalidChordReferenceResponse: PracticeAudioAnalysisResponse = {
  ...chordReferenceResponse,
  reference_exercise: {
    ...chordReferenceResponse.reference_exercise,
    valid: false,
    warnings: ["Unsupported chord 'Bb'. Use simple sharp-note chord symbols."],
  },
  chord_comparison: {
    ...chordReferenceResponse.chord_comparison,
    valid: false,
    warnings: ["Unsupported chord 'Bb'. Use simple sharp-note chord symbols."],
  },
};

const strummingResponse: PracticeAudioAnalysisResponse = {
  ...successfulResponse,
  strumming_pattern: {
    expected_pattern_raw: "D D U U D U",
    strokes: ["D", "D", "U", "U", "D", "U"],
    valid: true,
    warnings: [],
  },
  strumming_comparison: {
    enabled: true,
    valid: true,
    expected_stroke_count: 6,
    detected_attack_count: 6,
    count_difference: 0,
    attack_match_level: "good",
    spacing_level: "steady",
    summary:
      "The recording had about the right number of clear attacks for the expected strumming pattern. This checks approximate attack activity only, not upstroke/downstroke direction.",
    warnings: [],
  },
};

const invalidStrummingResponse: PracticeAudioAnalysisResponse = {
  ...strummingResponse,
  strumming_pattern: {
    ...strummingResponse.strumming_pattern,
    valid: false,
    warnings: [
      "Unsupported strumming symbol 'Q'. Use D, U, or X separated by spaces, commas, hyphens, or new lines.",
    ],
  },
  strumming_comparison: {
    ...strummingResponse.strumming_comparison,
    valid: false,
    attack_match_level: "close",
    spacing_level: "somewhat_uneven",
    warnings: [
      "Unsupported strumming symbol 'Q'. Use D, U, or X separated by spaces, commas, hyphens, or new lines.",
    ],
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

  test("renders expected notes, expected tab, expected chords, and expected strumming inputs with reference exercise helper text", () => {
    render(<PracticeCoachClient analyzeAudio={vi.fn()} />);

    const expectedNotesInput = screen.getByLabelText("Expected notes");
    expect(expectedNotesInput).toBeDefined();
    expect(
      screen.getByText(
        "Optional. Enter a simple note sequence like A4 B4 C5 D5. This compares detected notes to your own exercise, not a song database.",
      ),
    ).toBeDefined();
    expect(expectedNotesInput.getAttribute("placeholder")).toBe("A4 B4 C5 D5");
    const expectedTabInput = screen.getByLabelText("Expected tab");
    expect(expectedTabInput).toBeDefined();
    expect(expectedTabInput.getAttribute("placeholder")).toContain(
      "A|-----0-2-3------|",
    );
    expect(
      screen.getByText(
        "Optional. Paste a short single-note guitar tab in standard tuning. Use this instead of Expected notes.",
      ),
    ).toBeDefined();
    const expectedChordsInput = screen.getByLabelText("Expected chords");
    expect(expectedChordsInput).toBeDefined();
    expect(expectedChordsInput.getAttribute("placeholder")).toBe("G C D Em");
    expect(
      screen.getByText(
        "Optional. Enter a simple chord progression like G C D Em. This checks approximate chord-tone coverage, not full chord recognition or strumming.",
      ),
    ).toBeDefined();
    const expectedStrummingInput = screen.getByLabelText(
      "Expected strumming pattern",
    );
    expect(expectedStrummingInput).toBeDefined();
    expect(expectedStrummingInput.getAttribute("placeholder")).toBe(
      "D D U U D U",
    );
    expect(
      screen.getByText(
        "Optional. Enter a simple pattern like D D U U D U. This checks approximate attack activity, not actual upstroke/downstroke direction.",
      ),
    ).toBeDefined();
    expect(
      screen.getByText(
        "D = intended downstroke, U = intended upstroke, X = muted/percussive stroke.",
      ),
    ).toBeDefined();
    expect(
      screen.getByText(
        "Practice focus and description always apply. For pitch references, use one of notes, tab, or chords. Strumming can be used by itself or alongside one pitch reference. If more than one pitch reference is filled, notes are used first, then tab, then chords.",
      ),
    ).toBeDefined();
  });

  test("renders reference exercise help panel with examples and unsupported items", () => {
    const { container } = render(<PracticeCoachClient analyzeAudio={vi.fn()} />);

    expect(screen.getByText("How to use reference exercises")).toBeDefined();
    expect(
      screen.getByText(
        "You can enter expected notes, a short single-note guitar tab, simple chord names, and/or a simple strumming pattern. The coach compares detected notes and attacks from your recording to your own exercise.",
      ),
    ).toBeDefined();
    expect(screen.getByText("A4 B4 C5 D5")).toBeDefined();
    expect(screen.getByText("E3 G3 A3")).toBeDefined();
    expect(screen.getByText("C#4 D#4 F#4")).toBeDefined();
    expect(screen.getByText(/A\|-----0-2-3------\|/)).toBeDefined();
    expect(screen.getByText("6-line guitar tab")).toBeDefined();
    expect(screen.getByText("standard tuning")).toBeDefined();
    expect(screen.getByText("single-note melodies")).toBeDefined();
    expect(screen.getByText("frets 0-24")).toBeDefined();
    expect(screen.getByText("Good chord examples")).toBeDefined();
    expect(screen.getByText("G C D Em")).toBeDefined();
    expect(screen.getByText("Am F C G")).toBeDefined();
    expect(screen.getByText("Cmaj7 Am7 Dm7 G7")).toBeDefined();
    expect(screen.getByText("E5 A5 B5")).toBeDefined();
    expect(screen.getByText("major and minor chords")).toBeDefined();
    expect(screen.getByText("7th chords")).toBeDefined();
    expect(screen.getByText("maj7 and m7 chords")).toBeDefined();
    expect(screen.getByText("sus2/sus4 chords")).toBeDefined();
    expect(screen.getByText("power chords")).toBeDefined();
    expect(screen.getByText("Good strumming examples")).toBeDefined();
    expect(screen.getByText("D D U U D U")).toBeDefined();
    expect(screen.getByText("D-D-U-U-D-U")).toBeDefined();
    expect(screen.getByText("D X D U")).toBeDefined();
    expect(screen.getByText("Supported strumming pattern")).toBeDefined();
    expect(screen.getByText("D and U are intended stroke labels")).toBeDefined();
    expect(screen.getByText("X is muted/percussive stroke")).toBeDefined();
    expect(
      screen.getByText("checks approximate attack activity"),
    ).toBeDefined();
    expect(
      screen.getByText("does not detect exact up/down direction"),
    ).toBeDefined();
    expect(screen.getByText("exact rhythm accuracy")).toBeDefined();
    expect(screen.getByText("beat alignment")).toBeDefined();
    expect(screen.getByText("full strumming transcription")).toBeDefined();
    expect(screen.getByText("song names")).toBeDefined();
    expect(screen.getByText("rhythm notation")).toBeDefined();
    expect(screen.getByText("full song comparison")).toBeDefined();
    expect(screen.getByText("copyrighted tab/chord/pattern lookup")).toBeDefined();
    expect(screen.getByText("slash chords")).toBeDefined();
    expect(screen.getByText("add/extended chords")).toBeDefined();
    expect(screen.getByText("full polyphonic chord recognition")).toBeDefined();
    expect(screen.getByText("alternate tunings or capo")).toBeDefined();
    expect(
      screen.getByText(
        "This works best for short, single-note exercises recorded clearly and slowly.",
      ),
    ).toBeDefined();

    const setupText = container.textContent?.toLowerCase() || "";
    expect(setupText).not.toContain("ai will recognize any song");
    expect(setupText).not.toContain("enter nirvana riffs");
    expect(setupText).not.toContain("checks rhythm accuracy");
    expect(setupText).not.toContain("checks strumming accuracy");
    expect(setupText).not.toContain("detects exact up/down direction");
    expect(setupText).not.toContain("detected your stroke direction");
    expect(setupText).not.toContain("your rhythm was accurate");
    expect(setupText).not.toContain("perfect chord detection");
    expect(setupText).not.toContain("proves whether you played correctly");
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

  test("entering expected notes sends them with the upload request", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(referenceResponse);

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("Expected notes"), {
      target: { value: "  A4 B4 C5 D5  " },
    });
    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(analyzeAudio).toHaveBeenCalledWith({
        audio_file: audioFile,
        practice_focus: "general",
        expected_notes: "A4 B4 C5 D5",
      } satisfies PracticeAudioRequest);
    });
  });

  test("empty expected notes are omitted from the upload request", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(successfulResponse);

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("Expected notes"), {
      target: { value: "   " },
    });
    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(analyzeAudio).toHaveBeenCalledWith({
        audio_file: audioFile,
        practice_focus: "general",
      } satisfies PracticeAudioRequest);
    });
  });

  test("entering expected tab sends it with the upload request", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(tabReferenceResponse);
    const expectedTab =
      "e|----------------|\nB|----------------|\nG|----------------|\nD|----------------|\nA|-----0-2-3------|\nE|-0-3------------|";

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("Expected tab"), {
      target: { value: `  ${expectedTab}  ` },
    });
    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(analyzeAudio).toHaveBeenCalledWith({
        audio_file: audioFile,
        practice_focus: "general",
        expected_tab: expectedTab,
      } satisfies PracticeAudioRequest);
    });
  });

  test("both expected notes and expected tab can be submitted without frontend blocking", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(referenceResponse);
    const expectedTab =
      "e|----------------|\nB|----------------|\nG|----------------|\nD|----------------|\nA|-----0-2-3------|\nE|-0-3------------|";

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("Expected notes"), {
      target: { value: "A4 B4" },
    });
    fireEvent.change(screen.getByLabelText("Expected tab"), {
      target: { value: expectedTab },
    });
    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(analyzeAudio).toHaveBeenCalledWith({
        audio_file: audioFile,
        practice_focus: "general",
        expected_notes: "A4 B4",
        expected_tab: expectedTab,
      } satisfies PracticeAudioRequest);
    });
  });

  test("entering expected chords sends them with the upload request", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(chordReferenceResponse);

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("Expected chords"), {
      target: { value: "  G C D Em  " },
    });
    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(analyzeAudio).toHaveBeenCalledWith({
        audio_file: audioFile,
        practice_focus: "general",
        expected_chords: "G C D Em",
      } satisfies PracticeAudioRequest);
    });
  });

  test("empty expected chords are omitted from the upload request", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(successfulResponse);

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("Expected chords"), {
      target: { value: "   " },
    });
    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(analyzeAudio).toHaveBeenCalledWith({
        audio_file: audioFile,
        practice_focus: "general",
      } satisfies PracticeAudioRequest);
    });
  });

  test("entering expected strumming pattern sends it with the upload request", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(strummingResponse);

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("Expected strumming pattern"), {
      target: { value: "  D D U U D U  " },
    });
    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(analyzeAudio).toHaveBeenCalledWith({
        audio_file: audioFile,
        practice_focus: "general",
        expected_strumming_pattern: "D D U U D U",
      } satisfies PracticeAudioRequest);
    });
  });

  test("empty expected strumming pattern is omitted from the upload request", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(successfulResponse);

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("Expected strumming pattern"), {
      target: { value: "   " },
    });
    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(analyzeAudio).toHaveBeenCalledWith({
        audio_file: audioFile,
        practice_focus: "general",
      } satisfies PracticeAudioRequest);
    });
  });

  test("strumming can be submitted alongside expected chords without frontend blocking", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(strummingResponse);

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("Expected chords"), {
      target: { value: "G C D Em" },
    });
    fireEvent.change(screen.getByLabelText("Expected strumming pattern"), {
      target: { value: "D D U U D U" },
    });
    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(analyzeAudio).toHaveBeenCalledWith({
        audio_file: audioFile,
        practice_focus: "general",
        expected_chords: "G C D Em",
        expected_strumming_pattern: "D D U U D U",
      } satisfies PracticeAudioRequest);
    });
  });

  test("multiple reference fields can be submitted without frontend blocking", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(referenceResponse);
    const expectedTab =
      "e|----------------|\nB|----------------|\nG|----------------|\nD|----------------|\nA|-----0-2-3------|\nE|-0-3------------|";

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("Expected notes"), {
      target: { value: "A4 B4" },
    });
    fireEvent.change(screen.getByLabelText("Expected tab"), {
      target: { value: expectedTab },
    });
    fireEvent.change(screen.getByLabelText("Expected chords"), {
      target: { value: "G C D Em" },
    });
    fireEvent.change(screen.getByLabelText("Expected strumming pattern"), {
      target: { value: "D D U U D U" },
    });
    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(analyzeAudio).toHaveBeenCalledWith({
        audio_file: audioFile,
        practice_focus: "general",
        expected_notes: "A4 B4",
        expected_tab: expectedTab,
        expected_chords: "G C D Em",
        expected_strumming_pattern: "D D U U D U",
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

  test("reference exercise result renders when comparison is enabled", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(referenceResponse);

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(screen.getByText("Reference exercise")).toBeDefined();
    });
    expect(
      screen.getAllByText(
        "Compared with your expected exercise, the coach found 1 of 4 notes in order.",
      ).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Matched notes").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Source")).toBeDefined();
    expect(screen.getAllByText("Expected notes").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("1 of 4")).toBeDefined();
    expect(screen.getAllByText("Missed notes").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("B4, C5, D5")).toBeDefined();
    expect(screen.getAllByText("Extra detected notes").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("E4")).toBeDefined();
    expect(screen.getAllByText("Match ratio").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("25%").length).toBeGreaterThanOrEqual(1);
  });

  test("reference exercise result shows guitar tab source and parsed notes", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(tabReferenceResponse);

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(screen.getByText("Reference exercise")).toBeDefined();
    });
    expect(screen.getByText("Source")).toBeDefined();
    expect(screen.getAllByText("Guitar tab").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(
        "The tab was converted into a simple expected note sequence before comparison.",
      ),
    ).toBeDefined();
    expect(screen.getAllByText("Expected notes").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("E2, G2, A2, B2, C3").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("40%").length).toBeGreaterThanOrEqual(1);
  });

  test("tab reference warnings render in the reference exercise section", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(invalidTabReferenceResponse);

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(screen.getByText("Reference exercise")).toBeDefined();
    });
    expect(screen.getAllByText("Guitar tab").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Chords are not supported yet/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  test("chord exercise section renders chord comparison results", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(chordReferenceResponse);

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(screen.getByText("Chord exercise")).toBeDefined();
    });
    expect(
      screen.getAllByText(
        "The coach found chord tones for 0 of 3 expected chords. 2 chords had some expected tones detected. This checks approximate chord-tone coverage only, not strumming or rhythm.",
      ).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Source")).toBeDefined();
    expect(screen.getAllByText("Chord progression").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(
        "This checks approximate chord-tone coverage only, not full chord recognition or strumming.",
      ),
    ).toBeDefined();
    expect(screen.getAllByText("Expected chord count").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Matched chords").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Partial chords").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Missed chords").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Chord breakdown")).toBeDefined();
    expect(screen.getAllByText("G: partial").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("found G, D").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("missing B").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("C: missed").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("missing C, E, G").length).toBeGreaterThanOrEqual(1);
  });

  test("chord warnings and invalid chord guidance render in the chord exercise section", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(invalidChordReferenceResponse);

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(screen.getByText("Chord exercise")).toBeDefined();
    });
    expect(
      screen.getByText(
        "Some chord names were not recognized. Try simple symbols like G, C, D, Em, Am7, or Gsus4.",
      ),
    ).toBeDefined();
    expect(
      screen.getAllByText(/Unsupported chord 'Bb'/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Chord warnings")).toBeDefined();
  });

  test("strumming pattern section renders comparison results", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(strummingResponse);

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(screen.getByText("Strumming pattern")).toBeDefined();
    });
    expect(
      screen.getAllByText(
        "The recording had about the right number of clear attacks for the expected strumming pattern. This checks approximate attack activity only, not upstroke/downstroke direction.",
      ).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText("This checks attack activity only, not stroke direction."),
    ).toBeDefined();
    expect(screen.getByText("Expected strokes")).toBeDefined();
    expect(screen.getByText("Detected attacks")).toBeDefined();
    expect(screen.getAllByText("Count difference").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Attack match")).toBeDefined();
    expect(screen.getAllByText("Good").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Spacing")).toBeDefined();
    expect(screen.getAllByText("Steady").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Expected pattern")).toBeDefined();
    expect(screen.getAllByText("D D U U D U").length).toBeGreaterThanOrEqual(1);

    const resultText = screen.getByText("Strumming pattern").closest("section")
      ?.textContent?.toLowerCase() ?? "";
    expect(resultText).not.toContain("your downstrokes were correct");
    expect(resultText).not.toContain("your upstrokes were correct");
    expect(resultText).not.toContain("your rhythm was accurate");
    expect(resultText).not.toContain("the app detected your stroke direction");
  });

  test("strumming warnings and invalid strumming guidance render in the result", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(invalidStrummingResponse);

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(screen.getByText("Strumming pattern")).toBeDefined();
    });
    expect(
      screen.getByText(
        "Some strumming symbols were not recognized. Use D, U, and X, separated by spaces.",
      ),
    ).toBeDefined();
    expect(
      screen.getAllByText(/Unsupported strumming symbol 'Q'/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Strumming warnings")).toBeDefined();
    expect(screen.getAllByText("Close").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Somewhat uneven").length).toBeGreaterThanOrEqual(1);
  });

  test("invalid reference exercise warnings render in the result", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue(invalidReferenceResponse);

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(screen.getByText("Reference exercise")).toBeDefined();
    });
    expect(
      screen.getByText(
        "Some expected notes were not recognized. Use notes like A4, C#5, or E3.",
      ),
    ).toBeDefined();
    expect(
      screen.getAllByText(/Unsupported expected note 'Bb4'/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  test("reference exercise section is hidden when comparison is disabled", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue({
      ...successfulResponse,
      reference_comparison: {
        enabled: false,
        valid: true,
        matched_count: 0,
        missed_count: 0,
        extra_count: 0,
        expected_count: 0,
        detected_count: 0,
        match_ratio: null,
        summary: "No reference exercise was provided.",
        matches: [],
        misses: [],
        extras: [],
        warnings: [],
      },
    } satisfies PracticeAudioAnalysisResponse);

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(screen.getByText("Coach feedback")).toBeDefined();
    });
    expect(screen.queryByText("Reference exercise")).toBeNull();
  });

  test("technical details reveal raw reference, chord, and strumming comparison summaries", async () => {
    const audioFile = new File(["wav-bytes"], "practice.wav", {
      type: "audio/wav",
    });
    const analyzeAudio = vi.fn().mockResolvedValue({
      ...chordReferenceResponse,
      strumming_pattern: strummingResponse.strumming_pattern,
      strumming_comparison: strummingResponse.strumming_comparison,
    } satisfies PracticeAudioAnalysisResponse);

    render(<PracticeCoachClient analyzeAudio={analyzeAudio} />);

    fireEvent.change(screen.getByLabelText("WAV file"), {
      target: { files: [audioFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(screen.getByText("Technical details")).toBeDefined();
    });
    fireEvent.click(screen.getByText("Technical details"));

    expect(screen.getByText("Reference exercise details")).toBeDefined();
    expect(screen.getByText("Reference comparison details")).toBeDefined();
    expect(screen.getByText("Chord comparison details")).toBeDefined();
    expect(screen.getByText("Strumming pattern details")).toBeDefined();
    expect(screen.getByText("Strumming comparison details")).toBeDefined();
    expect(screen.getByText("Reference source")).toBeDefined();
    expect(screen.getByText("Chord comparison enabled")).toBeDefined();
    expect(screen.getByText("Strumming comparison enabled")).toBeDefined();
    expect(screen.getByText("Attack match level")).toBeDefined();
    expect(screen.getByText("Spacing level")).toBeDefined();
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

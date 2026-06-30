export type PracticeFocus =
  | "general"
  | "note_clarity"
  | "timing"
  | "speed_control"
  | "lead_phrase"
  | "tone_recording";

export type PracticeAudioRequest = {
  audio_file: File;
  practice_focus?: PracticeFocus;
  practice_description?: string;
  expected_notes?: string;
  expected_tab?: string;
  expected_chords?: string;
  expected_strumming_pattern?: string;
};

export type PracticeContext = {
  practice_focus: PracticeFocus;
  practice_description: string | null;
};

export type PracticeMetrics = {
  overall_score: number;
  timing_activity_score: number;
  recording_quality_score: number;
  onset_density_per_second: number;
  energy_level: "low" | "medium" | "high";
  brightness_level: "dark" | "balanced" | "bright";
  attack_activity: "sparse" | "moderate" | "busy";
  recommendations: string[];
};

export type RecordingQuality = {
  peak_amplitude: number;
  clipped_sample_ratio: number;
  silence_ratio: number;
  quality_level: "poor" | "usable" | "good";
  warnings: string[];
};

export type SegmentAnalysis = {
  segment_index: number;
  start_seconds: number;
  end_seconds: number;
  duration_seconds: number;
  onset_count: number;
  onset_density_per_second: number;
  rms_energy_mean: number;
  spectral_centroid_mean: number;
  energy_level: "low" | "medium" | "high";
  brightness_level: "dark" | "balanced" | "bright";
  attack_activity: "sparse" | "moderate" | "busy";
};

export type CoachFeedback = {
  headline: string;
  summary: string;
  score_explanation: string;
  what_went_well: string[];
  work_on: string[];
  next_practice_steps: string[];
  coach_notes: string[];
  strengths: string[];
  focus_areas: string[];
  next_steps: string[];
};

export type DetectedPitchNote = {
  note: string;
  frequency_hz: number;
  start_seconds: number;
  end_seconds: number;
  confidence: number;
};

export type PitchAnalysis = {
  enabled: boolean;
  method: string;
  estimated_note: string | null;
  estimated_frequency_hz: number | null;
  confidence: number;
  detected_notes: DetectedPitchNote[];
  pitch_warnings: string[];
};

export type NoteEvent = {
  note: string;
  frequency_hz: number;
  start_seconds: number;
  end_seconds: number;
  duration_seconds: number;
  confidence: number;
};

export type ReferenceExercise = {
  expected_notes_raw: string | null;
  expected_notes: string[];
  expected_tab_raw?: string | null;
  expected_chords_raw?: string | null;
  expected_chords?: ExpectedChord[];
  source?: "notes" | "tab" | "chords" | "none";
  valid: boolean;
  warnings: string[];
};

export type ExpectedChord = {
  symbol: string;
  root: string;
  quality: string;
  tones: string[];
};

export type ReferenceMatch = {
  expected_note: string;
  detected_note: string;
  expected_index: number;
  detected_index: number;
  confidence: number;
};

export type ReferenceMiss = {
  expected_note: string;
  expected_index: number;
};

export type ReferenceExtra = {
  detected_note: string;
  detected_index: number;
  confidence: number;
};

export type ReferenceComparison = {
  enabled: boolean;
  valid: boolean;
  matched_count: number;
  missed_count: number;
  extra_count: number;
  expected_count: number;
  detected_count: number;
  match_ratio: number | null;
  summary: string;
  matches: ReferenceMatch[];
  misses: ReferenceMiss[];
  extras: ReferenceExtra[];
  warnings: string[];
};

export type ChordComparisonItem = {
  symbol: string;
  expected_tones: string[];
  detected_tones: string[];
  matched_tones: string[];
  missing_tones: string[];
  status: "matched" | "partial" | "missed";
};

export type ChordComparison = {
  enabled: boolean;
  valid: boolean;
  expected_count: number;
  detected_note_count: number;
  matched_chord_count: number;
  partial_chord_count: number;
  missed_chord_count: number;
  summary: string;
  chords: ChordComparisonItem[];
  warnings: string[];
};

export type StrummingPattern = {
  expected_pattern_raw: string | null;
  strokes: string[];
  valid: boolean;
  warnings: string[];
};

export type StrummingComparison = {
  enabled: boolean;
  valid: boolean;
  expected_stroke_count: number;
  detected_attack_count: number;
  count_difference: number | null;
  attack_match_level: "good" | "close" | "low" | "too_many" | "unavailable";
  spacing_level: "steady" | "somewhat_uneven" | "uneven" | "unavailable";
  summary: string;
  warnings: string[];
};

export type PracticeAudioAnalysisResponse = {
  filename: string;
  duration_seconds: number;
  sample_rate: number;
  tempo_bpm: number | null;
  onset_count: number;
  rms_energy_mean: number;
  spectral_centroid_mean: number;
  zero_crossing_rate_mean: number;
  analysis_warnings: string[];
  valid: boolean;
  errors: string[];
  practice_context?: PracticeContext | null;
  practice_metrics?: PracticeMetrics | null;
  recording_quality?: RecordingQuality | null;
  segment_analysis?: SegmentAnalysis[] | null;
  coach_feedback?: CoachFeedback | null;
  pitch_analysis?: PitchAnalysis | null;
  note_events?: NoteEvent[] | null;
  reference_exercise?: ReferenceExercise | null;
  reference_comparison?: ReferenceComparison | null;
  chord_comparison?: ChordComparison | null;
  strumming_pattern?: StrummingPattern | null;
  strumming_comparison?: StrummingComparison | null;
};

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Pick<Response, "ok" | "status" | "json" | "text">>;

const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000";

export async function analyzePracticeAudio(
  audioInput: File | PracticeAudioRequest,
  fetcher: FetchLike = fetch,
  backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL,
): Promise<PracticeAudioAnalysisResponse> {
  const request = normalizePracticeAudioRequest(audioInput);
  const formData = new FormData();
  formData.append("audio_file", request.audio_file);
  formData.append("practice_focus", request.practice_focus ?? "general");

  const description = request.practice_description?.trim();
  if (description) {
    formData.append("practice_description", description);
  }

  const expectedNotes = request.expected_notes?.trim();
  if (expectedNotes) {
    formData.append("expected_notes", expectedNotes);
  }

  const expectedTab = request.expected_tab?.trim();
  if (expectedTab) {
    formData.append("expected_tab", expectedTab);
  }

  const expectedChords = request.expected_chords?.trim();
  if (expectedChords) {
    formData.append("expected_chords", expectedChords);
  }

  const expectedStrummingPattern = request.expected_strumming_pattern?.trim();
  if (expectedStrummingPattern) {
    formData.append("expected_strumming_pattern", expectedStrummingPattern);
  }

  const response = await fetcher(
    `${normalizeBackendUrl(backendUrl || DEFAULT_BACKEND_URL)}/practice/analyze-audio`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Practice Coach request failed: ${response.status} ${detail}`);
  }

  return response.json() as Promise<PracticeAudioAnalysisResponse>;
}

function normalizeBackendUrl(backendUrl: string): string {
  return backendUrl.replace(/\/+$/, "");
}

function normalizePracticeAudioRequest(
  audioInput: File | PracticeAudioRequest,
): PracticeAudioRequest {
  if (
    typeof audioInput === "object" &&
    audioInput !== null &&
    "audio_file" in audioInput
  ) {
    return audioInput;
  }

  return {
    audio_file: audioInput,
    practice_focus: "general",
  };
}

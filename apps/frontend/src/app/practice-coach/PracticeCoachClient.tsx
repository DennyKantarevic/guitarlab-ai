"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  analyzePracticeAudio,
  type PracticeAudioAnalysisResponse,
  type PracticeFocus,
  type PracticeAudioRequest,
} from "@/lib/practiceCoach";
import {
  buildPracticeComparison,
  clearPracticeHistory,
  readPracticeHistory,
  savePracticeSessionFromAnalysis,
  summarizePracticeHistory,
  type PracticeComparison,
  type PracticeHistorySession,
} from "@/lib/practiceHistory";

type PracticeCoachClientProps = {
  analyzeAudio?: (
    request: PracticeAudioRequest,
  ) => Promise<PracticeAudioAnalysisResponse>;
};

const PRACTICE_FOCUS_LABELS: Record<PracticeFocus, string> = {
  general: "General feedback",
  note_clarity: "Note clarity",
  timing: "Timing and rhythm",
  speed_control: "Speed control",
  lead_phrase: "Lead phrase",
  tone_recording: "Tone / recording quality",
};

const PRACTICE_FOCUS_OPTIONS: Array<{
  value: PracticeFocus;
  label: string;
}> = [
  { value: "general", label: PRACTICE_FOCUS_LABELS.general },
  { value: "note_clarity", label: PRACTICE_FOCUS_LABELS.note_clarity },
  { value: "timing", label: PRACTICE_FOCUS_LABELS.timing },
  { value: "speed_control", label: PRACTICE_FOCUS_LABELS.speed_control },
  { value: "lead_phrase", label: PRACTICE_FOCUS_LABELS.lead_phrase },
  { value: "tone_recording", label: PRACTICE_FOCUS_LABELS.tone_recording },
];

export default function PracticeCoachClient({
  analyzeAudio = (request) => analyzePracticeAudio(request),
}: PracticeCoachClientProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [practiceFocus, setPracticeFocus] = useState<PracticeFocus>("general");
  const [practiceDescription, setPracticeDescription] = useState("");
  const [expectedNotes, setExpectedNotes] = useState("");
  const [analysis, setAnalysis] =
    useState<PracticeAudioAnalysisResponse | null>(null);
  const [practiceComparison, setPracticeComparison] =
    useState<PracticeComparison | null>(null);
  const [historySessions, setHistorySessions] = useState<
    PracticeHistorySession[]
  >([]);
  const [hasMounted, setHasMounted] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isActive = true;

    queueMicrotask(() => {
      if (!isActive) {
        return;
      }
      setHasMounted(true);
      setHistorySessions(readPracticeHistory());
    });

    return () => {
      isActive = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setAnalysis(null);
    setPracticeComparison(null);

    if (!selectedFile) {
      setError("Select a .wav file before analyzing.");
      return;
    }

    setIsLoading(true);
    try {
      const trimmedDescription = practiceDescription.trim();
      const request: PracticeAudioRequest = {
        audio_file: selectedFile,
        practice_focus: practiceFocus,
      };
      if (trimmedDescription) {
        request.practice_description = trimmedDescription;
      }
      const trimmedExpectedNotes = expectedNotes.trim();
      if (trimmedExpectedNotes) {
        request.expected_notes = trimmedExpectedNotes;
      }

      const nextAnalysis = await analyzeAudio(request);
      setAnalysis(nextAnalysis);
      if (!nextAnalysis.valid) {
        setError(
          nextAnalysis.errors.join(" ") || "Practice Coach analysis failed.",
        );
      } else {
        setPracticeComparison(
          buildPracticeComparison(nextAnalysis, historySessions),
        );
        setHistorySessions(savePracticeSessionFromAnalysis(nextAnalysis));
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to analyze the audio file.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleClearHistory() {
    clearPracticeHistory();
    setHistorySessions([]);
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="max-w-3xl space-y-2">
          <h1 className="text-3xl font-semibold">Practice Coach</h1>
          <p className="text-sm text-neutral-600">
            Upload a .wav take, choose what you are practicing, and get focused
            feedback you can act on.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-start">
          <PracticeSetup
            error={error}
            expectedNotes={expectedNotes}
            isLoading={isLoading}
            onDescriptionChange={setPracticeDescription}
            onExpectedNotesChange={setExpectedNotes}
            onFileChange={setSelectedFile}
            onFocusChange={setPracticeFocus}
            onSubmit={handleSubmit}
            practiceDescription={practiceDescription}
            practiceFocus={practiceFocus}
            selectedFile={selectedFile}
          />

          <LatestResult
            analysis={analysis}
            comparison={practiceComparison}
            historySessions={historySessions}
          />
        </div>

        <PracticeHistory
          hasMounted={hasMounted}
          onClearHistory={handleClearHistory}
          sessions={historySessions}
        />

        {analysis ? <TechnicalDetails analysis={analysis} /> : null}
      </div>
    </main>
  );
}

function PracticeSetup({
  error,
  expectedNotes,
  isLoading,
  onDescriptionChange,
  onExpectedNotesChange,
  onFileChange,
  onFocusChange,
  onSubmit,
  practiceDescription,
  practiceFocus,
  selectedFile,
}: {
  error: string;
  expectedNotes: string;
  isLoading: boolean;
  onDescriptionChange: (value: string) => void;
  onExpectedNotesChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
  onFocusChange: (focus: PracticeFocus) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  practiceDescription: string;
  practiceFocus: PracticeFocus;
  selectedFile: File | null;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Practice setup</h2>
          <p className="text-sm text-neutral-600">
            Tell the coach what to listen for, then upload a .wav take.
          </p>
        </div>

        <section className="space-y-3">
          <h3 className="font-semibold">What are you practicing?</h3>
          <div className="space-y-2">
            <label
              className="block text-sm font-medium"
              htmlFor="practice_focus"
            >
              Practice focus
            </label>
            <select
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
              id="practice_focus"
              name="practice_focus"
              onChange={(event) =>
                onFocusChange(event.target.value as PracticeFocus)
              }
              value={practiceFocus}
            >
              {PRACTICE_FOCUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label
              className="block text-sm font-medium"
              htmlFor="practice_description"
            >
              Describe what you were trying to play
            </label>
            <textarea
              className="min-h-28 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              id="practice_description"
              name="practice_description"
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="Clean pentatonic scale&#10;Nirvana-style power chord rhythm&#10;Eighth-note alternate picking&#10;Soft indie lead phrase"
              rows={4}
              value={practiceDescription}
            />
          </div>
        </section>

        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="expected_notes">
            Expected notes
          </label>
          <p className="text-xs text-neutral-600">
            Optional. Enter a simple note sequence like A4 B4 C5 D5. This
            compares detected notes to your own exercise, not a song database.
          </p>
          <textarea
            className="min-h-20 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            id="expected_notes"
            name="expected_notes"
            onChange={(event) => onExpectedNotesChange(event.target.value)}
            placeholder="A4 B4 C5 D5"
            rows={3}
            value={expectedNotes}
          />
          <ExpectedNotesHelpPanel />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="audio_file">
            WAV file
          </label>
          <input
            accept=".wav,audio/wav,audio/wave"
            className="block w-full text-sm"
            id="audio_file"
            name="audio_file"
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
            type="file"
          />
          {selectedFile ? (
            <p className="text-xs text-neutral-500">
              Selected: {selectedFile.name}
            </p>
          ) : null}
        </div>

        <button
          className="w-full rounded-md border border-neutral-900 bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-60"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? "Analyzing..." : "Analyze"}
        </button>

        {error ? (
          <div
            className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
            role="alert"
          >
            {error}
          </div>
        ) : null}
      </form>
    </section>
  );
}

function ExpectedNotesHelpPanel() {
  return (
    <aside className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm">
      <div className="space-y-1">
        <h4 className="font-semibold">How to use expected notes</h4>
        <p className="text-neutral-700">
          Enter a simple note sequence you are trying to play. The coach
          compares detected notes from your recording to your own exercise.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <h5 className="text-xs font-semibold uppercase text-neutral-500">
            Good examples
          </h5>
          <ul className="list-disc space-y-1 pl-5">
            <li>A4 B4 C5 D5</li>
            <li>E3 G3 A3</li>
            <li>C#4 D#4 F#4</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h5 className="text-xs font-semibold uppercase text-neutral-500">
            Not supported yet
          </h5>
          <ul className="list-disc space-y-1 pl-5">
            <li>tabs</li>
            <li>chords</li>
            <li>strumming patterns</li>
            <li>song names</li>
            <li>rhythm notation</li>
            <li>full song comparison</li>
          </ul>
        </div>
      </div>

      <p className="text-xs text-neutral-600">
        This works best for short, single-note exercises recorded clearly and
        slowly.
      </p>
    </aside>
  );
}

function LatestResult({
  analysis,
  comparison,
  historySessions,
}: {
  analysis: PracticeAudioAnalysisResponse | null;
  comparison: PracticeComparison | null;
  historySessions: PracticeHistorySession[];
}) {
  if (!analysis) {
    return (
      <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Latest result</h2>
          <p className="text-sm text-neutral-600">
            Choose a focus, upload a .wav take, and run the coach to see your
            score and next steps here.
          </p>
          <div className="rounded-md border border-dashed border-neutral-300 p-4 text-sm text-neutral-600">
            No take analyzed yet.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Latest result</h2>
        <p className="text-sm text-neutral-600">{analysis.filename}</p>
      </div>

      {analysis.practice_metrics ? (
        <ScoreSummary analysis={analysis} historySessions={historySessions} />
      ) : null}

      {analysis.coach_feedback ? (
        <CoachFeedback
          context={analysis.practice_context}
          feedback={analysis.coach_feedback}
        />
      ) : null}

      <ReferenceExerciseResult analysis={analysis} />

      {comparison ? <PracticeComparisonResult comparison={comparison} /> : null}
    </section>
  );
}

function ScoreSummary({
  analysis,
  historySessions,
}: {
  analysis: PracticeAudioAnalysisResponse;
  historySessions: PracticeHistorySession[];
}) {
  const metrics = analysis.practice_metrics;
  const quality = analysis.recording_quality;
  const stats = summarizePracticeHistory(historySessions);

  if (!metrics) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
          <div className="text-sm text-neutral-500">Your score</div>
          <div className="text-4xl font-semibold">{metrics.overall_score}</div>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Field
            label="Practice focus"
            value={
              analysis.practice_context
                ? PRACTICE_FOCUS_LABELS[analysis.practice_context.practice_focus]
                : "Not available"
            }
          />
          <Field
            label="Recording quality"
            value={quality?.quality_level ?? "Not available"}
          />
          <Field label="Attack activity" value={metrics.attack_activity} />
          <Field
            label="Latest overall score"
            value={formatNullableScore(stats.latestOverallScore)}
          />
          <Field
            label="Best overall score"
            value={formatNullableScore(stats.bestOverallScore)}
          />
          <Field
            label="Average overall score"
            value={formatNullableScore(stats.averageOverallScore)}
          />
          {analysis.practice_context?.practice_description ? (
            <Field
              label="Goal"
              value={analysis.practice_context.practice_description}
            />
          ) : null}
        </dl>
      </div>
      {analysis.coach_feedback?.score_explanation ? (
        <section className="space-y-1">
          <h3 className="font-semibold">What this means</h3>
          <p className="text-sm text-neutral-700">
            {analysis.coach_feedback.score_explanation}
          </p>
        </section>
      ) : null}
    </section>
  );
}

function PracticeMetrics({
  metrics,
}: {
  metrics: NonNullable<PracticeAudioAnalysisResponse["practice_metrics"]>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Practice metrics</h2>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Field label="Overall score" value={metrics.overall_score} />
        <Field
          label="Timing activity score"
          value={metrics.timing_activity_score}
        />
        <Field
          label="Recording quality score"
          value={metrics.recording_quality_score}
        />
        <Field
          label="Onset density per second"
          value={metrics.onset_density_per_second}
        />
        <Field label="Energy level" value={metrics.energy_level} />
        <Field label="Brightness level" value={metrics.brightness_level} />
        <Field label="Attack activity" value={metrics.attack_activity} />
      </dl>
      <ListSection title="Recommendations" items={metrics.recommendations} />
    </section>
  );
}

function RecordingQuality({
  quality,
}: {
  quality: NonNullable<PracticeAudioAnalysisResponse["recording_quality"]>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Recording quality</h2>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Field label="Quality level" value={quality.quality_level} />
        <Field label="Peak amplitude" value={quality.peak_amplitude} />
        <Field
          label="Clipped sample ratio"
          value={quality.clipped_sample_ratio}
        />
        <Field label="Silence ratio" value={quality.silence_ratio} />
      </dl>
      <ListSection
        title="Recording quality warnings"
        items={quality.warnings}
      />
    </section>
  );
}

function SegmentAnalysis({
  segments,
}: {
  segments: NonNullable<PracticeAudioAnalysisResponse["segment_analysis"]>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Segment analysis</h2>
      <div className="space-y-4">
        {segments.map((segment) => (
          <section className="space-y-2" key={segment.segment_index}>
            <h3 className="font-semibold">
              Segment {segment.segment_index + 1}
            </h3>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Field label="Start seconds" value={segment.start_seconds} />
              <Field label="End seconds" value={segment.end_seconds} />
              <Field label="Duration seconds" value={segment.duration_seconds} />
              <Field label="Onset count" value={segment.onset_count} />
              <Field
                label="Onset density per second"
                value={segment.onset_density_per_second}
              />
              <Field label="RMS energy mean" value={segment.rms_energy_mean} />
              <Field
                label="Spectral centroid mean"
                value={segment.spectral_centroid_mean}
              />
              <Field label="Energy level" value={segment.energy_level} />
              <Field label="Brightness level" value={segment.brightness_level} />
              <Field label="Attack activity" value={segment.attack_activity} />
            </dl>
          </section>
        ))}
      </div>
    </section>
  );
}

function CoachFeedback({
  context,
  feedback,
}: {
  context: PracticeAudioAnalysisResponse["practice_context"];
  feedback: NonNullable<PracticeAudioAnalysisResponse["coach_feedback"]>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Coach feedback</h2>
      {context ? <PracticeContextSummary context={context} /> : null}
      <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
        <h3 className="font-semibold">{feedback.headline}</h3>
        <p className="mt-2 text-sm text-neutral-700">{feedback.summary}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ListSection title="What went well" items={feedback.what_went_well} />
        <ListSection title="Work on" items={feedback.work_on} />
        <ListSection
          title="Next practice steps"
          items={feedback.next_practice_steps}
        />
        <ListSection title="Coach notes" items={feedback.coach_notes} />
      </div>
    </section>
  );
}

function PracticeContextSummary({
  context,
}: {
  context: NonNullable<PracticeAudioAnalysisResponse["practice_context"]>;
}) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <Field
        label="Practice focus"
        value={PRACTICE_FOCUS_LABELS[context.practice_focus]}
      />
      {context.practice_description ? (
        <Field label="Goal" value={context.practice_description} />
      ) : null}
    </dl>
  );
}

function PracticeComparisonResult({
  comparison,
}: {
  comparison: PracticeComparison;
}) {
  return (
    <section className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-4">
      <h2 className="text-xl font-semibold">
        Progress compared to last similar session
      </h2>
      <p className="text-sm">{comparison.message}</p>

      {comparison.previousSession ? (
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Field
            label="Previous overall score"
            value={formatNullableScore(comparison.previousOverallScore)}
          />
          <Field
            label="Current overall score"
            value={formatNullableScore(comparison.currentOverallScore)}
          />
          <Field
            label="Score change"
            value={formatScoreChange(comparison.scoreChange)}
          />
          <Field
            label="Previous date"
            value={formatSessionDate(comparison.previousSession.created_at)}
          />
          {comparison.previousSession.practice_description ? (
            <Field
              label="Previous practice description"
              value={comparison.previousSession.practice_description}
            />
          ) : null}
        </dl>
      ) : null}
    </section>
  );
}

function ReferenceExerciseResult({
  analysis,
}: {
  analysis: PracticeAudioAnalysisResponse;
}) {
  const referenceExercise = analysis.reference_exercise;
  const comparison = analysis.reference_comparison;

  if (!comparison?.enabled) {
    return null;
  }

  const missedNotes = comparison.misses.map((miss) => miss.expected_note);
  const extraNotes = comparison.extras.map((extra) => extra.detected_note);
  const warnings = dedupe([
    ...(referenceExercise?.warnings ?? []),
    ...comparison.warnings,
  ]);

  return (
    <section className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-4">
      <h2 className="text-xl font-semibold">Reference exercise</h2>
      <p className="text-sm text-neutral-700">{comparison.summary}</p>

      {referenceExercise && !referenceExercise.valid ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Some expected notes were not recognized. Use notes like A4, C#5, or
          E3.
        </p>
      ) : null}

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Field
          label="Matched notes"
          value={`${comparison.matched_count} of ${comparison.expected_count}`}
        />
        <Field
          label="Missed notes"
          value={missedNotes.length > 0 ? missedNotes.join(", ") : "None"}
        />
        <Field
          label="Extra detected notes"
          value={extraNotes.length > 0 ? extraNotes.join(", ") : "None"}
        />
        <Field
          label="Match ratio"
          value={formatMatchRatio(comparison.match_ratio)}
        />
      </dl>

      {warnings.length > 0 ? (
        <ListSection title="Reference warnings" items={warnings} />
      ) : null}
    </section>
  );
}

function TechnicalDetails({
  analysis,
}: {
  analysis: PracticeAudioAnalysisResponse;
}) {
  return (
    <details className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <summary className="cursor-pointer text-xl font-semibold text-neutral-900">
        Technical details
      </summary>

      <section className="space-y-5 pt-4">
        <h2 className="text-xl font-semibold">Raw analysis details</h2>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Field label="Filename" value={analysis.filename} />
          <Field label="Duration seconds" value={analysis.duration_seconds} />
          <Field label="Sample rate" value={analysis.sample_rate} />
          <Field
            label="Tempo BPM"
            value={analysis.tempo_bpm ?? "Not detected"}
          />
          <Field label="Onset count" value={analysis.onset_count} />
          <Field label="RMS energy mean" value={analysis.rms_energy_mean} />
          <Field
            label="Spectral centroid mean"
            value={analysis.spectral_centroid_mean}
          />
          <Field
            label="Zero crossing rate mean"
            value={analysis.zero_crossing_rate_mean}
          />
          <Field label="Valid" value={analysis.valid ? "true" : "false"} />
        </dl>

        <ListSection
          title="Analysis warnings"
          items={analysis.analysis_warnings}
        />
        <ListSection
          title="Errors"
          items={analysis.errors}
          emptyText="No errors."
        />

        {analysis.practice_metrics ? (
          <PracticeMetrics metrics={analysis.practice_metrics} />
        ) : null}

        {analysis.recording_quality ? (
          <RecordingQuality quality={analysis.recording_quality} />
        ) : null}

        {analysis.segment_analysis ? (
          <SegmentAnalysis segments={analysis.segment_analysis} />
        ) : null}

        {analysis.pitch_analysis ? (
          <PitchAnalysis analysis={analysis.pitch_analysis} />
        ) : null}

        {analysis.note_events ? (
          <NoteEvents events={analysis.note_events} />
        ) : null}
      </section>
    </details>
  );
}

function PitchAnalysis({
  analysis,
}: {
  analysis: NonNullable<PracticeAudioAnalysisResponse["pitch_analysis"]>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Pitch Analysis</h2>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Field label="Method" value={analysis.method} />
        <Field
          label="Estimated note"
          value={analysis.estimated_note ?? "Not detected"}
        />
        <Field
          label="Estimated frequency Hz"
          value={analysis.estimated_frequency_hz ?? "Not detected"}
        />
        <Field label="Confidence" value={analysis.confidence} />
      </dl>
      <ListSection title="Pitch warnings" items={analysis.pitch_warnings} />

      <section className="space-y-2">
        <h3 className="font-semibold">Detected notes</h3>
        {analysis.detected_notes.length > 0 ? (
          <ul className="space-y-3 text-sm">
            {analysis.detected_notes.map((note) => (
              <li
                className="space-y-1"
                key={`${note.note}-${note.start_seconds}-${note.end_seconds}`}
              >
                <div>Note: {note.note}</div>
                <div>Frequency Hz: {note.frequency_hz}</div>
                <div>Start seconds: {note.start_seconds}</div>
                <div>End seconds: {note.end_seconds}</div>
                <div>Confidence: {note.confidence}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">No detected notes.</p>
        )}
      </section>
    </section>
  );
}

function NoteEvents({
  events,
}: {
  events: NonNullable<PracticeAudioAnalysisResponse["note_events"]>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Detected Note Events</h2>
      {events.length > 0 ? (
        <ul className="space-y-3 text-sm">
          {events.map((event) => (
            <li
              className="space-y-2"
              key={`${event.note}-${event.start_seconds}-${event.end_seconds}`}
            >
              <dl className="grid gap-3 sm:grid-cols-2">
                <Field label="Note" value={event.note} />
                <Field label="Frequency Hz" value={event.frequency_hz} />
                <Field label="Start seconds" value={event.start_seconds} />
                <Field label="End seconds" value={event.end_seconds} />
                <Field label="Duration seconds" value={event.duration_seconds} />
                <Field label="Confidence" value={event.confidence} />
              </dl>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-500">No note events detected.</p>
      )}
    </section>
  );
}

function PracticeHistory({
  hasMounted,
  onClearHistory,
  sessions,
}: {
  hasMounted: boolean;
  onClearHistory: () => void;
  sessions: PracticeHistorySession[];
}) {
  const stats = summarizePracticeHistory(sessions);

  return (
    <section className="space-y-4 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Practice history</h2>
        <p className="text-sm text-neutral-600">
          Practice history is stored locally in this browser. Audio files are
          not saved.
        </p>
      </div>

      {!hasMounted ? (
        <p className="text-sm text-neutral-500">
          Practice history loads in this browser after the page opens.
        </p>
      ) : (
        <>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Field
              label="Saved sessions"
              value={`${stats.sessionCount} saved ${
                stats.sessionCount === 1 ? "session" : "sessions"
              }`}
            />
            <Field
              label="Latest overall score"
              value={formatNullableScore(stats.latestOverallScore)}
            />
            <Field
              label="Best overall score"
              value={formatNullableScore(stats.bestOverallScore)}
            />
            <Field
              label="Average overall score"
              value={formatNullableScore(stats.averageOverallScore)}
            />
            <Field
              label="Latest recording quality"
              value={stats.latestQualityLevel ?? "Not available"}
            />
          </dl>

          <button
            className="rounded-md border border-neutral-900 px-3 py-2 text-sm disabled:opacity-60"
            disabled={sessions.length === 0}
            onClick={onClearHistory}
            type="button"
          >
            Clear History
          </button>

          {sessions.length > 0 ? (
            <ul className="grid gap-3 text-sm lg:grid-cols-2">
              {sessions.map((session) => (
                <li
                  className="space-y-1 rounded-md border border-neutral-200 p-3"
                  key={session.id}
                >
                  <div>
                    <strong>{session.filename}</strong>
                  </div>
                  <div>{formatSessionDate(session.created_at)}</div>
                  <div>
                    Overall score: {formatNullableScore(session.overall_score)}
                  </div>
                  {session.practice_focus ? (
                    <div>
                      Practice focus:{" "}
                      {PRACTICE_FOCUS_LABELS[session.practice_focus]}
                    </div>
                  ) : null}
                  {session.practice_description ? (
                    <div>Goal: {session.practice_description}</div>
                  ) : null}
                  <div>
                    Recording quality: {session.quality_level ?? "Not available"}
                  </div>
                  <div>
                    Attack activity: {session.attack_activity ?? "Not available"}
                  </div>
                  {session.next_steps[0] ? (
                    <div>Next step: {session.next_steps[0]}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">
              No saved practice sessions yet.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-neutral-500">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatNullableScore(score: number | null): string {
  return score === null ? "Not available" : String(score);
}

function formatSessionDate(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return createdAt;
  }

  return date.toLocaleString();
}

function formatScoreChange(scoreChange: number | null): string {
  if (scoreChange === null) {
    return "Not available";
  }

  return scoreChange > 0 ? `+${scoreChange}` : String(scoreChange);
}

function formatMatchRatio(matchRatio: number | null): string {
  if (matchRatio === null) {
    return "Not available";
  }

  return `${Math.round(matchRatio * 100)}%`;
}

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items));
}

function ListSection({
  title,
  items,
  emptyText = "None.",
}: {
  title: string;
  items: string[];
  emptyText?: string;
}) {
  return (
    <section className="space-y-2">
      <h3 className="font-semibold">{title}</h3>
      {items.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-500">{emptyText}</p>
      )}
    </section>
  );
}

"use client";

import { FormEvent, useState } from "react";

import {
  analyzePracticeAudio,
  type PracticeAudioAnalysisResponse,
  type PracticeAudioRequest,
} from "@/lib/practiceCoach";
import {
  clearPracticeHistory,
  readPracticeHistory,
  savePracticeSessionFromAnalysis,
  summarizePracticeHistory,
  type PracticeHistorySession,
} from "@/lib/practiceHistory";

type PracticeCoachClientProps = {
  analyzeAudio?: (
    request: PracticeAudioRequest,
  ) => Promise<PracticeAudioAnalysisResponse>;
};

export default function PracticeCoachClient({
  analyzeAudio = ({ audio_file }) => analyzePracticeAudio(audio_file),
}: PracticeCoachClientProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] =
    useState<PracticeAudioAnalysisResponse | null>(null);
  const [historySessions, setHistorySessions] = useState<
    PracticeHistorySession[]
  >(() => readPracticeHistory());
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setAnalysis(null);

    if (!selectedFile) {
      setError("Select a .wav file before analyzing.");
      return;
    }

    setIsLoading(true);
    try {
      const nextAnalysis = await analyzeAudio({ audio_file: selectedFile });
      setAnalysis(nextAnalysis);
      if (!nextAnalysis.valid) {
        setError(
          nextAnalysis.errors.join(" ") || "Practice Coach analysis failed.",
        );
      } else {
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
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Practice Coach</h1>
          <p className="text-sm text-neutral-600">
            Upload a .wav file to run the current deterministic audio analysis.
          </p>
        </header>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="audio_file">
              WAV file
            </label>
            <input
              accept=".wav,audio/wav,audio/wave"
              id="audio_file"
              name="audio_file"
              onChange={(event) =>
                setSelectedFile(event.target.files?.[0] ?? null)
              }
              type="file"
            />
          </div>

          <button
            className="border border-neutral-900 px-3 py-2 text-sm disabled:opacity-60"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? "Analyzing..." : "Analyze"}
          </button>
        </form>

        {error ? (
          <div className="border border-red-400 p-3 text-sm" role="alert">
            {error}
          </div>
        ) : null}

        {analysis ? (
          <AnalysisResult
            analysis={analysis}
            historySessions={historySessions}
          />
        ) : null}

        <PracticeHistory
          onClearHistory={handleClearHistory}
          sessions={historySessions}
        />

        {analysis ? <TechnicalDetails analysis={analysis} /> : null}
      </div>
    </main>
  );
}

function AnalysisResult({
  analysis,
  historySessions,
}: {
  analysis: PracticeAudioAnalysisResponse;
  historySessions: PracticeHistorySession[];
}) {
  return (
    <section className="space-y-5">
      {analysis.practice_metrics ? (
        <ScoreCard analysis={analysis} historySessions={historySessions} />
      ) : null}

      {analysis.coach_feedback ? (
        <CoachFeedback feedback={analysis.coach_feedback} />
      ) : null}
    </section>
  );
}

function ScoreCard({
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
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Score</h2>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Field label="Overall score" value={metrics.overall_score} />
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
      </dl>
      {analysis.coach_feedback?.score_explanation ? (
        <p className="text-sm">{analysis.coach_feedback.score_explanation}</p>
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
  feedback,
}: {
  feedback: NonNullable<PracticeAudioAnalysisResponse["coach_feedback"]>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Coach feedback</h2>
      <h3 className="font-semibold">{feedback.headline}</h3>
      <p className="text-sm">{feedback.summary}</p>
      <ListSection title="What went well" items={feedback.what_went_well} />
      <ListSection title="Work on" items={feedback.work_on} />
      <ListSection
        title="Next practice steps"
        items={feedback.next_practice_steps}
      />
      <ListSection title="Coach notes" items={feedback.coach_notes} />
    </section>
  );
}

function TechnicalDetails({
  analysis,
}: {
  analysis: PracticeAudioAnalysisResponse;
}) {
  return (
    <details className="space-y-4">
      <summary className="cursor-pointer text-xl font-semibold">
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
  onClearHistory,
  sessions,
}: {
  onClearHistory: () => void;
  sessions: PracticeHistorySession[];
}) {
  const stats = summarizePracticeHistory(sessions);

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Practice history</h2>
        <p className="text-sm text-neutral-600">
          Practice history is stored locally in this browser. Audio files are
          not saved.
        </p>
      </div>

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
        className="border border-neutral-900 px-3 py-2 text-sm disabled:opacity-60"
        disabled={sessions.length === 0}
        onClick={onClearHistory}
        type="button"
      >
        Clear History
      </button>

      {sessions.length > 0 ? (
        <ul className="space-y-3 text-sm">
          {sessions.map((session) => (
            <li className="space-y-1" key={session.id}>
              <div>
                <strong>{session.filename}</strong>
              </div>
              <div>{formatSessionDate(session.created_at)}</div>
              <div>Overall score: {formatNullableScore(session.overall_score)}</div>
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

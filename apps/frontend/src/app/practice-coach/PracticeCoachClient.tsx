"use client";

import { FormEvent, useState } from "react";

import {
  analyzePracticeAudio,
  type PracticeAudioAnalysisResponse,
  type PracticeAudioRequest,
} from "@/lib/practiceCoach";

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

        {analysis ? <AnalysisResult analysis={analysis} /> : null}
      </div>
    </main>
  );
}

function AnalysisResult({
  analysis,
}: {
  analysis: PracticeAudioAnalysisResponse;
}) {
  return (
    <section className="space-y-5">
      <h2 className="text-xl font-semibold">Audio analysis</h2>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Field label="Filename" value={analysis.filename} />
        <Field label="Duration seconds" value={analysis.duration_seconds} />
        <Field label="Sample rate" value={analysis.sample_rate} />
        <Field label="Tempo BPM" value={analysis.tempo_bpm ?? "Not detected"} />
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

      <ListSection title="Analysis warnings" items={analysis.analysis_warnings} />
      <ListSection title="Errors" items={analysis.errors} emptyText="No errors." />

      {analysis.practice_metrics ? (
        <PracticeMetrics metrics={analysis.practice_metrics} />
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

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-neutral-500">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
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

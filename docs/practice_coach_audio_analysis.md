# Practice Coach Audio Analysis

This is the backend foundation for the AI Guitar Practice Coach. It extracts deterministic audio features from an uploaded `.wav` file and returns basic rule-based practice metrics, recording-quality checks, fixed-length segment analysis, measured feedback, a narrow monophonic pitch-analysis foundation, and approximate monophonic note events. The frontend can store compact recent score summaries in browser `localStorage`, but the backend does not persist practice history. It is not full coaching yet.

No LLM calls or agents are used.

## Endpoint

`POST /practice/analyze-audio`

## Request Format

Use `multipart/form-data` with one file field:

- `audio_file`: `.wav` file

Example:

```bash
curl -X POST http://127.0.0.1:8000/practice/analyze-audio \
  -F "audio_file=@practice.wav"
```

## Response Fields

```json
{
  "filename": "practice.wav",
  "duration_seconds": 1.0,
  "sample_rate": 22050,
  "tempo_bpm": null,
  "onset_count": 0,
  "rms_energy_mean": 0.1,
  "spectral_centroid_mean": 440.0,
  "zero_crossing_rate_mean": 0.04,
  "analysis_warnings": [],
  "valid": true,
  "errors": [],
  "practice_metrics": {
    "overall_score": 82,
    "timing_activity_score": 75,
    "recording_quality_score": 90,
    "onset_density_per_second": 2.0,
    "energy_level": "medium",
    "brightness_level": "dark",
    "attack_activity": "moderate",
    "recommendations": [
      "Record at least a few seconds so the coach can analyze more of your playing."
    ]
  },
  "recording_quality": {
    "peak_amplitude": 0.42,
    "clipped_sample_ratio": 0.0,
    "silence_ratio": 0.08,
    "quality_level": "usable",
    "warnings": [
      "The clip is too short for reliable feedback."
    ]
  },
  "segment_analysis": [
    {
      "segment_index": 0,
      "start_seconds": 0.0,
      "end_seconds": 1.0,
      "duration_seconds": 1.0,
      "onset_count": 2,
      "onset_density_per_second": 2.0,
      "rms_energy_mean": 0.1,
      "spectral_centroid_mean": 440.0,
      "energy_level": "medium",
      "brightness_level": "dark",
      "attack_activity": "moderate"
    }
  ],
  "coach_feedback": {
    "summary": "Analyzed 1.00 seconds of audio. Recording quality is usable, attack activity is moderate, and brightness is dark.",
    "strengths": [
      "The recording is usable for basic audio feedback."
    ],
    "focus_areas": [
      "The clip is too short for reliable feedback."
    ],
    "next_steps": [
      "Record another take at the same settings and compare the measured scores."
    ]
  },
  "pitch_analysis": {
    "enabled": true,
    "method": "librosa.pyin",
    "estimated_note": "A4",
    "estimated_frequency_hz": 440.0,
    "confidence": 0.82,
    "detected_notes": [
      {
        "note": "A4",
        "frequency_hz": 440.0,
        "start_seconds": 0.0,
        "end_seconds": 0.5,
        "confidence": 0.82
      }
    ],
    "pitch_warnings": [
      "This feature works best with single-note recordings, not chords."
    ]
  },
  "note_events": [
    {
      "note": "A4",
      "frequency_hz": 440.0,
      "start_seconds": 0.0,
      "end_seconds": 0.5,
      "duration_seconds": 0.5,
      "confidence": 0.82
    }
  ]
}
```

- `filename`: Original uploaded filename.
- `duration_seconds`: Audio duration.
- `sample_rate`: Loaded sample rate.
- `tempo_bpm`: Estimated tempo when enough onset information is available, otherwise `null`.
- `onset_count`: Count of detected onset events.
- `rms_energy_mean`: Mean RMS energy.
- `spectral_centroid_mean`: Mean spectral centroid.
- `zero_crossing_rate_mean`: Mean zero crossing rate.
- `analysis_warnings`: Non-fatal analysis notes.
- `valid`: Whether analysis succeeded.
- `errors`: Simple validation or decode errors.
- `practice_metrics`: Basic deterministic scoring metrics for valid uploads. Invalid uploads return `practice_metrics: null`.
- `recording_quality`: Recording setup checks for valid uploads. Invalid uploads return `recording_quality: null`.
- `segment_analysis`: Fixed-length 5-second segment summaries for valid uploads. Invalid uploads return `segment_analysis: null`.
- `coach_feedback`: Deterministic measured feedback for valid uploads. Invalid uploads return `coach_feedback: null`.
- `pitch_analysis`: Monophonic pitch estimate for valid uploads. Invalid uploads return `pitch_analysis: null`.
- `note_events`: Approximate monophonic note events derived from stable pitch regions. Invalid uploads return `note_events: null`.

## Practice Metrics

- `overall_score`: Average of `timing_activity_score` and `recording_quality_score`, rounded to the nearest integer.
- `timing_activity_score`: Activity/structure proxy based on onset density and whether tempo was detected. This is not real timing accuracy yet.
- `recording_quality_score`: Simple recording-quality score based on energy, zero crossing rate, duration, and detected onsets.
- `onset_density_per_second`: `onset_count / duration_seconds`.
- `energy_level`: `low`, `medium`, or `high`, based on RMS energy.
- `brightness_level`: `dark`, `balanced`, or `bright`, based on spectral centroid.
- `attack_activity`: `sparse`, `moderate`, or `busy`, based on onset density.
- `recommendations`: Deterministic suggestions from the measured features.

## Recording Quality

- `peak_amplitude`: Maximum absolute waveform amplitude.
- `clipped_sample_ratio`: Ratio of samples with absolute amplitude at or above `0.98`.
- `silence_ratio`: Estimated ratio of very quiet frames.
- `quality_level`: `poor`, `usable`, or `good`.
- `warnings`: Deterministic setup warnings such as very quiet audio, clipping, short clips, or mostly silent recordings.

## Segment Analysis

The backend splits audio into 5-second segments. Clips shorter than 5 seconds return one segment, and the final segment can be shorter than 5 seconds.

Each segment includes duration, onset count, onset density, mean RMS energy, mean spectral centroid, and the same `energy_level`, `brightness_level`, and `attack_activity` classifications used by `practice_metrics`.

## Coach Feedback

`coach_feedback` contains a summary, strengths, focus areas, and next steps. This feedback is deterministic and only uses measured audio values, recording quality, practice metrics, and segment analysis. If recording quality is poor, feedback focuses on recording setup first.

Pitch-related feedback is conservative. When confidence is reasonable, feedback may mention that a stable pitch was detected around an estimated note. It does not say the player hit the correct note or played a riff/song correctly.

## Pitch Analysis

`pitch_analysis` uses `librosa.pyin` to estimate fundamental frequency over time from the same mono audio used by the rest of the analysis.

- `enabled`: Whether pitch analysis ran.
- `method`: Current pitch method name.
- `estimated_note`: Dominant estimated note using scientific pitch notation, such as `A4`, or `null`.
- `estimated_frequency_hz`: Estimated frequency for the dominant note, or `null`.
- `confidence`: A `0` to `1` confidence proxy based on voiced frames and pitch consistency.
- `detected_notes`: Compact note-name segments with frequency, start/end times, and confidence.
- `pitch_warnings`: Deterministic warnings for low confidence, noisy audio, or non-monophonic input.

This is intended for clean monophonic single-note guitar recordings. It is a foundation for later note workflows, not exact note detection, chord detection, tab generation, or song/riff comparison.

## Note Events

`note_events` converts stable monophonic pitch regions into a compact sequence with note name, frequency, start time, end time, duration, and confidence.

- `note`: Nearest note name using scientific pitch notation, such as `A4`.
- `frequency_hz`: Median frequency for the event.
- `start_seconds`: Approximate event start time.
- `end_seconds`: Approximate event end time.
- `duration_seconds`: Approximate event duration.
- `confidence`: A `0` to `1` confidence proxy from the underlying pitch estimate.

This is not tab generation, note correctness scoring, chord detection, or riff/song comparison. If pitch confidence is low, `note_events` may be empty or incomplete.

## Frontend Practice History

The Practice Coach page stores compact successful analysis summaries in browser `localStorage` so recent scores can be compared over time. It keeps only summary fields such as filename, scores, quality level, attack activity, and one or more next steps.

Audio files, waveform data, and full backend responses are not saved. History stays in the current browser and is not sent to the backend.

## Current Limitations

- `.wav` is the only supported upload format.
- The endpoint returns audio features, deterministic practice metrics, recording-quality checks, segment analysis, measured feedback, basic monophonic pitch estimates, and approximate note events only.
- `timing_activity_score` is an activity proxy, not true rhythmic accuracy.
- Pitch estimates and note events are approximate and work best on clean single-note recordings.
- There is no note correctness scoring yet.
- There is no chord detection or polyphonic pitch detection.
- It does not know whether the player hit the right notes or played a specific riff correctly.
- It does not provide polished conversational coaching.
- It does not do pitch scoring, riff-to-tab, tab generation, or `.prst` export.
- It does not compare against reference songs or riffs.
- It does not call an LLM or agent.
- It does not have user accounts, a database, or cross-device practice history sync.

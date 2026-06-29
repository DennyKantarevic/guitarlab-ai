# Practice Coach Audio Analysis

This is the first backend foundation for the AI Guitar Practice Coach. It extracts deterministic audio features from an uploaded `.wav` file and returns basic rule-based practice metrics. It is not full coaching yet.

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
  }
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

## Practice Metrics

- `overall_score`: Average of `timing_activity_score` and `recording_quality_score`, rounded to the nearest integer.
- `timing_activity_score`: Activity/structure proxy based on onset density and whether tempo was detected. This is not real timing accuracy yet.
- `recording_quality_score`: Simple recording-quality score based on energy, zero crossing rate, duration, and detected onsets.
- `onset_density_per_second`: `onset_count / duration_seconds`.
- `energy_level`: `low`, `medium`, or `high`, based on RMS energy.
- `brightness_level`: `dark`, `balanced`, or `bright`, based on spectral centroid.
- `attack_activity`: `sparse`, `moderate`, or `busy`, based on onset density.
- `recommendations`: Deterministic suggestions from the measured features.

## Current Limitations

- `.wav` is the only supported upload format.
- The endpoint returns audio features and basic deterministic practice metrics only.
- `timing_activity_score` is an activity proxy, not true rhythmic accuracy.
- There is no pitch detection or note correctness scoring yet.
- It does not provide polished coaching feedback.
- It does not do pitch scoring, riff-to-tab, tab generation, or `.prst` export.
- It does not call an LLM or agent.

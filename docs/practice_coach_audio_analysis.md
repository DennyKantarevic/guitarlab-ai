# Practice Coach Audio Analysis

This is the first backend foundation for the AI Guitar Practice Coach. It extracts deterministic audio features from an uploaded `.wav` file. It is not full coaching yet.

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
  "errors": []
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

## Current Limitations

- `.wav` is the only supported upload format.
- The endpoint returns audio features only.
- It does not provide polished coaching feedback.
- It does not do pitch scoring, riff-to-tab, tab generation, or `.prst` export.
- It does not call an LLM or agent.

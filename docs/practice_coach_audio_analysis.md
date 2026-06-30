# Practice Coach Audio Analysis

This is the backend foundation for the AI Guitar Practice Coach. It extracts deterministic audio features from an uploaded `.wav` file and returns a clear score, coach-facing feedback, practical next steps, rule-based practice metrics, recording-quality checks, fixed-length segment analysis, a narrow monophonic pitch-analysis foundation, approximate monophonic note events, optional user-provided reference exercise comparison, and optional chord-tone coverage comparison. The frontend prioritizes the score and coaching feedback while keeping technical metrics in a secondary details section. It can store compact recent score summaries in browser `localStorage`, but the backend does not persist practice history. It is not full coaching yet.

No LLM calls or agents are used.

## Endpoint

`POST /practice/analyze-audio`

## Request Format

Use `multipart/form-data` with one required file field and optional practice context fields:

- `audio_file`: `.wav` file
- `practice_focus`: optional practice goal. Supported values are `general`, `note_clarity`, `timing`, `speed_control`, `lead_phrase`, `tone_recording`. Missing, empty, or invalid values default to `general`.
- `practice_description`: optional free-text note about what the user is practicing. The backend trims whitespace and caps this at 300 characters.
- `expected_notes`: optional user-provided reference exercise, such as `A4 B4 C5 D5`. Spaces, commas, and new lines are accepted as separators.
- `expected_tab`: optional user-provided six-line single-note guitar tab. This is converted into expected note names before reference comparison.
- `expected_chords`: optional user-provided chord progression, such as `G C D Em`. Spaces, commas, and new lines are accepted as separators.

`expected_notes` supports scientific pitch notation with sharps and a required octave number: `C`, `C#`, `D`, `D#`, `E`, `F`, `F#`, `G`, `G#`, `A`, `A#`, `B`, followed by an octave. Examples: `A4`, `C#5`, `E3`. Flats such as `Bb4`, chords, rhythm values, and durations are not supported.

`expected_tab` supports basic six-line standard-tuning guitar tab only. Lines should be ordered `e|`, `B|`, `G|`, `D|`, `A|`, `E|`. Frets `0` through `24` are supported, including multi-digit frets such as `10` and `12`. The parser is single-note only for now and does not support chords, strumming patterns, bends, slides, hammer-ons, pull-offs, mutes, alternate tunings, capo, rhythm notation, song lookup, copyrighted tab lookup, or tab generation.

`expected_chords` supports simple sharp-name chord symbols: major triads (`G`), minor triads (`Em`), dominant sevenths (`G7`), major sevenths (`Cmaj7`), minor sevenths (`Am7`), suspended chords (`Dsus2`, `Dsus4`), and power chords (`E5`). Flats such as `Bb`, slash chords, add chords, extended chords, diminished/augmented chords, chord voicings, fret positions, strumming patterns, rhythm notation, capo, alternate tuning, song lookup, and copyrighted chord/tab lookup are not supported.

Reference input priority is: `expected_notes`, then `expected_tab`, then `expected_chords`. Lower-priority inputs are ignored with a warning when a higher-priority reference input is present.

Example:

```bash
curl -X POST http://127.0.0.1:8000/practice/analyze-audio \
  -F "audio_file=@practice.wav" \
  -F "practice_focus=timing" \
  -F "practice_description=Working on eighth-note alternate picking" \
  -F "expected_notes=A4 B4 C5 D5"
```

Tab example:

```bash
curl -X POST http://127.0.0.1:8000/practice/analyze-audio \
  -F "audio_file=@practice.wav" \
  -F "expected_tab=e|----------------|
B|----------------|
G|----------------|
D|----------------|
A|-----0-2-3------|
E|-0-3------------|"
```

Chord example:

```bash
curl -X POST http://127.0.0.1:8000/practice/analyze-audio \
  -F "audio_file=@practice.wav" \
  -F "expected_chords=G C D Em"
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
  "practice_context": {
    "practice_focus": "timing",
    "practice_description": "Working on eighth-note alternate picking"
  },
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
    "headline": "This take gives you a practical baseline to improve from.",
    "summary": "I analyzed 1.00 seconds of audio. The recording is usable for basic feedback, the note starts are coming through at a manageable pace, and the tone is on the darker side.",
    "score_explanation": "Your overall score is 82. Treat it as a snapshot of recording quality and playing activity, not a grade for note correctness or true timing accuracy. This take is weighted by usable recording quality and moderate attack activity.",
    "what_went_well": [
      "The recording is usable for basic feedback, even though the setup could still be cleaner.",
      "The note attacks are coming through consistently without feeling overcrowded."
    ],
    "work_on": [
      "The clip is short, so record a longer phrase for more useful feedback."
    ],
    "next_practice_steps": [
      "Record another take at the same settings and compare the measured scores."
    ],
    "coach_notes": [
      "Approximate pitch tracking found a stable area around A4, but this is not note correctness scoring."
    ],
    "strengths": [
      "The recording is usable for basic feedback, even though the setup could still be cleaner.",
      "The note attacks are coming through consistently without feeling overcrowded."
    ],
    "focus_areas": [
      "The clip is short, so record a longer phrase for more useful feedback."
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
  ],
  "reference_exercise": {
    "expected_notes_raw": "A4 B4 C5 D5",
    "expected_notes": ["A4", "B4", "C5", "D5"],
    "expected_tab_raw": null,
    "expected_chords_raw": null,
    "expected_chords": [],
    "source": "notes",
    "valid": true,
    "warnings": []
  },
  "reference_comparison": {
    "enabled": true,
    "valid": true,
    "matched_count": 1,
    "missed_count": 3,
    "extra_count": 0,
    "expected_count": 4,
    "detected_count": 1,
    "match_ratio": 0.25,
    "summary": "Compared with your expected exercise, the coach found 1 of 4 notes in order. Some expected notes were not detected clearly; try recording slower with cleaner separation.",
    "matches": [
      {
        "expected_note": "A4",
        "detected_note": "A4",
        "expected_index": 0,
        "detected_index": 0,
        "confidence": 0.82
      }
    ],
    "misses": [
      {
        "expected_note": "B4",
        "expected_index": 1
      }
    ],
    "extras": [],
    "warnings": []
  },
  "chord_comparison": {
    "enabled": false,
    "valid": true,
    "expected_count": 0,
    "detected_note_count": 0,
    "matched_chord_count": 0,
    "partial_chord_count": 0,
    "missed_chord_count": 0,
    "summary": "No chord exercise was provided.",
    "chords": [],
    "warnings": []
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
- `practice_context`: Normalized practice context for valid uploads. Invalid uploads return `practice_context: null`.
- `practice_metrics`: Basic deterministic scoring metrics for valid uploads. Invalid uploads return `practice_metrics: null`.
- `recording_quality`: Recording setup checks for valid uploads. Invalid uploads return `recording_quality: null`.
- `segment_analysis`: Fixed-length 5-second segment summaries for valid uploads. Invalid uploads return `segment_analysis: null`.
- `coach_feedback`: Deterministic coach-facing feedback for valid uploads. Invalid uploads return `coach_feedback: null`.
- `pitch_analysis`: Monophonic pitch estimate for valid uploads. Invalid uploads return `pitch_analysis: null`.
- `note_events`: Approximate monophonic note events derived from stable pitch regions. Invalid uploads return `note_events: null`.
- `reference_exercise`: Parsed user-provided expected note sequence for valid uploads. Invalid uploads return `reference_exercise: null`.
- `reference_comparison`: Approximate comparison between `expected_notes` and detected `note_events` for valid uploads. Invalid uploads return `reference_comparison: null`.

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

`coach_feedback` is the main user-facing output. It translates measured values into practical language and avoids leading with raw metrics.

- `headline`: One short coaching takeaway.
- `summary`: A readable explanation of what was analyzed.
- `score_explanation`: Explains what the score means and clarifies that it is not note correctness or true timing accuracy.
- `what_went_well`: Two to four useful positives, written in musician-friendly language.
- `work_on`: Two to four focus areas.
- `next_practice_steps`: Concrete practice steps.
- `coach_notes`: Conservative notes about approximate pitch or note-event analysis.
- `strengths`, `focus_areas`, and `next_steps`: Compatibility aliases for older clients.

This feedback is deterministic and only uses measured audio values, recording quality, practice metrics, segment analysis, pitch analysis, note events, and the optional practice context. If recording quality is poor, feedback focuses on recording setup first.

`practice_focus` changes the emphasis of the feedback, not the underlying scoring. For example, `timing` adds metronome and timing-proxy guidance, `note_clarity` emphasizes clean note starts and separation, `speed_control` emphasizes control before speed, `lead_phrase` frames pitch and note events as approximate, and `tone_recording` prioritizes recording quality.

Pitch-related feedback is conservative. When confidence is reasonable, feedback may mention that approximate pitch tracking found a stable area around an estimated note. It does not say the player hit the correct note or played a riff/song correctly.

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

## Reference Exercise Comparison

If `expected_notes` is provided, the backend parses it as a simple user-provided monophonic exercise and compares it against detected `note_events` in order. If `expected_notes` is missing and `expected_tab` is provided, the backend converts the tab into expected note names first, then uses the same comparison. If notes and tab are both missing and `expected_chords` is provided, the backend parses chord names and uses `chord_comparison` instead of note-by-note reference comparison.

`reference_exercise` includes:

- `expected_notes_raw`: Trimmed raw input, or `null` when no exercise was provided.
- `expected_notes`: Supported notes parsed from `expected_notes` or converted from `expected_tab`, capped at the first 50 supported notes.
- `expected_tab_raw`: Trimmed raw tab input, or `null` when no tab was provided.
- `expected_chords_raw`: Trimmed raw chord input, or `null` when no chord progression was provided.
- `expected_chords`: Supported chord symbols with root, quality, and pitch-class tones.
- `source`: `notes`, `tab`, `chords`, or `none`.
- `valid`: `false` when unsupported note tokens, tab syntax, or chord symbols were included.
- `warnings`: Clear parse warnings for unsupported input such as flats, chords in tab, tab techniques, unsupported chord symbols, rhythm values, or durations.

`reference_comparison` includes:

- `enabled`: `false` when no reference exercise was provided.
- `valid`: `false` when the provided reference exercise had unsupported note tokens.
- `matched_count`: Number of expected notes found in order.
- `missed_count`: Number of expected notes not clearly detected.
- `extra_count`: Number of detected note events that did not align with the expected sequence.
- `expected_count`: Number of supported expected notes compared.
- `detected_count`: Number of detected note events compared, capped at 100.
- `match_ratio`: `matched_count / expected_count`, or `null` when no supported expected notes were compared.
- `summary`: Short user-facing explanation.
- `matches`, `misses`, `extras`: Compact per-note comparison details.
- `warnings`: Parse or comparison warnings.

This comparison checks exact detected note names only, including octave. It does not compare rhythm, duration, timing correctness, song correctness, strumming accuracy, or tab accuracy. It is intended for simple user-provided exercises like `A4 B4 C5 D5` or a short single-note tab.

## Chord Comparison

If `expected_chords` is provided and no higher-priority reference input is present, the backend parses each supported chord into pitch-class tones and compares those tones against detected `note_events`.

`chord_comparison` includes:

- `enabled`: `true` only when `expected_chords` is the active reference source.
- `valid`: `false` when unsupported chord symbols were included.
- `expected_count`: Number of supported expected chords compared.
- `detected_note_count`: Number of unique detected pitch classes available for comparison.
- `matched_chord_count`: Number of chords where at least two tones were detected, or all tones for power chords.
- `partial_chord_count`: Number of chords where one expected tone was detected.
- `missed_chord_count`: Number of chords where no expected tones were detected.
- `summary`: Short user-facing explanation.
- `chords`: Per-chord tone coverage with expected tones, detected tones, matched tones, missing tones, and `matched`, `partial`, or `missed` status.
- `warnings`: Parse or comparison warnings.

This is approximate chord-tone coverage only. It is not full polyphonic chord recognition, strumming accuracy, rhythm checking, song correctness, or a copyrighted chord lookup.

## Frontend Practice History

The Practice Coach page stores compact successful analysis summaries in browser `localStorage` so recent scores can be compared over time. It keeps only summary fields such as filename, scores, quality level, attack activity, and one or more next steps.

Audio files, waveform data, and full backend responses are not saved. History stays in the current browser and is not sent to the backend.

## Current Limitations

- `.wav` is the only supported upload format.
- The endpoint returns audio features, deterministic practice metrics, recording-quality checks, segment analysis, coach-facing feedback, basic monophonic pitch estimates, approximate note events, optional user-provided reference exercise comparison, and optional chord-tone coverage comparison only.
- `timing_activity_score` is an activity proxy, not true rhythmic accuracy.
- Pitch estimates and note events are approximate and work best on clean single-note recordings.
- Reference comparison uses a user-provided simple note sequence or short single-note tab only.
- Reference comparison does not perform song recognition or copyrighted tab lookup.
- Reference comparison does not score rhythm correctness yet.
- Tab parsing is standard tuning only and does not support chords, strumming patterns, bends, slides, mutes, alternate tunings, or capo.
- Chord comparison checks approximate chord-tone coverage only.
- Chord comparison does not perform full polyphonic chord recognition, strumming checking, rhythm checking, song lookup, or copyrighted chord/tab lookup.
- Chord parsing does not support flats, slash chords, add chords, extended chords, diminished/augmented chords, voicings, alternate tunings, capo, or fret positions.
- There is no note correctness scoring yet.
- There is no chord detection or polyphonic pitch detection.
- It does not know whether the player hit the right notes or played a specific riff correctly.
- It does not provide LLM/agent-based conversational coaching.
- It does not do pitch scoring, riff-to-tab, tab generation, or `.prst` export.
- It does not compare against reference songs or riffs.
- It does not call an LLM or agent.
- It does not have user accounts, a database, or cross-device practice history sync.

import asyncio
import io
import json
import math
import wave

import httpx

from app.main import app
from app.services.practice_chord_parser import (
    chord_symbol_to_tones,
    compare_expected_chords,
    parse_expected_chords,
)
from app.services.practice_feedback import build_coach_feedback
from app.services.practice_tab_parser import parse_expected_tab


REQUIRED_FIELDS = {
    "filename",
    "duration_seconds",
    "sample_rate",
    "tempo_bpm",
    "onset_count",
    "rms_energy_mean",
    "spectral_centroid_mean",
    "zero_crossing_rate_mean",
    "analysis_warnings",
    "valid",
    "errors",
    "practice_metrics",
    "recording_quality",
    "segment_analysis",
    "coach_feedback",
    "pitch_analysis",
    "note_events",
    "practice_context",
    "reference_exercise",
    "reference_comparison",
    "chord_comparison",
    "strumming_pattern",
    "strumming_comparison",
}

PRACTICE_METRIC_FIELDS = {
    "overall_score",
    "timing_activity_score",
    "recording_quality_score",
    "onset_density_per_second",
    "energy_level",
    "brightness_level",
    "attack_activity",
    "recommendations",
}

RECORDING_QUALITY_FIELDS = {
    "peak_amplitude",
    "clipped_sample_ratio",
    "silence_ratio",
    "quality_level",
    "warnings",
}

SEGMENT_FIELDS = {
    "segment_index",
    "start_seconds",
    "end_seconds",
    "duration_seconds",
    "onset_count",
    "onset_density_per_second",
    "rms_energy_mean",
    "spectral_centroid_mean",
    "energy_level",
    "brightness_level",
    "attack_activity",
}

COACH_FEEDBACK_FIELDS = {
    "headline",
    "summary",
    "score_explanation",
    "what_went_well",
    "work_on",
    "next_practice_steps",
    "coach_notes",
    "strengths",
    "focus_areas",
    "next_steps",
}

PITCH_ANALYSIS_FIELDS = {
    "enabled",
    "method",
    "estimated_note",
    "estimated_frequency_hz",
    "confidence",
    "detected_notes",
    "pitch_warnings",
}

DETECTED_NOTE_FIELDS = {
    "note",
    "frequency_hz",
    "start_seconds",
    "end_seconds",
    "confidence",
}

NOTE_EVENT_FIELDS = {
    "note",
    "frequency_hz",
    "start_seconds",
    "end_seconds",
    "duration_seconds",
    "confidence",
}

PRACTICE_CONTEXT_FIELDS = {
    "practice_focus",
    "practice_description",
}

REFERENCE_EXERCISE_FIELDS = {
    "expected_notes_raw",
    "expected_notes",
    "expected_tab_raw",
    "expected_chords_raw",
    "expected_chords",
    "source",
    "valid",
    "warnings",
}

REFERENCE_COMPARISON_FIELDS = {
    "enabled",
    "valid",
    "matched_count",
    "missed_count",
    "extra_count",
    "expected_count",
    "detected_count",
    "match_ratio",
    "summary",
    "matches",
    "misses",
    "extras",
    "warnings",
}

REFERENCE_MATCH_FIELDS = {
    "expected_note",
    "detected_note",
    "expected_index",
    "detected_index",
    "confidence",
}

REFERENCE_MISS_FIELDS = {
    "expected_note",
    "expected_index",
}

REFERENCE_EXTRA_FIELDS = {
    "detected_note",
    "detected_index",
    "confidence",
}

EXPECTED_CHORD_FIELDS = {
    "symbol",
    "root",
    "quality",
    "tones",
}

CHORD_COMPARISON_FIELDS = {
    "enabled",
    "valid",
    "expected_count",
    "detected_note_count",
    "matched_chord_count",
    "partial_chord_count",
    "missed_chord_count",
    "summary",
    "chords",
    "warnings",
}

CHORD_COMPARISON_ITEM_FIELDS = {
    "symbol",
    "expected_tones",
    "detected_tones",
    "matched_tones",
    "missing_tones",
    "status",
}

STRUMMING_PATTERN_FIELDS = {
    "expected_pattern_raw",
    "strokes",
    "valid",
    "warnings",
}

STRUMMING_COMPARISON_FIELDS = {
    "enabled",
    "valid",
    "expected_stroke_count",
    "detected_attack_count",
    "count_difference",
    "attack_match_level",
    "spacing_level",
    "summary",
    "warnings",
}


def post_audio(files, data=None):
    async def send_request():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            return await client.post(
                "/practice/analyze-audio",
                files=files,
                data=data,
            )

    return asyncio.run(send_request())


def make_sine_wave_bytes(
    duration_seconds=1.0,
    sample_rate=22050,
    frequency=440.0,
):
    sample_count = int(duration_seconds * sample_rate)
    buffer = io.BytesIO()

    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        frames = bytearray()
        for sample_index in range(sample_count):
            sample = math.sin(2 * math.pi * frequency * sample_index / sample_rate)
            frames.extend(int(sample * 32767 * 0.35).to_bytes(2, "little", signed=True))
        wav_file.writeframes(bytes(frames))

    buffer.seek(0)
    return buffer.read()


def make_pulsed_sine_wave_bytes(
    duration_seconds=6.0,
    sample_rate=22050,
    frequency=440.0,
):
    sample_count = int(duration_seconds * sample_rate)
    buffer = io.BytesIO()

    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        frames = bytearray()
        for sample_index in range(sample_count):
            time_seconds = sample_index / sample_rate
            pulse_position = time_seconds % 0.5
            envelope = max(0.0, 1.0 - (pulse_position / 0.12))
            sample = (
                math.sin(2 * math.pi * frequency * time_seconds)
                * envelope
                * 0.45
            )
            frames.extend(int(sample * 32767).to_bytes(2, "little", signed=True))
        wav_file.writeframes(bytes(frames))

    buffer.seek(0)
    return buffer.read()


def make_silence_wave_bytes(duration_seconds=1.0, sample_rate=22050):
    sample_count = int(duration_seconds * sample_rate)
    buffer = io.BytesIO()

    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(b"\x00\x00" * sample_count)

    buffer.seek(0)
    return buffer.read()


def test_valid_generated_sine_wave_returns_audio_features():
    response = post_audio(
        {
            "audio_file": (
                "practice.wav",
                make_sine_wave_bytes(),
                "audio/wav",
            )
        }
    )

    assert response.status_code == 200
    analysis = response.json()
    assert set(analysis) == REQUIRED_FIELDS
    assert analysis["filename"] == "practice.wav"
    assert analysis["valid"] is True
    assert analysis["errors"] == []
    assert analysis["duration_seconds"] > 0
    assert analysis["sample_rate"] == 22050
    assert analysis["tempo_bpm"] is None or isinstance(
        analysis["tempo_bpm"],
        (int, float),
    )
    assert isinstance(analysis["onset_count"], int)
    assert isinstance(analysis["rms_energy_mean"], (int, float))
    assert isinstance(analysis["spectral_centroid_mean"], (int, float))
    assert isinstance(analysis["zero_crossing_rate_mean"], (int, float))
    assert isinstance(analysis["analysis_warnings"], list)

    metrics = analysis["practice_metrics"]
    assert set(metrics) == PRACTICE_METRIC_FIELDS
    assert math.isclose(
        metrics["onset_density_per_second"],
        analysis["onset_count"] / analysis["duration_seconds"],
        rel_tol=1e-6,
    )
    assert 0 <= metrics["overall_score"] <= 100
    assert 0 <= metrics["recording_quality_score"] <= 100
    assert 0 <= metrics["timing_activity_score"] <= 100
    assert metrics["energy_level"] in {"low", "medium", "high"}
    assert metrics["brightness_level"] in {"dark", "balanced", "bright"}
    assert metrics["attack_activity"] in {"sparse", "moderate", "busy"}
    assert isinstance(metrics["recommendations"], list)

    quality = analysis["recording_quality"]
    assert set(quality) == RECORDING_QUALITY_FIELDS
    assert isinstance(quality["peak_amplitude"], (int, float))
    assert isinstance(quality["clipped_sample_ratio"], (int, float))
    assert isinstance(quality["silence_ratio"], (int, float))
    assert quality["quality_level"] in {"poor", "usable", "good"}
    assert isinstance(quality["warnings"], list)

    segments = analysis["segment_analysis"]
    assert len(segments) == 1
    assert set(segments[0]) == SEGMENT_FIELDS
    assert segments[0]["segment_index"] == 0
    assert segments[0]["energy_level"] in {"low", "medium", "high"}
    assert segments[0]["brightness_level"] in {"dark", "balanced", "bright"}
    assert segments[0]["attack_activity"] in {"sparse", "moderate", "busy"}

    feedback = analysis["coach_feedback"]
    assert set(feedback) == COACH_FEEDBACK_FIELDS
    assert isinstance(feedback["headline"], str)
    assert isinstance(feedback["summary"], str)
    assert isinstance(feedback["score_explanation"], str)
    assert isinstance(feedback["what_went_well"], list)
    assert isinstance(feedback["work_on"], list)
    assert isinstance(feedback["next_practice_steps"], list)
    assert isinstance(feedback["coach_notes"], list)
    assert isinstance(feedback["strengths"], list)
    assert isinstance(feedback["focus_areas"], list)
    assert isinstance(feedback["next_steps"], list)

    practice_context = analysis["practice_context"]
    assert set(practice_context) == PRACTICE_CONTEXT_FIELDS
    assert practice_context == {
        "practice_focus": "general",
        "practice_description": None,
    }

    reference_exercise = analysis["reference_exercise"]
    assert set(reference_exercise) == REFERENCE_EXERCISE_FIELDS
    assert reference_exercise == {
        "expected_notes_raw": None,
        "expected_notes": [],
        "expected_tab_raw": None,
        "expected_chords_raw": None,
        "expected_chords": [],
        "source": "none",
        "valid": True,
        "warnings": [],
    }

    reference_comparison = analysis["reference_comparison"]
    assert set(reference_comparison) == REFERENCE_COMPARISON_FIELDS
    assert reference_comparison["enabled"] is False
    assert reference_comparison["valid"] is True
    assert reference_comparison["matched_count"] == 0
    assert reference_comparison["expected_count"] == 0
    assert reference_comparison["summary"] == "No reference exercise was provided."

    chord_comparison = analysis["chord_comparison"]
    assert set(chord_comparison) == CHORD_COMPARISON_FIELDS
    assert chord_comparison["enabled"] is False
    assert chord_comparison["valid"] is True
    assert chord_comparison["expected_count"] == 0
    assert chord_comparison["summary"] == "No chord exercise was provided."

    strumming_pattern = analysis["strumming_pattern"]
    assert set(strumming_pattern) == STRUMMING_PATTERN_FIELDS
    assert strumming_pattern == {
        "expected_pattern_raw": None,
        "strokes": [],
        "valid": True,
        "warnings": [],
    }

    strumming_comparison = analysis["strumming_comparison"]
    assert set(strumming_comparison) == STRUMMING_COMPARISON_FIELDS
    assert strumming_comparison["enabled"] is False
    assert strumming_comparison["valid"] is True
    assert strumming_comparison["expected_stroke_count"] == 0
    assert strumming_comparison["detected_attack_count"] == 0
    assert strumming_comparison["count_difference"] is None
    assert strumming_comparison["attack_match_level"] == "unavailable"
    assert strumming_comparison["spacing_level"] == "unavailable"
    assert strumming_comparison["summary"] == "No strumming pattern was provided."

    pitch = analysis["pitch_analysis"]
    assert set(pitch) == PITCH_ANALYSIS_FIELDS
    assert pitch["enabled"] is True
    assert isinstance(pitch["method"], str)
    assert pitch["estimated_note"] == "A4"
    assert math.isclose(pitch["estimated_frequency_hz"], 440.0, abs_tol=10.0)
    assert 0 <= pitch["confidence"] <= 1
    assert isinstance(pitch["detected_notes"], list)
    assert isinstance(pitch["pitch_warnings"], list)
    if pitch["detected_notes"]:
        assert set(pitch["detected_notes"][0]) == DETECTED_NOTE_FIELDS

    note_events = analysis["note_events"]
    assert isinstance(note_events, list)
    assert note_events
    assert set(note_events[0]) == NOTE_EVENT_FIELDS
    assert note_events[0]["note"] == "A4"
    assert 0 <= note_events[0]["confidence"] <= 1
    assert 0 <= note_events[0]["start_seconds"] <= analysis["duration_seconds"]
    assert 0 <= note_events[0]["end_seconds"] <= analysis["duration_seconds"]
    assert note_events[0]["duration_seconds"] > 0


def test_unsupported_extension_returns_clear_error():
    response = post_audio(
        {
            "audio_file": (
                "practice.mp3",
                b"not-a-wav",
                "audio/mpeg",
            )
        }
    )

    assert response.status_code == 200
    analysis = response.json()
    assert analysis["valid"] is False
    assert analysis["errors"] == ["Unsupported audio format. Only .wav files are supported."]
    assert analysis["practice_metrics"] is None
    assert analysis["recording_quality"] is None
    assert analysis["segment_analysis"] is None
    assert analysis["coach_feedback"] is None
    assert analysis["pitch_analysis"] is None
    assert analysis["note_events"] is None
    assert analysis["practice_context"] is None
    assert analysis["reference_exercise"] is None
    assert analysis["reference_comparison"] is None
    assert analysis["strumming_pattern"] is None
    assert analysis["strumming_comparison"] is None


def test_empty_file_returns_clear_error():
    response = post_audio(
        {
            "audio_file": (
                "empty.wav",
                b"",
                "audio/wav",
            )
        }
    )

    assert response.status_code == 200
    analysis = response.json()
    assert analysis["valid"] is False
    assert analysis["errors"] == ["Empty audio file."]
    assert analysis["practice_metrics"] is None
    assert analysis["recording_quality"] is None
    assert analysis["segment_analysis"] is None
    assert analysis["coach_feedback"] is None
    assert analysis["pitch_analysis"] is None
    assert analysis["note_events"] is None
    assert analysis["practice_context"] is None
    assert analysis["reference_exercise"] is None
    assert analysis["reference_comparison"] is None
    assert analysis["strumming_pattern"] is None
    assert analysis["strumming_comparison"] is None


def test_missing_file_returns_clear_error():
    response = post_audio({})

    assert response.status_code == 200
    analysis = response.json()
    assert analysis["valid"] is False
    assert analysis["errors"] == ["Missing audio file."]
    assert analysis["practice_metrics"] is None
    assert analysis["recording_quality"] is None
    assert analysis["segment_analysis"] is None
    assert analysis["coach_feedback"] is None
    assert analysis["pitch_analysis"] is None
    assert analysis["note_events"] is None
    assert analysis["practice_context"] is None
    assert analysis["reference_exercise"] is None
    assert analysis["reference_comparison"] is None
    assert analysis["strumming_pattern"] is None
    assert analysis["strumming_comparison"] is None


def test_invalid_wav_returns_clear_decode_error():
    response = post_audio(
        {
            "audio_file": (
                "broken.wav",
                b"not-really-a-wav",
                "audio/wav",
            )
        }
    )

    assert response.status_code == 200
    analysis = response.json()
    assert analysis["valid"] is False
    assert analysis["errors"] == ["Could not decode audio file."]
    assert analysis["practice_metrics"] is None
    assert analysis["recording_quality"] is None
    assert analysis["segment_analysis"] is None
    assert analysis["coach_feedback"] is None
    assert analysis["pitch_analysis"] is None
    assert analysis["note_events"] is None
    assert analysis["practice_context"] is None
    assert analysis["reference_exercise"] is None
    assert analysis["reference_comparison"] is None
    assert analysis["strumming_pattern"] is None
    assert analysis["strumming_comparison"] is None


def test_endpoint_response_contains_no_llm_or_agent_references():
    response = post_audio(
        {
            "audio_file": (
                "practice.wav",
                make_sine_wave_bytes(),
                "audio/wav",
            )
        }
    )

    assert response.status_code == 200
    serialized = json.dumps(response.json()).lower()
    assert "llm" not in serialized
    assert "agent" not in serialized
    assert "openai" not in serialized


def test_coach_feedback_uses_musician_friendly_fields():
    response = post_audio(
        {
            "audio_file": (
                "practice.wav",
                make_sine_wave_bytes(duration_seconds=2.0),
                "audio/wav",
            )
        }
    )

    assert response.status_code == 200
    feedback = response.json()["coach_feedback"]

    assert feedback["headline"]
    assert "score" in feedback["score_explanation"].lower()
    assert feedback["what_went_well"]
    assert feedback["work_on"]
    assert feedback["next_practice_steps"]
    assert feedback["coach_notes"]
    assert any("practice" in step.lower() for step in feedback["next_practice_steps"])


def test_low_recording_quality_produces_setup_focused_feedback():
    response = post_audio(
        {
            "audio_file": (
                "silence.wav",
                make_silence_wave_bytes(duration_seconds=1.0),
                "audio/wav",
            )
        }
    )

    assert response.status_code == 200
    feedback_text = serialize_feedback(response.json()["coach_feedback"])

    assert "recording setup" in feedback_text
    assert "input" in feedback_text or "source" in feedback_text


def test_busy_attack_activity_produces_slower_practice_advice():
    feedback = build_coach_feedback(
        analysis={"duration_seconds": 3.0},
        practice_metrics={
            "overall_score": 68,
            "energy_level": "medium",
            "brightness_level": "balanced",
            "attack_activity": "busy",
        },
        recording_quality={"quality_level": "good", "warnings": []},
        segment_analysis=[],
    )

    feedback_text = serialize_feedback(feedback)

    assert "slower" in feedback_text
    assert "metronome" in feedback_text


def test_feedback_does_not_claim_note_riff_or_song_correctness():
    response = post_audio(
        {
            "audio_file": (
                "practice.wav",
                make_sine_wave_bytes(duration_seconds=2.0),
                "audio/wav",
            )
        }
    )

    assert response.status_code == 200
    feedback_text = serialize_feedback(response.json()["coach_feedback"])

    forbidden_claims = [
        "correct note",
        "wrong note",
        "riff is correct",
        "matches the song",
        "played nirvana",
        "rhythmically accurate",
        "rhythmically inaccurate",
    ]
    for claim in forbidden_claims:
        assert claim not in feedback_text


def test_endpoint_accepts_practice_focus_and_description():
    response = post_audio(
        {
            "audio_file": (
                "practice.wav",
                make_sine_wave_bytes(duration_seconds=2.0),
                "audio/wav",
            )
        },
        data={
            "practice_focus": "note_clarity",
            "practice_description": "  Alternate-picked single-note exercise  ",
        },
    )

    assert response.status_code == 200
    analysis = response.json()
    assert analysis["valid"] is True
    assert analysis["practice_context"] == {
        "practice_focus": "note_clarity",
        "practice_description": "Alternate-picked single-note exercise",
    }


def test_missing_empty_or_invalid_practice_focus_defaults_to_general():
    missing_focus = post_audio(
        {
            "audio_file": (
                "missing-focus.wav",
                make_sine_wave_bytes(duration_seconds=1.0),
                "audio/wav",
            )
        }
    ).json()
    empty_focus = post_audio(
        {
            "audio_file": (
                "empty-focus.wav",
                make_sine_wave_bytes(duration_seconds=1.0),
                "audio/wav",
            )
        },
        data={"practice_focus": "   "},
    ).json()
    invalid_focus = post_audio(
        {
            "audio_file": (
                "invalid-focus.wav",
                make_sine_wave_bytes(duration_seconds=1.0),
                "audio/wav",
            )
        },
        data={"practice_focus": "reference_song_comparison"},
    ).json()

    assert missing_focus["practice_context"]["practice_focus"] == "general"
    assert empty_focus["practice_context"]["practice_focus"] == "general"
    assert invalid_focus["practice_context"]["practice_focus"] == "general"


def test_long_practice_description_is_trimmed_and_capped():
    long_description = f"  {'a' * 350}  "
    response = post_audio(
        {
            "audio_file": (
                "long-description.wav",
                make_sine_wave_bytes(duration_seconds=1.0),
                "audio/wav",
            )
        },
        data={
            "practice_focus": "general",
            "practice_description": long_description,
        },
    )

    assert response.status_code == 200
    description = response.json()["practice_context"]["practice_description"]
    assert description == "a" * 300


def test_note_clarity_focus_changes_coach_feedback():
    response = post_audio(
        {
            "audio_file": (
                "clarity.wav",
                make_sine_wave_bytes(duration_seconds=2.0),
                "audio/wav",
            )
        },
        data={"practice_focus": "note_clarity"},
    )

    feedback_text = serialize_feedback(response.json()["coach_feedback"])
    assert "note clarity" in feedback_text
    assert "each note start cleanly" in feedback_text
    assert "clear separation" in feedback_text


def test_timing_focus_includes_metronome_and_proxy_advice():
    response = post_audio(
        {
            "audio_file": (
                "timing.wav",
                make_sine_wave_bytes(duration_seconds=2.0),
                "audio/wav",
            )
        },
        data={"practice_focus": "timing"},
    )

    feedback_text = serialize_feedback(response.json()["coach_feedback"])
    assert "timing" in feedback_text
    assert "metronome" in feedback_text
    assert "activity read" in feedback_text
    assert "true rhythm grade" in feedback_text


def test_speed_control_focus_includes_slow_down_and_control_advice():
    response = post_audio(
        {
            "audio_file": (
                "speed-control.wav",
                make_sine_wave_bytes(duration_seconds=2.0),
                "audio/wav",
            )
        },
        data={"practice_focus": "speed_control"},
    )

    feedback_text = serialize_feedback(response.json()["coach_feedback"])
    assert "speed control" in feedback_text
    assert "control" in feedback_text
    assert "slower" in feedback_text


def test_lead_phrase_focus_mentions_approximate_pitch_and_note_event_limits():
    response = post_audio(
        {
            "audio_file": (
                "lead-phrase.wav",
                make_sine_wave_bytes(duration_seconds=2.0),
                "audio/wav",
            )
        },
        data={"practice_focus": "lead_phrase"},
    )

    feedback_text = serialize_feedback(response.json()["coach_feedback"])
    assert "lead phrase" in feedback_text
    assert "approximate" in feedback_text
    assert "not a correctness check" in feedback_text
    assert "single-note line" in feedback_text


def test_tone_recording_focus_prioritizes_recording_quality():
    response = post_audio(
        {
            "audio_file": (
                "tone-recording.wav",
                make_sine_wave_bytes(duration_seconds=2.0),
                "audio/wav",
            )
        },
        data={"practice_focus": "tone_recording"},
    )

    feedback_text = serialize_feedback(response.json()["coach_feedback"])
    assert "tone and recording quality" in feedback_text
    assert "strong, clean signal" in feedback_text
    assert "cleaner recording" in feedback_text


def test_practice_metrics_are_deterministic_for_same_generated_audio():
    audio_bytes = make_sine_wave_bytes()

    first_response = post_audio(
        {
            "audio_file": (
                "practice.wav",
                audio_bytes,
                "audio/wav",
            )
        }
    )
    second_response = post_audio(
        {
            "audio_file": (
                "practice.wav",
                audio_bytes,
                "audio/wav",
            )
        }
    )

    assert first_response.status_code == 200
    assert second_response.status_code == 200
    assert first_response.json()["practice_metrics"] == second_response.json()[
        "practice_metrics"
    ]
    assert first_response.json()["coach_feedback"] == second_response.json()[
        "coach_feedback"
    ]
    assert first_response.json()["pitch_analysis"] == second_response.json()[
        "pitch_analysis"
    ]
    assert first_response.json()["note_events"] == second_response.json()[
        "note_events"
    ]
    assert first_response.json()["reference_exercise"] == second_response.json()[
        "reference_exercise"
    ]
    assert first_response.json()["reference_comparison"] == second_response.json()[
        "reference_comparison"
    ]


def test_longer_generated_audio_returns_multiple_segments():
    response = post_audio(
        {
            "audio_file": (
                "long-practice.wav",
                make_pulsed_sine_wave_bytes(duration_seconds=11.0),
                "audio/wav",
            )
        }
    )

    assert response.status_code == 200
    analysis = response.json()
    assert analysis["valid"] is True
    assert len(analysis["segment_analysis"]) == 3
    assert analysis["segment_analysis"][0]["start_seconds"] == 0
    assert analysis["segment_analysis"][0]["end_seconds"] == 5
    assert analysis["segment_analysis"][1]["start_seconds"] == 5
    assert analysis["segment_analysis"][1]["end_seconds"] == 10
    assert analysis["segment_analysis"][2]["start_seconds"] == 10
    assert analysis["segment_analysis"][2]["duration_seconds"] > 0


def test_generated_sine_wave_around_440_returns_a4_pitch_analysis():
    response = post_audio(
        {
            "audio_file": (
                "a4.wav",
                make_sine_wave_bytes(duration_seconds=2.0, frequency=440.0),
                "audio/wav",
            )
        }
    )

    assert response.status_code == 200
    analysis = response.json()
    pitch = analysis["pitch_analysis"]

    assert analysis["valid"] is True
    assert pitch["estimated_note"] == "A4"
    assert math.isclose(pitch["estimated_frequency_hz"], 440.0, abs_tol=10.0)
    assert 0 <= pitch["confidence"] <= 1
    assert isinstance(pitch["detected_notes"], list)
    assert isinstance(pitch["pitch_warnings"], list)


def test_generated_sine_wave_around_440_returns_a4_note_events():
    response = post_audio(
        {
            "audio_file": (
                "a4.wav",
                make_sine_wave_bytes(duration_seconds=2.0, frequency=440.0),
                "audio/wav",
            )
        }
    )

    assert response.status_code == 200
    analysis = response.json()
    note_events = analysis["note_events"]

    assert analysis["valid"] is True
    assert isinstance(note_events, list)
    assert note_events
    first_event = note_events[0]
    assert set(first_event) == NOTE_EVENT_FIELDS
    assert first_event["note"] == "A4"
    assert math.isclose(first_event["frequency_hz"], 440.0, abs_tol=10.0)
    assert 0 <= first_event["start_seconds"] <= analysis["duration_seconds"]
    assert 0 <= first_event["end_seconds"] <= analysis["duration_seconds"]
    assert first_event["end_seconds"] > first_event["start_seconds"]
    assert math.isclose(
        first_event["duration_seconds"],
        first_event["end_seconds"] - first_event["start_seconds"],
        rel_tol=1e-6,
    )
    assert 0 <= first_event["confidence"] <= 1


def test_silent_audio_returns_low_confidence_pitch_analysis():
    response = post_audio(
        {
            "audio_file": (
                "silence.wav",
                make_silence_wave_bytes(duration_seconds=1.0),
                "audio/wav",
            )
        }
    )

    assert response.status_code == 200
    analysis = response.json()
    pitch = analysis["pitch_analysis"]

    assert analysis["valid"] is True
    assert pitch["enabled"] is True
    assert pitch["estimated_note"] is None
    assert pitch["estimated_frequency_hz"] is None
    assert pitch["confidence"] <= 0.25
    assert isinstance(pitch["detected_notes"], list)
    assert isinstance(pitch["pitch_warnings"], list)
    assert "No stable monophonic pitch was detected." in pitch["pitch_warnings"]
    assert analysis["note_events"] == []


def test_expected_tab_parses_valid_six_line_single_note_tab():
    parsed = parse_expected_tab(
        """
e|----------------|
B|----------------|
G|----------------|
D|----------------|
A|-----0-2-3------|
E|-0-3------------|
"""
    )

    assert parsed["valid"] is True
    assert parsed["expected_notes"] == ["E2", "G2", "A2", "B2", "C3"]
    assert parsed["warnings"] == []


def test_expected_tab_converts_each_open_standard_tuning_string():
    assert parse_expected_tab("e|0---|\nB|----|\nG|----|\nD|----|\nA|----|\nE|----|")[
        "expected_notes"
    ] == ["E4"]
    assert parse_expected_tab("e|----|\nB|0---|\nG|----|\nD|----|\nA|----|\nE|----|")[
        "expected_notes"
    ] == ["B3"]
    assert parse_expected_tab("e|----|\nB|----|\nG|0---|\nD|----|\nA|----|\nE|----|")[
        "expected_notes"
    ] == ["G3"]
    assert parse_expected_tab("e|----|\nB|----|\nG|----|\nD|0---|\nA|----|\nE|----|")[
        "expected_notes"
    ] == ["D3"]
    assert parse_expected_tab("e|----|\nB|----|\nG|----|\nD|----|\nA|0---|\nE|----|")[
        "expected_notes"
    ] == ["A2"]
    assert parse_expected_tab("e|----|\nB|----|\nG|----|\nD|----|\nA|----|\nE|0---|")[
        "expected_notes"
    ] == ["E2"]


def test_expected_tab_supports_multi_digit_frets():
    parsed = parse_expected_tab(
        """
e|-10-12-|
B|-------|
G|-------|
D|-------|
A|-------|
E|-------|
"""
    )

    assert parsed["valid"] is True
    assert parsed["expected_notes"] == ["D5", "E5"]


def test_expected_tab_preserves_left_to_right_order_across_strings():
    parsed = parse_expected_tab(
        """
e|--------|
B|------1-|
G|----0---|
D|--0-----|
A|0-------|
E|--------|
"""
    )

    assert parsed["expected_notes"] == ["A2", "D3", "G3", "C4"]


def test_expected_tab_returns_warning_for_chord_like_columns():
    parsed = parse_expected_tab(
        """
e|0---|
B|0---|
G|----|
D|----|
A|----|
E|----|
"""
    )

    assert parsed["valid"] is False
    assert any("Chords are not supported" in warning for warning in parsed["warnings"])


def test_expected_chords_parse_space_separated_progression():
    parsed = parse_expected_chords("G C D Em")

    assert parsed["valid"] is True
    assert [chord["symbol"] for chord in parsed["expected_chords"]] == [
        "G",
        "C",
        "D",
        "Em",
    ]
    assert parsed["warnings"] == []


def test_expected_chords_parse_comma_separated_progression():
    parsed = parse_expected_chords("G, C, D, Em")

    assert parsed["valid"] is True
    assert [chord["symbol"] for chord in parsed["expected_chords"]] == [
        "G",
        "C",
        "D",
        "Em",
    ]


def test_expected_chords_parse_newline_separated_progression():
    parsed = parse_expected_chords("G\nC\nD\nEm")

    assert parsed["valid"] is True
    assert [chord["symbol"] for chord in parsed["expected_chords"]] == [
        "G",
        "C",
        "D",
        "Em",
    ]


def test_chord_symbol_to_tones_supports_basic_qualities():
    assert chord_symbol_to_tones("G") == {
        "symbol": "G",
        "root": "G",
        "quality": "major",
        "tones": ["G", "B", "D"],
    }
    assert chord_symbol_to_tones("Em") == {
        "symbol": "Em",
        "root": "E",
        "quality": "minor",
        "tones": ["E", "G", "B"],
    }
    assert chord_symbol_to_tones("G7") == {
        "symbol": "G7",
        "root": "G",
        "quality": "dominant_seventh",
        "tones": ["G", "B", "D", "F"],
    }
    assert chord_symbol_to_tones("Cmaj7") == {
        "symbol": "Cmaj7",
        "root": "C",
        "quality": "major_seventh",
        "tones": ["C", "E", "G", "B"],
    }
    assert chord_symbol_to_tones("Am7") == {
        "symbol": "Am7",
        "root": "A",
        "quality": "minor_seventh",
        "tones": ["A", "C", "E", "G"],
    }
    assert chord_symbol_to_tones("Gsus2") == {
        "symbol": "Gsus2",
        "root": "G",
        "quality": "sus2",
        "tones": ["G", "A", "D"],
    }
    assert chord_symbol_to_tones("Gsus4") == {
        "symbol": "Gsus4",
        "root": "G",
        "quality": "sus4",
        "tones": ["G", "C", "D"],
    }
    assert chord_symbol_to_tones("E5") == {
        "symbol": "E5",
        "root": "E",
        "quality": "power",
        "tones": ["E", "B"],
    }


def test_invalid_chord_returns_warning_and_invalid_result():
    parsed = parse_expected_chords("G Bb Cadd9")

    assert parsed["valid"] is False
    assert [chord["symbol"] for chord in parsed["expected_chords"]] == ["G"]
    assert any("Bb" in warning for warning in parsed["warnings"])
    assert any("Cadd9" in warning for warning in parsed["warnings"])


def test_chord_comparison_matches_detected_pitch_classes():
    reference = {
        "source": "chords",
        "valid": True,
        "expected_chords": [
            chord_symbol_to_tones("G"),
            chord_symbol_to_tones("Em"),
        ],
        "warnings": [],
    }
    comparison = compare_expected_chords(
        reference,
        [
            {"note": "G3"},
            {"note": "B3"},
            {"note": "D4"},
            {"note": "E4"},
        ],
    )

    assert comparison["enabled"] is True
    assert comparison["valid"] is True
    assert comparison["expected_count"] == 2
    assert comparison["detected_note_count"] == 4
    assert comparison["matched_chord_count"] == 2
    assert comparison["partial_chord_count"] == 0
    assert comparison["missed_chord_count"] == 0
    assert set(comparison["chords"][0]) == CHORD_COMPARISON_ITEM_FIELDS
    assert comparison["chords"][0]["symbol"] == "G"
    assert comparison["chords"][0]["status"] == "matched"


def test_expected_notes_parses_space_separated_notes():
    response = post_audio(
        {
            "audio_file": (
                "space-notes.wav",
                make_sine_wave_bytes(duration_seconds=1.0),
                "audio/wav",
            )
        },
        data={"expected_notes": "A4 B4 C5 D5"},
    )

    assert response.status_code == 200
    reference = response.json()["reference_exercise"]
    assert reference["expected_notes_raw"] == "A4 B4 C5 D5"
    assert reference["expected_notes"] == ["A4", "B4", "C5", "D5"]
    assert reference["expected_tab_raw"] is None
    assert reference["expected_chords_raw"] is None
    assert reference["expected_chords"] == []
    assert reference["source"] == "notes"
    assert reference["valid"] is True
    assert reference["warnings"] == []


def test_expected_notes_parses_comma_separated_notes():
    response = post_audio(
        {
            "audio_file": (
                "comma-notes.wav",
                make_sine_wave_bytes(duration_seconds=1.0),
                "audio/wav",
            )
        },
        data={"expected_notes": "A4, B4, C5, D5"},
    )

    assert response.status_code == 200
    assert response.json()["reference_exercise"]["expected_notes"] == [
        "A4",
        "B4",
        "C5",
        "D5",
    ]


def test_expected_notes_parses_newline_separated_notes():
    response = post_audio(
        {
            "audio_file": (
                "newline-notes.wav",
                make_sine_wave_bytes(duration_seconds=1.0),
                "audio/wav",
            )
        },
        data={"expected_notes": "A4\nB4\nC5\nD5"},
    )

    assert response.status_code == 200
    assert response.json()["reference_exercise"]["expected_notes"] == [
        "A4",
        "B4",
        "C5",
        "D5",
    ]


def test_invalid_expected_note_returns_reference_warning_without_failing_audio():
    response = post_audio(
        {
            "audio_file": (
                "invalid-note.wav",
                make_sine_wave_bytes(duration_seconds=1.0),
                "audio/wav",
            )
        },
        data={"expected_notes": "A4 Bb4 H2"},
    )

    assert response.status_code == 200
    analysis = response.json()
    assert analysis["valid"] is True
    assert analysis["reference_exercise"]["valid"] is False
    assert analysis["reference_exercise"]["expected_notes"] == ["A4"]
    assert any(
        "Bb4" in warning for warning in analysis["reference_exercise"]["warnings"]
    )
    assert any(
        "H2" in warning for warning in analysis["reference_exercise"]["warnings"]
    )
    assert analysis["reference_comparison"]["enabled"] is True
    assert analysis["reference_comparison"]["valid"] is False


def test_missing_expected_notes_disables_reference_comparison():
    response = post_audio(
        {
            "audio_file": (
                "missing-reference.wav",
                make_sine_wave_bytes(duration_seconds=1.0),
                "audio/wav",
            )
        }
    )

    assert response.status_code == 200
    analysis = response.json()
    assert analysis["reference_exercise"]["source"] == "none"
    comparison = analysis["reference_comparison"]
    assert comparison["enabled"] is False
    assert comparison["summary"] == "No reference exercise was provided."


def test_expected_notes_take_priority_when_expected_tab_is_also_provided():
    response = post_audio(
        {
            "audio_file": (
                "notes-priority.wav",
                make_sine_wave_bytes(duration_seconds=1.0),
                "audio/wav",
            )
        },
        data={
            "expected_notes": "A4",
            "expected_tab": "e|----|\nB|----|\nG|----|\nD|----|\nA|----|\nE|0---|",
            "expected_chords": "G C D",
        },
    )

    assert response.status_code == 200
    analysis = response.json()
    reference = analysis["reference_exercise"]
    assert reference["source"] == "notes"
    assert reference["expected_notes"] == ["A4"]
    assert reference["expected_tab_raw"] is not None
    assert reference["expected_chords_raw"] == "G C D"
    assert any("expected_tab was ignored" in warning for warning in reference["warnings"])
    assert any(
        "expected_chords was ignored" in warning for warning in reference["warnings"]
    )
    assert analysis["chord_comparison"]["enabled"] is False


def test_expected_tab_takes_priority_over_expected_chords_when_notes_are_missing():
    response = post_audio(
        {
            "audio_file": (
                "tab-reference.wav",
                make_sine_wave_bytes(duration_seconds=1.0),
                "audio/wav",
            )
        },
        data={
            "expected_tab": "e|----|\nB|----|\nG|----|\nD|----|\nA|----|\nE|0---|",
            "expected_chords": "G C D",
        },
    )

    assert response.status_code == 200
    analysis = response.json()
    assert analysis["reference_exercise"]["source"] == "tab"
    assert analysis["reference_exercise"]["expected_notes"] == ["E2"]
    assert analysis["reference_exercise"]["expected_chords_raw"] == "G C D"
    assert any(
        "expected_chords was ignored"
        in warning
        for warning in analysis["reference_exercise"]["warnings"]
    )
    assert analysis["reference_comparison"]["enabled"] is True
    assert analysis["chord_comparison"]["enabled"] is False


def test_expected_chords_is_used_when_notes_and_tab_are_missing():
    response = post_audio(
        {
            "audio_file": (
                "chord-reference.wav",
                make_sine_wave_bytes(duration_seconds=2.0, frequency=440.0),
                "audio/wav",
            )
        },
        data={"expected_chords": "A E5"},
    )

    assert response.status_code == 200
    analysis = response.json()
    reference = analysis["reference_exercise"]
    assert reference["source"] == "chords"
    assert reference["expected_notes"] == []
    assert reference["expected_chords_raw"] == "A E5"
    assert reference["expected_chords"] == [
        {
            "symbol": "A",
            "root": "A",
            "quality": "major",
            "tones": ["A", "C#", "E"],
        },
        {
            "symbol": "E5",
            "root": "E",
            "quality": "power",
            "tones": ["E", "B"],
        },
    ]
    assert set(reference["expected_chords"][0]) == EXPECTED_CHORD_FIELDS
    assert analysis["reference_comparison"]["enabled"] is False
    chord_comparison = analysis["chord_comparison"]
    assert chord_comparison["enabled"] is True
    assert chord_comparison["valid"] is True
    assert chord_comparison["expected_count"] == 2
    assert chord_comparison["partial_chord_count"] >= 1


def test_invalid_expected_tab_does_not_crash_analysis():
    response = post_audio(
        {
            "audio_file": (
                "invalid-tab.wav",
                make_sine_wave_bytes(duration_seconds=1.0),
                "audio/wav",
            )
        },
        data={"expected_tab": "this is not a six-line tab"},
    )

    assert response.status_code == 200
    analysis = response.json()
    assert analysis["valid"] is True
    assert analysis["reference_exercise"]["source"] == "tab"
    assert analysis["reference_exercise"]["valid"] is False
    assert analysis["reference_exercise"]["expected_notes"] == []
    assert analysis["reference_exercise"]["warnings"]
    assert analysis["reference_comparison"]["enabled"] is True
    assert analysis["reference_comparison"]["valid"] is False


def test_invalid_expected_chord_returns_warning_without_failing_audio():
    response = post_audio(
        {
            "audio_file": (
                "invalid-chord.wav",
                make_sine_wave_bytes(duration_seconds=1.0),
                "audio/wav",
            )
        },
        data={"expected_chords": "G Bb Cadd9"},
    )

    assert response.status_code == 200
    analysis = response.json()
    assert analysis["valid"] is True
    assert analysis["reference_exercise"]["source"] == "chords"
    assert analysis["reference_exercise"]["valid"] is False
    assert [chord["symbol"] for chord in analysis["reference_exercise"]["expected_chords"]] == [
        "G"
    ]
    assert any(
        "Bb" in warning for warning in analysis["reference_exercise"]["warnings"]
    )
    assert any(
        "Cadd9" in warning for warning in analysis["reference_exercise"]["warnings"]
    )
    assert analysis["chord_comparison"]["enabled"] is True
    assert analysis["chord_comparison"]["valid"] is False


def test_chord_comparison_summary_is_conversational_and_safe():
    response = post_audio(
        {
            "audio_file": (
                "safe-chord.wav",
                make_sine_wave_bytes(duration_seconds=2.0, frequency=440.0),
                "audio/wav",
            )
        },
        data={"expected_chords": "A E"},
    )

    assert response.status_code == 200
    analysis = response.json()
    summary = analysis["chord_comparison"]["summary"]
    feedback_text = serialize_feedback(analysis["coach_feedback"])
    combined_text = f"{summary} {feedback_text}".lower()

    assert summary
    assert "chord tones" in combined_text
    assert "played the chord correctly" not in combined_text
    assert "strumming accuracy" not in combined_text
    assert "rhythm accuracy" not in combined_text
    assert "full chord recognition" not in combined_text
    assert "song correctness" not in combined_text
    assert "played the song correctly" not in combined_text


def test_strumming_pattern_parses_space_separated_pattern():
    response = post_audio(
        {
            "audio_file": (
                "space-strum.wav",
                make_pulsed_sine_wave_bytes(duration_seconds=3.0),
                "audio/wav",
            )
        },
        data={"expected_strumming_pattern": "D D U U D U"},
    )

    assert response.status_code == 200
    pattern = response.json()["strumming_pattern"]
    assert set(pattern) == STRUMMING_PATTERN_FIELDS
    assert pattern["expected_pattern_raw"] == "D D U U D U"
    assert pattern["strokes"] == ["D", "D", "U", "U", "D", "U"]
    assert pattern["valid"] is True
    assert pattern["warnings"] == []


def test_strumming_pattern_parses_comma_separated_pattern():
    response = post_audio(
        {
            "audio_file": (
                "comma-strum.wav",
                make_pulsed_sine_wave_bytes(duration_seconds=3.0),
                "audio/wav",
            )
        },
        data={"expected_strumming_pattern": "D, D, U, U, D, U"},
    )

    assert response.status_code == 200
    assert response.json()["strumming_pattern"]["strokes"] == [
        "D",
        "D",
        "U",
        "U",
        "D",
        "U",
    ]


def test_strumming_pattern_parses_hyphen_separated_pattern():
    response = post_audio(
        {
            "audio_file": (
                "hyphen-strum.wav",
                make_pulsed_sine_wave_bytes(duration_seconds=3.0),
                "audio/wav",
            )
        },
        data={"expected_strumming_pattern": "D-D-U-U-D-U"},
    )

    assert response.status_code == 200
    assert response.json()["strumming_pattern"]["strokes"] == [
        "D",
        "D",
        "U",
        "U",
        "D",
        "U",
    ]


def test_strumming_pattern_parses_newline_separated_pattern():
    response = post_audio(
        {
            "audio_file": (
                "newline-strum.wav",
                make_pulsed_sine_wave_bytes(duration_seconds=3.0),
                "audio/wav",
            )
        },
        data={"expected_strumming_pattern": "D\nD\nU\nU\nD\nU"},
    )

    assert response.status_code == 200
    assert response.json()["strumming_pattern"]["strokes"] == [
        "D",
        "D",
        "U",
        "U",
        "D",
        "U",
    ]


def test_strumming_pattern_normalizes_lowercase_and_supports_muted_strokes():
    response = post_audio(
        {
            "audio_file": (
                "lowercase-strum.wav",
                make_pulsed_sine_wave_bytes(duration_seconds=3.0),
                "audio/wav",
            )
        },
        data={"expected_strumming_pattern": "d x u"},
    )

    assert response.status_code == 200
    assert response.json()["strumming_pattern"]["strokes"] == ["D", "X", "U"]


def test_invalid_strumming_symbols_return_warning_without_failing_audio():
    response = post_audio(
        {
            "audio_file": (
                "invalid-strum.wav",
                make_pulsed_sine_wave_bytes(duration_seconds=3.0),
                "audio/wav",
            )
        },
        data={"expected_strumming_pattern": "D Q U"},
    )

    assert response.status_code == 200
    analysis = response.json()
    assert analysis["valid"] is True
    assert analysis["strumming_pattern"]["valid"] is False
    assert analysis["strumming_pattern"]["strokes"] == ["D", "U"]
    assert any("Q" in warning for warning in analysis["strumming_pattern"]["warnings"])
    assert analysis["strumming_comparison"]["enabled"] is True
    assert analysis["strumming_comparison"]["valid"] is False


def test_expected_strumming_pattern_alone_enables_strumming_comparison():
    response = post_audio(
        {
            "audio_file": (
                "strumming-only.wav",
                make_pulsed_sine_wave_bytes(duration_seconds=3.0),
                "audio/wav",
            )
        },
        data={"expected_strumming_pattern": "D D U U D U"},
    )

    assert response.status_code == 200
    analysis = response.json()
    comparison = analysis["strumming_comparison"]
    assert set(comparison) == STRUMMING_COMPARISON_FIELDS
    assert comparison["enabled"] is True
    assert comparison["valid"] is True
    assert comparison["expected_stroke_count"] == 6
    assert comparison["detected_attack_count"] == analysis["onset_count"]
    assert comparison["count_difference"] == analysis["onset_count"] - 6
    assert comparison["attack_match_level"] in {
        "good",
        "close",
        "low",
        "too_many",
        "unavailable",
    }
    assert comparison["spacing_level"] in {
        "steady",
        "somewhat_uneven",
        "uneven",
        "unavailable",
    }
    assert isinstance(comparison["summary"], str)
    assert comparison["summary"]


def test_expected_chords_and_strumming_pattern_can_both_return_comparisons():
    response = post_audio(
        {
            "audio_file": (
                "chord-strumming.wav",
                make_pulsed_sine_wave_bytes(duration_seconds=3.0, frequency=440.0),
                "audio/wav",
            )
        },
        data={
            "expected_chords": "A E",
            "expected_strumming_pattern": "D D U U D U",
        },
    )

    assert response.status_code == 200
    analysis = response.json()
    assert analysis["reference_exercise"]["source"] == "chords"
    assert analysis["chord_comparison"]["enabled"] is True
    assert analysis["strumming_comparison"]["enabled"] is True


def test_expected_notes_and_strumming_pattern_can_both_return_comparisons():
    response = post_audio(
        {
            "audio_file": (
                "note-strumming.wav",
                make_pulsed_sine_wave_bytes(duration_seconds=3.0, frequency=440.0),
                "audio/wav",
            )
        },
        data={
            "expected_notes": "A4",
            "expected_strumming_pattern": "D D U U D U",
        },
    )

    assert response.status_code == 200
    analysis = response.json()
    assert analysis["reference_exercise"]["source"] == "notes"
    assert analysis["reference_comparison"]["enabled"] is True
    assert analysis["strumming_comparison"]["enabled"] is True


def test_strumming_comparison_summary_and_feedback_are_conversational_and_safe():
    response = post_audio(
        {
            "audio_file": (
                "safe-strumming.wav",
                make_pulsed_sine_wave_bytes(duration_seconds=3.0),
                "audio/wav",
            )
        },
        data={"expected_strumming_pattern": "D D U U D U"},
    )

    assert response.status_code == 200
    analysis = response.json()
    summary = analysis["strumming_comparison"]["summary"]
    feedback_text = serialize_feedback(analysis["coach_feedback"])
    combined_text = f"{summary} {feedback_text}".lower()

    assert summary
    assert "attack" in combined_text
    assert "your downstrokes were correct" not in combined_text
    assert "your upstrokes were correct" not in combined_text
    assert "strumming pattern was played correctly" not in combined_text
    assert "rhythm was accurate" not in combined_text
    assert "detects exact strumming direction" not in combined_text


def test_invalid_upload_does_not_return_successful_strumming_comparison():
    response = post_audio(
        {
            "audio_file": (
                "broken-strumming.wav",
                b"not-really-a-wav",
                "audio/wav",
            )
        },
        data={"expected_strumming_pattern": "D D U U D U"},
    )

    assert response.status_code == 200
    analysis = response.json()
    assert analysis["valid"] is False
    assert analysis["strumming_pattern"] is None
    assert analysis["strumming_comparison"] is None


def test_matching_a4_reference_against_generated_a4_audio_counts_match():
    response = post_audio(
        {
            "audio_file": (
                "a4-reference.wav",
                make_sine_wave_bytes(duration_seconds=2.0, frequency=440.0),
                "audio/wav",
            )
        },
        data={"expected_notes": "A4"},
    )

    assert response.status_code == 200
    comparison = response.json()["reference_comparison"]
    assert comparison["enabled"] is True
    assert comparison["valid"] is True
    assert comparison["matched_count"] >= 1
    assert comparison["missed_count"] == 0
    assert 0 <= comparison["match_ratio"] <= 1
    assert comparison["matches"]
    assert set(comparison["matches"][0]) == REFERENCE_MATCH_FIELDS
    assert comparison["matches"][0]["expected_note"] == "A4"
    assert comparison["matches"][0]["detected_note"] == "A4"


def test_expected_a4_b4_with_only_a4_detected_counts_miss():
    response = post_audio(
        {
            "audio_file": (
                "a4-b4-reference.wav",
                make_sine_wave_bytes(duration_seconds=2.0, frequency=440.0),
                "audio/wav",
            )
        },
        data={"expected_notes": "A4 B4"},
    )

    assert response.status_code == 200
    comparison = response.json()["reference_comparison"]
    assert comparison["matched_count"] >= 1
    assert comparison["missed_count"] >= 1
    assert comparison["misses"]
    assert set(comparison["misses"][0]) == REFERENCE_MISS_FIELDS
    assert any(miss["expected_note"] == "B4" for miss in comparison["misses"])


def test_extra_detected_notes_are_counted_when_reference_is_shorter():
    response = post_audio(
        {
            "audio_file": (
                "extra-reference.wav",
                make_pulsed_sine_wave_bytes(duration_seconds=6.0, frequency=440.0),
                "audio/wav",
            )
        },
        data={"expected_notes": "A4"},
    )

    assert response.status_code == 200
    comparison = response.json()["reference_comparison"]
    assert comparison["detected_count"] > comparison["expected_count"]
    assert comparison["extra_count"] >= 1
    assert comparison["extras"]
    assert set(comparison["extras"][0]) == REFERENCE_EXTRA_FIELDS


def test_reference_comparison_summary_is_conversational_and_safe():
    response = post_audio(
        {
            "audio_file": (
                "safe-reference.wav",
                make_sine_wave_bytes(duration_seconds=2.0, frequency=440.0),
                "audio/wav",
            )
        },
        data={"expected_notes": "A4 B4"},
    )

    assert response.status_code == 200
    analysis = response.json()
    summary = analysis["reference_comparison"]["summary"]
    feedback_text = serialize_feedback(analysis["coach_feedback"])
    combined_text = f"{summary} {feedback_text}".lower()

    assert summary
    assert "expected exercise" in combined_text
    assert "song correctly" not in combined_text
    assert "nirvana" not in combined_text
    assert "accurate transcription" not in combined_text
    assert "rhythm was correct" not in combined_text
    assert "tab is accurate" not in combined_text


def test_invalid_upload_does_not_return_successful_reference_comparison():
    response = post_audio(
        {
            "audio_file": (
                "broken-reference.wav",
                b"not-really-a-wav",
                "audio/wav",
            )
        },
        data={"expected_notes": "A4 B4"},
    )

    assert response.status_code == 200
    analysis = response.json()
    assert analysis["valid"] is False
    assert analysis["reference_exercise"] is None
    assert analysis["reference_comparison"] is None
    assert analysis["chord_comparison"] is None
    assert analysis["strumming_pattern"] is None
    assert analysis["strumming_comparison"] is None


def test_invalid_upload_does_not_return_successful_chord_comparison():
    response = post_audio(
        {
            "audio_file": (
                "broken-chord.wav",
                b"not-really-a-wav",
                "audio/wav",
            )
        },
        data={"expected_chords": "G C D"},
    )

    assert response.status_code == 200
    analysis = response.json()
    assert analysis["valid"] is False
    assert analysis["reference_exercise"] is None
    assert analysis["reference_comparison"] is None
    assert analysis["chord_comparison"] is None
    assert analysis["strumming_pattern"] is None
    assert analysis["strumming_comparison"] is None


def serialize_feedback(feedback):
    return json.dumps(feedback).lower()

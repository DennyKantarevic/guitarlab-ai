import asyncio
import io
import json
import math
import wave

import httpx

from app.main import app
from app.services.practice_feedback import build_coach_feedback


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


def serialize_feedback(feedback):
    return json.dumps(feedback).lower()

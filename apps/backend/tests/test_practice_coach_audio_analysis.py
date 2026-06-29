import asyncio
import io
import json
import math
import wave

import httpx

from app.main import app


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


def post_audio(files):
    async def send_request():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            return await client.post("/practice/analyze-audio", files=files)

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


def test_missing_file_returns_clear_error():
    response = post_audio({})

    assert response.status_code == 200
    analysis = response.json()
    assert analysis["valid"] is False
    assert analysis["errors"] == ["Missing audio file."]
    assert analysis["practice_metrics"] is None


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

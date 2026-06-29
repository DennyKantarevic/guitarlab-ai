from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any
import warnings

import librosa
import numpy as np
from fastapi import UploadFile

from app.services.practice_feedback import build_coach_feedback
from app.services.practice_recording_quality import analyze_recording_quality
from app.services.practice_scoring import score_practice_analysis
from app.services.practice_segment_analysis import analyze_audio_segments


SUPPORTED_AUDIO_EXTENSIONS = {".wav"}


async def analyze_uploaded_audio(audio_file: UploadFile | None) -> dict[str, Any]:
    if audio_file is None:
        return build_invalid_response("", ["Missing audio file."])

    filename = audio_file.filename or ""
    if Path(filename).suffix.lower() not in SUPPORTED_AUDIO_EXTENSIONS:
        return build_invalid_response(
            filename,
            ["Unsupported audio format. Only .wav files are supported."],
        )

    contents = await audio_file.read()
    if not contents:
        return build_invalid_response(filename, ["Empty audio file."])

    temp_path: str | None = None
    try:
        with NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            temp_file.write(contents)
            temp_path = temp_file.name

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            audio, sample_rate = librosa.load(temp_path, sr=None, mono=True)
        if audio.size == 0:
            return build_invalid_response(filename, ["Empty audio file."])

        onset_frames = librosa.onset.onset_detect(y=audio, sr=sample_rate)
        tempo_bpm = estimate_tempo(audio, sample_rate, len(onset_frames))

        analysis = {
            "filename": filename,
            "duration_seconds": float(librosa.get_duration(y=audio, sr=sample_rate)),
            "sample_rate": int(sample_rate),
            "tempo_bpm": tempo_bpm,
            "onset_count": int(len(onset_frames)),
            "rms_energy_mean": feature_mean(librosa.feature.rms(y=audio)[0]),
            "spectral_centroid_mean": feature_mean(
                librosa.feature.spectral_centroid(y=audio, sr=sample_rate)[0]
            ),
            "zero_crossing_rate_mean": feature_mean(
                librosa.feature.zero_crossing_rate(audio)[0]
            ),
            "analysis_warnings": [],
            "valid": True,
            "errors": [],
        }
        analysis["practice_metrics"] = score_practice_analysis(analysis)
        analysis["recording_quality"] = analyze_recording_quality(
            audio,
            duration_seconds=analysis["duration_seconds"],
            rms_energy_mean=analysis["rms_energy_mean"],
        )
        analysis["segment_analysis"] = analyze_audio_segments(audio, sample_rate)
        analysis["coach_feedback"] = build_coach_feedback(
            analysis=analysis,
            practice_metrics=analysis["practice_metrics"],
            recording_quality=analysis["recording_quality"],
            segment_analysis=analysis["segment_analysis"],
        )
        return analysis
    except Exception:
        return build_invalid_response(filename, ["Could not decode audio file."])
    finally:
        if temp_path is not None:
            Path(temp_path).unlink(missing_ok=True)


def estimate_tempo(
    audio: np.ndarray,
    sample_rate: int,
    onset_count: int,
) -> float | None:
    if onset_count == 0:
        return None

    tempo_values = librosa.feature.tempo(y=audio, sr=sample_rate)
    if tempo_values.size == 0:
        return None

    tempo = float(tempo_values[0])
    if not np.isfinite(tempo) or tempo <= 0:
        return None
    return tempo


def feature_mean(values: np.ndarray) -> float:
    return float(np.nan_to_num(values, nan=0.0, posinf=0.0, neginf=0.0).mean())


def build_invalid_response(filename: str, errors: list[str]) -> dict[str, Any]:
    return {
        "filename": filename,
        "duration_seconds": 0.0,
        "sample_rate": 0,
        "tempo_bpm": None,
        "onset_count": 0,
        "rms_energy_mean": 0.0,
        "spectral_centroid_mean": 0.0,
        "zero_crossing_rate_mean": 0.0,
        "analysis_warnings": [],
        "valid": False,
        "errors": errors,
        "practice_metrics": None,
        "recording_quality": None,
        "segment_analysis": None,
        "coach_feedback": None,
    }

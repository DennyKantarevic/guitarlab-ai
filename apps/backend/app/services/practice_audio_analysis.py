from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any
import warnings

import librosa
import numpy as np
from fastapi import UploadFile

from app.services.practice_chord_parser import compare_expected_chords
from app.services.practice_feedback import build_coach_feedback
from app.services.practice_note_events import extract_note_events
from app.services.practice_pitch_analysis import analyze_pitch
from app.services.practice_recording_quality import analyze_recording_quality
from app.services.practice_reference_comparison import (
    build_reference_exercise,
    compare_reference_notes,
)
from app.services.practice_scoring import score_practice_analysis
from app.services.practice_segment_analysis import analyze_audio_segments
from app.services.practice_strumming_comparison import (
    compare_strumming_pattern,
    parse_expected_strumming_pattern,
)


SUPPORTED_AUDIO_EXTENSIONS = {".wav"}
SUPPORTED_PRACTICE_FOCUS_VALUES = {
    "general",
    "note_clarity",
    "timing",
    "speed_control",
    "lead_phrase",
    "tone_recording",
}
DEFAULT_PRACTICE_FOCUS = "general"
MAX_PRACTICE_DESCRIPTION_LENGTH = 300


async def analyze_uploaded_audio(
    audio_file: UploadFile | None,
    *,
    practice_focus: str | None = None,
    practice_description: str | None = None,
    expected_notes: str | None = None,
    expected_tab: str | None = None,
    expected_chords: str | None = None,
    expected_strumming_pattern: str | None = None,
) -> dict[str, Any]:
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

    practice_context = normalize_practice_context(
        practice_focus=practice_focus,
        practice_description=practice_description,
    )

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
        onset_times_seconds = [
            float(value)
            for value in librosa.frames_to_time(onset_frames, sr=sample_rate)
        ]
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
            "practice_context": practice_context,
        }
        analysis["practice_metrics"] = score_practice_analysis(analysis)
        analysis["recording_quality"] = analyze_recording_quality(
            audio,
            duration_seconds=analysis["duration_seconds"],
            rms_energy_mean=analysis["rms_energy_mean"],
        )
        analysis["segment_analysis"] = analyze_audio_segments(audio, sample_rate)
        analysis["pitch_analysis"] = analyze_pitch(
            audio,
            sample_rate,
            analysis["duration_seconds"],
        )
        analysis["note_events"] = extract_note_events(
            analysis["pitch_analysis"],
            analysis["duration_seconds"],
        )
        analysis["reference_exercise"] = build_reference_exercise(
            expected_notes_raw=expected_notes,
            expected_tab_raw=expected_tab,
            expected_chords_raw=expected_chords,
        )
        analysis["reference_comparison"] = compare_reference_notes(
            analysis["reference_exercise"],
            analysis["note_events"],
        )
        analysis["chord_comparison"] = compare_expected_chords(
            analysis["reference_exercise"],
            analysis["note_events"],
        )
        analysis["strumming_pattern"] = parse_expected_strumming_pattern(
            expected_strumming_pattern
        )
        analysis["strumming_comparison"] = compare_strumming_pattern(
            analysis["strumming_pattern"],
            onset_times_seconds,
            analysis["onset_count"],
        )
        analysis["coach_feedback"] = build_coach_feedback(
            analysis=analysis,
            practice_metrics=analysis["practice_metrics"],
            recording_quality=analysis["recording_quality"],
            segment_analysis=analysis["segment_analysis"],
            practice_context=analysis["practice_context"],
            pitch_analysis=analysis["pitch_analysis"],
            note_events=analysis["note_events"],
            reference_exercise=analysis["reference_exercise"],
            reference_comparison=analysis["reference_comparison"],
            chord_comparison=analysis["chord_comparison"],
            strumming_comparison=analysis["strumming_comparison"],
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


def normalize_practice_context(
    *,
    practice_focus: str | None,
    practice_description: str | None,
) -> dict[str, str | None]:
    normalized_focus = (practice_focus or "").strip().lower()
    if normalized_focus not in SUPPORTED_PRACTICE_FOCUS_VALUES:
        normalized_focus = DEFAULT_PRACTICE_FOCUS

    normalized_description = (practice_description or "").strip()
    if not normalized_description:
        normalized_description = None
    else:
        normalized_description = normalized_description[
            :MAX_PRACTICE_DESCRIPTION_LENGTH
        ]

    return {
        "practice_focus": normalized_focus,
        "practice_description": normalized_description,
    }


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
        "practice_context": None,
        "pitch_analysis": None,
        "note_events": None,
        "reference_exercise": None,
        "reference_comparison": None,
        "chord_comparison": None,
        "strumming_pattern": None,
        "strumming_comparison": None,
    }

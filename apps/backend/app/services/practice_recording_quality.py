from typing import Any, Literal

import librosa
import numpy as np


QualityLevel = Literal["poor", "usable", "good"]


def analyze_recording_quality(
    audio: np.ndarray,
    *,
    duration_seconds: float,
    rms_energy_mean: float,
) -> dict[str, Any]:
    absolute_audio = np.abs(audio)
    peak_amplitude = float(absolute_audio.max()) if absolute_audio.size else 0.0
    clipped_sample_ratio = (
        float(np.mean(absolute_audio >= 0.98)) if absolute_audio.size else 0.0
    )
    silence_ratio = estimate_silence_ratio(audio)

    warnings: list[str] = []
    if rms_energy_mean < 0.03:
        warnings.append("The recording is very quiet.")
    if clipped_sample_ratio >= 0.001:
        warnings.append("The recording may be clipping.")
    if duration_seconds < 2.0:
        warnings.append("The clip is too short for reliable feedback.")
    if silence_ratio > 0.40:
        warnings.append("Much of the recording appears to be silence.")

    if duration_seconds < 1.0 or silence_ratio > 0.60 or clipped_sample_ratio >= 0.01:
        quality_level: QualityLevel = "poor"
    elif warnings:
        quality_level = "usable"
    else:
        quality_level = "good"

    return {
        "peak_amplitude": peak_amplitude,
        "clipped_sample_ratio": clipped_sample_ratio,
        "silence_ratio": silence_ratio,
        "quality_level": quality_level,
        "warnings": warnings,
    }


def estimate_silence_ratio(audio: np.ndarray) -> float:
    if audio.size == 0:
        return 1.0

    frame_rms = librosa.feature.rms(y=audio)[0]
    if frame_rms.size == 0:
        return 1.0

    return float(np.mean(frame_rms < 0.01))

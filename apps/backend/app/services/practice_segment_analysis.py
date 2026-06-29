from typing import Any

import librosa
import numpy as np

from app.services.practice_scoring import (
    classify_attack_activity,
    classify_brightness_level,
    classify_energy_level,
)


DEFAULT_SEGMENT_SECONDS = 5.0


def analyze_audio_segments(
    audio: np.ndarray,
    sample_rate: int,
    *,
    segment_seconds: float = DEFAULT_SEGMENT_SECONDS,
) -> list[dict[str, Any]]:
    total_duration = float(librosa.get_duration(y=audio, sr=sample_rate))
    if total_duration <= 0:
        return []

    segment_sample_count = max(1, int(segment_seconds * sample_rate))
    segments: list[dict[str, Any]] = []

    for segment_index, start_sample in enumerate(
        range(0, len(audio), segment_sample_count)
    ):
        end_sample = min(len(audio), start_sample + segment_sample_count)
        segment_audio = audio[start_sample:end_sample]
        start_seconds = start_sample / sample_rate
        end_seconds = end_sample / sample_rate
        duration_seconds = max(0.0, end_seconds - start_seconds)
        onset_count = count_segment_onsets(segment_audio, sample_rate)
        onset_density_per_second = (
            onset_count / duration_seconds if duration_seconds > 0 else 0.0
        )
        rms_energy_mean = feature_mean(librosa.feature.rms(y=segment_audio)[0])
        spectral_centroid_mean = feature_mean(
            librosa.feature.spectral_centroid(y=segment_audio, sr=sample_rate)[0]
        )

        segments.append(
            {
                "segment_index": segment_index,
                "start_seconds": round(start_seconds, 6),
                "end_seconds": round(end_seconds, 6),
                "duration_seconds": duration_seconds,
                "onset_count": onset_count,
                "onset_density_per_second": onset_density_per_second,
                "rms_energy_mean": rms_energy_mean,
                "spectral_centroid_mean": spectral_centroid_mean,
                "energy_level": classify_energy_level(rms_energy_mean),
                "brightness_level": classify_brightness_level(
                    spectral_centroid_mean
                ),
                "attack_activity": classify_attack_activity(
                    onset_density_per_second
                ),
            }
        )

    return segments


def count_segment_onsets(segment_audio: np.ndarray, sample_rate: int) -> int:
    if segment_audio.size == 0:
        return 0
    return int(len(librosa.onset.onset_detect(y=segment_audio, sr=sample_rate)))


def feature_mean(values: np.ndarray) -> float:
    return float(np.nan_to_num(values, nan=0.0, posinf=0.0, neginf=0.0).mean())

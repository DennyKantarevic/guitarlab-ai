from typing import Any

import librosa
import numpy as np


NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
PYIN_HOP_LENGTH = 512
MIN_GUITAR_FREQUENCY_HZ = 65.0
MAX_GUITAR_FREQUENCY_HZ = 1320.0
MIN_CONFIDENT_PITCH = 0.55
MAX_DETECTED_NOTES = 12


def analyze_pitch(
    audio: np.ndarray,
    sample_rate: int,
    duration_seconds: float,
) -> dict[str, Any]:
    if audio.size == 0 or duration_seconds <= 0:
        return build_empty_pitch_analysis()

    try:
        frequencies, voiced_flags, voiced_probabilities = librosa.pyin(
            audio,
            fmin=MIN_GUITAR_FREQUENCY_HZ,
            fmax=MAX_GUITAR_FREQUENCY_HZ,
            sr=sample_rate,
            hop_length=PYIN_HOP_LENGTH,
        )
    except Exception:
        return build_empty_pitch_analysis(
            ["Pitch detection confidence is low.", "No stable monophonic pitch was detected."]
        )

    total_frames = int(frequencies.size)
    voiced_mask = voiced_flags & np.isfinite(frequencies)
    voiced_frequencies = frequencies[voiced_mask]

    if total_frames == 0 or voiced_frequencies.size == 0:
        return build_empty_pitch_analysis()

    midi_values = np.array(
        [frequency_to_midi(float(frequency)) for frequency in voiced_frequencies]
    )
    note_values, note_counts = np.unique(midi_values, return_counts=True)
    dominant_note_index = int(np.argmax(note_counts))
    dominant_midi = int(note_values[dominant_note_index])
    dominant_count = int(note_counts[dominant_note_index])

    voiced_ratio = float(voiced_frequencies.size / total_frames)
    consistency = float(dominant_count / voiced_frequencies.size)
    average_voiced_probability = float(
        np.nan_to_num(voiced_probabilities[voiced_mask], nan=0.0).mean()
    )
    confidence = clamp_confidence(
        voiced_ratio * consistency * average_voiced_probability
    )

    dominant_frequencies = voiced_frequencies[midi_values == dominant_midi]
    estimated_frequency_hz = float(np.median(dominant_frequencies))
    estimated_note = midi_to_note_name(dominant_midi)
    pitch_warnings = build_pitch_warnings(confidence)

    return {
        "enabled": True,
        "method": "librosa.pyin",
        "estimated_note": estimated_note if confidence >= MIN_CONFIDENT_PITCH else None,
        "estimated_frequency_hz": (
            estimated_frequency_hz if confidence >= MIN_CONFIDENT_PITCH else None
        ),
        "confidence": confidence,
        "detected_notes": build_detected_notes(
            frequencies=frequencies,
            voiced_mask=voiced_mask,
            voiced_probabilities=voiced_probabilities,
            sample_rate=sample_rate,
            duration_seconds=duration_seconds,
        ),
        "pitch_warnings": pitch_warnings,
    }


def frequency_to_midi(frequency_hz: float) -> int:
    return int(round(69 + 12 * np.log2(frequency_hz / 440.0)))


def midi_to_note_name(midi_number: int) -> str:
    note_name = NOTE_NAMES[midi_number % 12]
    octave = (midi_number // 12) - 1
    return f"{note_name}{octave}"


def midi_to_frequency(midi_number: int) -> float:
    return float(440.0 * (2 ** ((midi_number - 69) / 12)))


def build_detected_notes(
    *,
    frequencies: np.ndarray,
    voiced_mask: np.ndarray,
    voiced_probabilities: np.ndarray,
    sample_rate: int,
    duration_seconds: float,
) -> list[dict[str, Any]]:
    detected_notes: list[dict[str, Any]] = []
    current_midi: int | None = None
    current_start_index: int | None = None
    current_frequencies: list[float] = []
    current_probabilities: list[float] = []

    for frame_index, frequency in enumerate(frequencies):
        if not voiced_mask[frame_index]:
            append_current_note(
                detected_notes=detected_notes,
                current_midi=current_midi,
                current_start_index=current_start_index,
                end_frame_index=frame_index,
                frequencies=current_frequencies,
                probabilities=current_probabilities,
                sample_rate=sample_rate,
                duration_seconds=duration_seconds,
            )
            current_midi = None
            current_start_index = None
            current_frequencies = []
            current_probabilities = []
            continue

        midi_number = frequency_to_midi(float(frequency))
        if current_midi is not None and midi_number != current_midi:
            append_current_note(
                detected_notes=detected_notes,
                current_midi=current_midi,
                current_start_index=current_start_index,
                end_frame_index=frame_index,
                frequencies=current_frequencies,
                probabilities=current_probabilities,
                sample_rate=sample_rate,
                duration_seconds=duration_seconds,
            )
            current_start_index = frame_index
            current_frequencies = []
            current_probabilities = []

        if current_start_index is None:
            current_start_index = frame_index
        current_midi = midi_number
        current_frequencies.append(float(frequency))
        current_probabilities.append(float(voiced_probabilities[frame_index]))

    append_current_note(
        detected_notes=detected_notes,
        current_midi=current_midi,
        current_start_index=current_start_index,
        end_frame_index=len(frequencies),
        frequencies=current_frequencies,
        probabilities=current_probabilities,
        sample_rate=sample_rate,
        duration_seconds=duration_seconds,
    )

    return detected_notes[:MAX_DETECTED_NOTES]


def append_current_note(
    *,
    detected_notes: list[dict[str, Any]],
    current_midi: int | None,
    current_start_index: int | None,
    end_frame_index: int,
    frequencies: list[float],
    probabilities: list[float],
    sample_rate: int,
    duration_seconds: float,
) -> None:
    if current_midi is None or current_start_index is None or not frequencies:
        return

    start_seconds = frame_to_seconds(current_start_index, sample_rate)
    end_seconds = min(
        duration_seconds,
        frame_to_seconds(max(current_start_index + 1, end_frame_index), sample_rate),
    )

    if end_seconds <= start_seconds:
        return

    detected_notes.append(
        {
            "note": midi_to_note_name(current_midi),
            "frequency_hz": float(np.median(np.array(frequencies))),
            "start_seconds": round(start_seconds, 6),
            "end_seconds": round(end_seconds, 6),
            "confidence": clamp_confidence(float(np.mean(probabilities))),
        }
    )


def frame_to_seconds(frame_index: int, sample_rate: int) -> float:
    return (frame_index * PYIN_HOP_LENGTH) / sample_rate


def build_empty_pitch_analysis(
    pitch_warnings: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "enabled": True,
        "method": "librosa.pyin",
        "estimated_note": None,
        "estimated_frequency_hz": None,
        "confidence": 0.0,
        "detected_notes": [],
        "pitch_warnings": pitch_warnings
        or [
            "Pitch detection confidence is low.",
            "No stable monophonic pitch was detected.",
            "This feature works best with single-note recordings, not chords.",
        ],
    }


def build_pitch_warnings(confidence: float) -> list[str]:
    warnings: list[str] = []
    if confidence < MIN_CONFIDENT_PITCH:
        warnings.append("Pitch detection confidence is low.")
        warnings.append("No stable monophonic pitch was detected.")
    warnings.append("This feature works best with single-note recordings, not chords.")
    warnings.append("Noisy or distorted audio can reduce pitch accuracy.")
    return warnings


def clamp_confidence(confidence: float) -> float:
    if not np.isfinite(confidence):
        return 0.0
    return float(max(0.0, min(1.0, confidence)))

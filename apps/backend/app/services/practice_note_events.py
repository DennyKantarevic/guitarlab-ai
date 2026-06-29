from typing import Any, Mapping

import numpy as np


MAX_NOTE_EVENTS = 100
MIN_NOTE_EVENT_CONFIDENCE = 0.55
MIN_NOTE_EVENT_DURATION_SECONDS = 0.08
MERGE_GAP_SECONDS = 0.05


def extract_note_events(
    pitch_analysis: Mapping[str, Any] | None,
    duration_seconds: float,
) -> list[dict[str, Any]]:
    if pitch_analysis is None or duration_seconds <= 0:
        return []

    if float(pitch_analysis.get("confidence", 0.0)) < 0.25:
        return []

    detected_notes = pitch_analysis.get("detected_notes")
    if not isinstance(detected_notes, list):
        return []

    events: list[dict[str, Any]] = []
    for detected_note in detected_notes:
        event = build_note_event(detected_note, duration_seconds)
        if event is None:
            continue

        if should_merge(events, event):
            events[-1] = merge_events(events[-1], event)
        else:
            events.append(event)

        if len(events) >= MAX_NOTE_EVENTS:
            break

    return events


def build_note_event(
    detected_note: object,
    duration_seconds: float,
) -> dict[str, Any] | None:
    if not isinstance(detected_note, Mapping):
        return None

    note = detected_note.get("note")
    if not isinstance(note, str) or not note:
        return None

    confidence = safe_float(detected_note.get("confidence"))
    if confidence < MIN_NOTE_EVENT_CONFIDENCE:
        return None

    start_seconds = clamp_seconds(
        safe_float(detected_note.get("start_seconds")),
        duration_seconds,
    )
    end_seconds = clamp_seconds(
        safe_float(detected_note.get("end_seconds")),
        duration_seconds,
    )
    if end_seconds <= start_seconds:
        return None

    event_duration = end_seconds - start_seconds
    if event_duration < MIN_NOTE_EVENT_DURATION_SECONDS:
        return None

    frequency_hz = safe_float(detected_note.get("frequency_hz"))
    if frequency_hz <= 0:
        return None

    return {
        "note": note,
        "frequency_hz": round(frequency_hz, 6),
        "start_seconds": round(start_seconds, 6),
        "end_seconds": round(end_seconds, 6),
        "duration_seconds": round(event_duration, 6),
        "confidence": round(max(0.0, min(1.0, confidence)), 6),
    }


def should_merge(
    events: list[dict[str, Any]],
    next_event: Mapping[str, Any],
) -> bool:
    if not events:
        return False

    previous_event = events[-1]
    gap_seconds = float(next_event["start_seconds"]) - float(
        previous_event["end_seconds"]
    )
    return (
        previous_event["note"] == next_event["note"]
        and 0 <= gap_seconds <= MERGE_GAP_SECONDS
    )


def merge_events(
    previous_event: Mapping[str, Any],
    next_event: Mapping[str, Any],
) -> dict[str, Any]:
    previous_duration = float(previous_event["duration_seconds"])
    next_duration = float(next_event["duration_seconds"])
    total_duration = previous_duration + next_duration
    start_seconds = float(previous_event["start_seconds"])
    end_seconds = float(next_event["end_seconds"])

    if total_duration <= 0:
        frequency_hz = float(next_event["frequency_hz"])
        confidence = float(next_event["confidence"])
    else:
        frequency_hz = weighted_average(
            float(previous_event["frequency_hz"]),
            previous_duration,
            float(next_event["frequency_hz"]),
            next_duration,
        )
        confidence = weighted_average(
            float(previous_event["confidence"]),
            previous_duration,
            float(next_event["confidence"]),
            next_duration,
        )

    return {
        "note": str(previous_event["note"]),
        "frequency_hz": round(frequency_hz, 6),
        "start_seconds": round(start_seconds, 6),
        "end_seconds": round(end_seconds, 6),
        "duration_seconds": round(end_seconds - start_seconds, 6),
        "confidence": round(max(0.0, min(1.0, confidence)), 6),
    }


def weighted_average(
    first_value: float,
    first_weight: float,
    second_value: float,
    second_weight: float,
) -> float:
    return ((first_value * first_weight) + (second_value * second_weight)) / (
        first_weight + second_weight
    )


def clamp_seconds(value: float, duration_seconds: float) -> float:
    return max(0.0, min(duration_seconds, value))


def safe_float(value: object) -> float:
    try:
        numeric_value = float(value)
    except (TypeError, ValueError):
        return 0.0

    if not np.isfinite(numeric_value):
        return 0.0
    return numeric_value

import re
from typing import Any, Mapping

from app.services.practice_tab_parser import parse_expected_tab


MAX_EXPECTED_NOTES = 50
MAX_DETECTED_NOTES = 100
NOTE_PATTERN = re.compile(r"^(?:C#|D#|F#|G#|A#|C|D|E|F|G|A|B)\d+$")


def parse_expected_notes(raw: str | None) -> dict[str, Any]:
    normalized_raw = (raw or "").strip()
    if not normalized_raw:
        return {
            "expected_notes_raw": None,
            "expected_notes": [],
            "valid": True,
            "warnings": [],
        }

    tokens = [
        token
        for token in re.split(r"[\s,]+", normalized_raw)
        if token.strip()
    ]
    expected_notes: list[str] = []
    warnings: list[str] = []

    for token in tokens:
        note = token.strip()
        if NOTE_PATTERN.fullmatch(note):
            expected_notes.append(note)
        else:
            warnings.append(
                f"Unsupported expected note '{note}'. Use notes like A4 or C#5; flats, chords, tabs, durations, and rhythm values are not supported."
            )

    if len(expected_notes) > MAX_EXPECTED_NOTES:
        expected_notes = expected_notes[:MAX_EXPECTED_NOTES]
        warnings.append(
            f"Only the first {MAX_EXPECTED_NOTES} supported expected notes were compared."
        )

    return {
        "expected_notes_raw": normalized_raw,
        "expected_notes": expected_notes,
        "valid": len(warnings) == 0,
        "warnings": warnings,
    }


def build_reference_exercise(
    *,
    expected_notes_raw: str | None,
    expected_tab_raw: str | None,
) -> dict[str, Any]:
    parsed_notes = parse_expected_notes(expected_notes_raw)
    parsed_tab = parse_expected_tab(expected_tab_raw)

    if parsed_notes["expected_notes_raw"] is not None:
        warnings = list(parsed_notes["warnings"])
        if parsed_tab["expected_tab_raw"] is not None:
            warnings.append("expected_tab was ignored because expected_notes was provided.")

        return {
            "expected_notes_raw": parsed_notes["expected_notes_raw"],
            "expected_notes": parsed_notes["expected_notes"],
            "expected_tab_raw": parsed_tab["expected_tab_raw"],
            "source": "notes",
            "valid": parsed_notes["valid"],
            "warnings": warnings,
        }

    if parsed_tab["expected_tab_raw"] is not None:
        return {
            "expected_notes_raw": None,
            "expected_notes": parsed_tab["expected_notes"],
            "expected_tab_raw": parsed_tab["expected_tab_raw"],
            "source": "tab",
            "valid": parsed_tab["valid"],
            "warnings": parsed_tab["warnings"],
        }

    return {
        "expected_notes_raw": None,
        "expected_notes": [],
        "expected_tab_raw": None,
        "source": "none",
        "valid": True,
        "warnings": [],
    }


def compare_reference_notes(
    reference_exercise: Mapping[str, Any],
    note_events: list[Mapping[str, Any]] | None,
) -> dict[str, Any]:
    source = str(reference_exercise.get("source", "none"))
    expected_notes = list(reference_exercise.get("expected_notes") or [])
    reference_warnings = list(reference_exercise.get("warnings") or [])
    reference_valid = bool(reference_exercise.get("valid", False))

    if source == "none":
        return build_empty_comparison(
            enabled=False,
            valid=True,
            summary="No reference exercise was provided.",
            warnings=[],
        )

    detected_events = list(note_events or [])[:MAX_DETECTED_NOTES]

    if not expected_notes:
        return build_empty_comparison(
            enabled=True,
            valid=False,
            summary=(
                "The reference exercise could not be compared because no supported expected notes were provided."
            ),
            warnings=reference_warnings,
            detected_count=len(detected_events),
        )

    matches: list[dict[str, Any]] = []
    misses: list[dict[str, Any]] = []
    extras: list[dict[str, Any]] = []
    detected_index = 0

    for expected_index, expected_note in enumerate(expected_notes):
        match_index: int | None = None
        while detected_index < len(detected_events):
            detected_event = detected_events[detected_index]
            if detected_event.get("note") == expected_note:
                match_index = detected_index
                break

            extras.append(build_extra(detected_event, detected_index))
            detected_index += 1

        if match_index is None:
            misses.append(
                {
                    "expected_note": expected_note,
                    "expected_index": expected_index,
                }
            )
            continue

        detected_event = detected_events[match_index]
        matches.append(
            {
                "expected_note": expected_note,
                "detected_note": str(detected_event["note"]),
                "expected_index": expected_index,
                "detected_index": match_index,
                "confidence": round_confidence(detected_event.get("confidence")),
            }
        )
        detected_index = match_index + 1

    while detected_index < len(detected_events):
        extras.append(build_extra(detected_events[detected_index], detected_index))
        detected_index += 1

    expected_count = len(expected_notes)
    matched_count = len(matches)
    missed_count = len(misses)
    extra_count = len(extras)
    match_ratio = round(matched_count / expected_count, 6)
    warnings = list(reference_warnings)
    if len(note_events or []) > MAX_DETECTED_NOTES:
        warnings.append(
            f"Only the first {MAX_DETECTED_NOTES} detected note events were compared."
        )

    return {
        "enabled": True,
        "valid": reference_valid,
        "matched_count": matched_count,
        "missed_count": missed_count,
        "extra_count": extra_count,
        "expected_count": expected_count,
        "detected_count": len(detected_events),
        "match_ratio": match_ratio,
        "summary": build_summary(
            valid=reference_valid,
            matched_count=matched_count,
            expected_count=expected_count,
            missed_count=missed_count,
            extra_count=extra_count,
            detected_count=len(detected_events),
        ),
        "matches": matches,
        "misses": misses,
        "extras": extras,
        "warnings": warnings,
    }


def build_empty_comparison(
    *,
    enabled: bool,
    valid: bool,
    summary: str,
    warnings: list[str],
    detected_count: int = 0,
) -> dict[str, Any]:
    return {
        "enabled": enabled,
        "valid": valid,
        "matched_count": 0,
        "missed_count": 0,
        "extra_count": 0,
        "expected_count": 0,
        "detected_count": detected_count,
        "match_ratio": None,
        "summary": summary,
        "matches": [],
        "misses": [],
        "extras": [],
        "warnings": warnings,
    }


def build_summary(
    *,
    valid: bool,
    matched_count: int,
    expected_count: int,
    missed_count: int,
    extra_count: int,
    detected_count: int,
) -> str:
    if detected_count == 0:
        return (
            "No reliable note events were detected, so the expected exercise could not be matched yet."
        )

    prefix = (
        "The expected exercise includes unsupported input, so this comparison is incomplete. "
        if not valid
        else ""
    )
    summary = (
        f"{prefix}Compared with your expected exercise, the coach found "
        f"{matched_count} of {expected_count} notes in order."
    )
    if missed_count:
        summary += (
            " Some expected notes were not detected clearly; try recording slower with cleaner separation."
        )
    if extra_count:
        summary += f" The coach also detected {extra_count} extra note event"
        summary += "s." if extra_count != 1 else "."
    return summary


def build_extra(
    detected_event: Mapping[str, Any],
    detected_index: int,
) -> dict[str, Any]:
    return {
        "detected_note": str(detected_event.get("note", "")),
        "detected_index": detected_index,
        "confidence": round_confidence(detected_event.get("confidence")),
    }


def round_confidence(value: object) -> float:
    try:
        confidence = float(value)
    except (TypeError, ValueError):
        confidence = 0.0
    return round(max(0.0, min(1.0, confidence)), 6)

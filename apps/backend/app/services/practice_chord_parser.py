import re
from typing import Any, Mapping


MAX_EXPECTED_CHORDS = 50
NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
ROOT_PATTERN = r"(C#|D#|F#|G#|A#|C|D|E|F|G|A|B)"
CHORD_PATTERN = re.compile(rf"^{ROOT_PATTERN}(maj7|m7|sus2|sus4|m|7|5)?$")
NOTE_EVENT_PATTERN = re.compile(r"^(C#|D#|F#|G#|A#|C|D|E|F|G|A|B)-?\d+$")

CHORD_QUALITIES = {
    "": ("major", [0, 4, 7]),
    "m": ("minor", [0, 3, 7]),
    "7": ("dominant_seventh", [0, 4, 7, 10]),
    "maj7": ("major_seventh", [0, 4, 7, 11]),
    "m7": ("minor_seventh", [0, 3, 7, 10]),
    "sus2": ("sus2", [0, 2, 7]),
    "sus4": ("sus4", [0, 5, 7]),
    "5": ("power", [0, 7]),
}


def parse_expected_chords(raw: str | None) -> dict[str, Any]:
    normalized_raw = (raw or "").strip()
    if not normalized_raw:
        return {
            "expected_chords_raw": None,
            "expected_chords": [],
            "valid": True,
            "warnings": [],
        }

    expected_chords: list[dict[str, Any]] = []
    warnings: list[str] = []
    tokens = [
        token
        for token in re.split(r"[\s,]+", normalized_raw)
        if token.strip()
    ]

    for token in tokens:
        symbol = token.strip()
        chord = chord_symbol_to_tones(symbol)
        if chord is None:
            warnings.append(
                f"Unsupported chord '{symbol}'. Use simple sharp-name chords like G, Em, A7, Cmaj7, Am7, Dsus4, or E5; flats, slash chords, extended chords, voicings, tabs, and rhythm notation are not supported."
            )
            continue
        expected_chords.append(chord)

    if len(expected_chords) > MAX_EXPECTED_CHORDS:
        expected_chords = expected_chords[:MAX_EXPECTED_CHORDS]
        warnings.append(
            f"Only the first {MAX_EXPECTED_CHORDS} supported expected chords were compared."
        )

    return {
        "expected_chords_raw": normalized_raw,
        "expected_chords": expected_chords,
        "valid": len(warnings) == 0,
        "warnings": warnings,
    }


def chord_symbol_to_tones(symbol: str) -> dict[str, Any] | None:
    match = CHORD_PATTERN.fullmatch(symbol.strip())
    if match is None:
        return None

    root = match.group(1)
    suffix = match.group(2) or ""
    quality, intervals = CHORD_QUALITIES[suffix]
    root_index = NOTE_NAMES.index(root)
    tones = [NOTE_NAMES[(root_index + interval) % 12] for interval in intervals]
    return {
        "symbol": symbol.strip(),
        "root": root,
        "quality": quality,
        "tones": tones,
    }


def compare_expected_chords(
    reference_exercise: Mapping[str, Any],
    note_events: list[Mapping[str, Any]] | None,
) -> dict[str, Any]:
    source = str(reference_exercise.get("source", "none"))
    if source != "chords":
        return build_empty_chord_comparison(
            enabled=False,
            valid=True,
            summary="No chord exercise was provided.",
            warnings=[],
        )

    expected_chords = list(reference_exercise.get("expected_chords") or [])
    reference_warnings = list(reference_exercise.get("warnings") or [])
    reference_valid = bool(reference_exercise.get("valid", False))
    detected_tones = extract_detected_pitch_classes(note_events or [])

    if not expected_chords:
        return build_empty_chord_comparison(
            enabled=True,
            valid=False,
            summary=(
                "The chord exercise could not be compared because no supported chord names were provided."
            ),
            warnings=reference_warnings,
            detected_note_count=len(detected_tones),
        )

    chord_results: list[dict[str, Any]] = []
    matched_count = 0
    partial_count = 0
    missed_count = 0

    for chord in expected_chords:
        expected_tones = list(chord["tones"])
        matched_tones = [tone for tone in expected_tones if tone in detected_tones]
        missing_tones = [tone for tone in expected_tones if tone not in detected_tones]
        status = classify_chord_match(chord, matched_tones)

        if status == "matched":
            matched_count += 1
        elif status == "partial":
            partial_count += 1
        else:
            missed_count += 1

        chord_results.append(
            {
                "symbol": chord["symbol"],
                "expected_tones": expected_tones,
                "detected_tones": matched_tones,
                "matched_tones": matched_tones,
                "missing_tones": missing_tones,
                "status": status,
            }
        )

    return {
        "enabled": True,
        "valid": reference_valid,
        "expected_count": len(expected_chords),
        "detected_note_count": len(detected_tones),
        "matched_chord_count": matched_count,
        "partial_chord_count": partial_count,
        "missed_chord_count": missed_count,
        "summary": build_chord_summary(
            valid=reference_valid,
            expected_count=len(expected_chords),
            matched_chord_count=matched_count,
            partial_chord_count=partial_count,
            missed_chord_count=missed_count,
            detected_note_count=len(detected_tones),
        ),
        "chords": chord_results,
        "warnings": reference_warnings,
    }


def classify_chord_match(
    chord: Mapping[str, Any],
    matched_tones: list[str],
) -> str:
    if chord.get("quality") == "power":
        return "matched" if len(matched_tones) == len(chord.get("tones", [])) else (
            "partial" if matched_tones else "missed"
        )
    if len(matched_tones) >= 2:
        return "matched"
    if matched_tones:
        return "partial"
    return "missed"


def extract_detected_pitch_classes(
    note_events: list[Mapping[str, Any]],
) -> list[str]:
    detected_tones: list[str] = []
    for event in note_events:
        note = str(event.get("note", ""))
        match = NOTE_EVENT_PATTERN.fullmatch(note)
        if match is None:
            continue
        tone = match.group(1)
        if tone not in detected_tones:
            detected_tones.append(tone)
    return detected_tones


def build_chord_summary(
    *,
    valid: bool,
    expected_count: int,
    matched_chord_count: int,
    partial_chord_count: int,
    missed_chord_count: int,
    detected_note_count: int,
) -> str:
    if detected_note_count == 0:
        return (
            "No reliable note events were detected, so chord-tone coverage could not be checked yet."
        )

    prefix = (
        "The chord exercise includes unsupported chord symbols, so this comparison is incomplete. "
        if not valid
        else ""
    )
    summary = (
        f"{prefix}The coach found chord tones for "
        f"{matched_chord_count} of {expected_count} expected chords."
    )
    if partial_chord_count:
        summary += (
            f" {partial_chord_count} chord had some expected tones detected."
            if partial_chord_count == 1
            else f" {partial_chord_count} chords had some expected tones detected."
        )
    if missed_chord_count:
        summary += (
            " Several expected chord tones were not detected clearly."
            if missed_chord_count > 1
            else " Some expected chord tones were not detected clearly."
        )
    summary += (
        " This checks approximate chord-tone coverage only, not strumming or rhythm."
    )
    return summary


def build_empty_chord_comparison(
    *,
    enabled: bool,
    valid: bool,
    summary: str,
    warnings: list[str],
    detected_note_count: int = 0,
) -> dict[str, Any]:
    return {
        "enabled": enabled,
        "valid": valid,
        "expected_count": 0,
        "detected_note_count": detected_note_count,
        "matched_chord_count": 0,
        "partial_chord_count": 0,
        "missed_chord_count": 0,
        "summary": summary,
        "chords": [],
        "warnings": warnings,
    }

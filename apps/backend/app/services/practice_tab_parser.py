import re
from typing import Any


MAX_TAB_NOTES = 50
NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
STANDARD_TUNING_MIDI = {
    "E": 40,
    "A": 45,
    "D": 50,
    "G": 55,
    "B": 59,
    "e": 64,
}
EXPECTED_TAB_LINE_ORDER = ["e", "B", "G", "D", "A", "E"]
TAB_LINE_PATTERN = re.compile(r"^\s*([eEbBgGdDaA])\s*\|(.*)$")


def parse_expected_tab(raw: str | None) -> dict[str, Any]:
    normalized_raw = (raw or "").strip()
    if not normalized_raw:
        return {
            "expected_tab_raw": None,
            "expected_notes": [],
            "valid": True,
            "warnings": [],
        }

    warnings: list[str] = []
    parsed_lines = parse_tab_lines(normalized_raw, warnings)

    if len(parsed_lines) != 6:
        warnings.append(
            "Expected tab must contain six labeled guitar strings in standard tuning."
        )
        return {
            "expected_tab_raw": normalized_raw,
            "expected_notes": [],
            "valid": False,
            "warnings": dedupe(warnings),
        }

    events: list[dict[str, Any]] = []
    for line_index, (provided_label, content) in enumerate(parsed_lines):
        expected_label = EXPECTED_TAB_LINE_ORDER[line_index]
        if provided_label.lower() != expected_label.lower():
            warnings.append(
                "Expected tab lines should be ordered high e, B, G, D, A, low E."
            )

        events.extend(
            parse_string_events(
                string_label=expected_label,
                content=content,
                warnings=warnings,
            )
        )

    chord_columns = {
        event["column"]
        for event in events
        if sum(1 for candidate in events if candidate["column"] == event["column"]) > 1
    }
    if chord_columns:
        warnings.append(
            "Chords are not supported yet; multiple fret numbers were found at the same tab position."
        )
        events = [
            event for event in events if event["column"] not in chord_columns
        ]

    events.sort(key=lambda event: event["column"])
    expected_notes = [event["note"] for event in events]

    if len(expected_notes) > MAX_TAB_NOTES:
        expected_notes = expected_notes[:MAX_TAB_NOTES]
        warnings.append(f"Only the first {MAX_TAB_NOTES} tab notes were compared.")

    if not expected_notes:
        warnings.append("No usable single-note tab notes were found.")

    return {
        "expected_tab_raw": normalized_raw,
        "expected_notes": expected_notes,
        "valid": len(warnings) == 0,
        "warnings": dedupe(warnings),
    }


def parse_tab_lines(
    raw: str,
    warnings: list[str],
) -> list[tuple[str, str]]:
    parsed_lines: list[tuple[str, str]] = []
    for line in raw.splitlines():
        if not line.strip():
            continue

        match = TAB_LINE_PATTERN.match(line)
        if match is None:
            warnings.append(
                "Unsupported tab line ignored. Use six labeled lines such as e|, B|, G|, D|, A|, and E|."
            )
            continue

        label = match.group(1)
        content = match.group(2).rstrip()
        if content.endswith("|"):
            content = content[:-1]
        parsed_lines.append((label, content))

    return parsed_lines


def parse_string_events(
    *,
    string_label: str,
    content: str,
    warnings: list[str],
) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    index = 0
    while index < len(content):
        char = content[index]
        if char.isdigit():
            start_index = index
            end_index = index + 1
            while end_index < len(content) and content[end_index].isdigit():
                end_index += 1

            fret_text = content[start_index:end_index]
            fret = int(fret_text)
            if 0 <= fret <= 24:
                events.append(
                    {
                        "column": start_index,
                        "string_label": string_label,
                        "fret": fret,
                        "note": note_for_fret(string_label, fret),
                    }
                )
            else:
                warnings.append(
                    f"Unsupported fret '{fret_text}'. Use fret numbers from 0 through 24."
                )
            index = end_index
            continue

        if char in {"-", "|", " ", "\t"}:
            index += 1
            continue

        warnings.append(
            f"Unsupported tab symbol '{char}' was ignored. Bends, slides, hammer-ons, pull-offs, mutes, and rhythm notation are not supported yet."
        )
        index += 1

    return events


def note_for_fret(string_label: str, fret: int) -> str:
    midi_number = STANDARD_TUNING_MIDI[string_label] + fret
    octave = (midi_number // 12) - 1
    note = NOTE_NAMES[midi_number % 12]
    return f"{note}{octave}"


def dedupe(values: list[str]) -> list[str]:
    return list(dict.fromkeys(values))
